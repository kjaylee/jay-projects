/**
 * PersonalityManager - 개성 시스템 관리자
 * 
 * 영걸전/코에이 삼국지 스타일의 장수 개성 시스템
 * 
 * 개성 카테고리:
 * - combat: 전투 관련 개성
 * - strategy: 계략 관련 개성
 * - leadership: 통솔 관련 개성
 * - personality: 성격 관련 개성
 * - unique: 고유 개성
 */

import { BattleUnit } from '../entities/BattleUnit';
import personalitiesData from '../data/personalities.json';

export type PersonalityCategory = 'combat' | 'strategy' | 'leadership' | 'personality' | 'unique';

export interface PersonalityEffect {
  type: string;
  value?: number;
  [key: string]: unknown;
}

export interface Personality {
  id: string;
  name: string;
  nameEn: string;
  category: PersonalityCategory;
  description: string;
  effect: PersonalityEffect;
}

export interface StatModifiers {
  attack: number;
  defense: number;
  intelligence: number;
  speed: number;
  hp: number;
  critChance: number;
  accuracy: number;
  [key: string]: number; // 인덱스 시그니처 추가
}

export interface PersonalityTriggerContext {
  unit: BattleUnit;
  allies: BattleUnit[];
  enemies: BattleUnit[];
  isFirstAttack?: boolean;
  isFirstTurn?: boolean;
  currentHpPercent?: number;
  adjacentAllies?: BattleUnit[];
  adjacentEnemies?: BattleUnit[];
  terrain?: string;
  weather?: string;
  isNight?: boolean;
}

export class PersonalityManager {
  private personalities: Map<string, Personality> = new Map();
  private generalPersonalities: Map<string, string[]> = new Map();
  private activeEffects: Map<string, Map<string, number>> = new Map(); // unitId -> effectType -> value

  constructor() {
    this.loadPersonalities();
  }

  /**
   * 개성 데이터 로드
   */
  private loadPersonalities(): void {
    for (const p of personalitiesData.personalities as Personality[]) {
      this.personalities.set(p.id, p);
    }

    for (const [generalId, personalityIds] of Object.entries(
      personalitiesData.generalPersonalities as Record<string, string[]>
    )) {
      this.generalPersonalities.set(generalId, personalityIds);
    }
  }

  /**
   * 개성 조회
   */
  getPersonality(personalityId: string): Personality | null {
    return this.personalities.get(personalityId) ?? null;
  }

  /**
   * 장수의 개성 목록 조회
   */
  getGeneralPersonalities(generalId: string): Personality[] {
    const personalityIds = this.generalPersonalities.get(generalId) ?? [];
    return personalityIds
      .map(id => this.personalities.get(id))
      .filter((p): p is Personality => p !== undefined);
  }

  /**
   * 장수에게 개성 할당
   */
  assignPersonality(generalId: string, personalityId: string): boolean {
    if (!this.personalities.has(personalityId)) {
      return false;
    }

    const current = this.generalPersonalities.get(generalId) ?? [];
    if (!current.includes(personalityId)) {
      current.push(personalityId);
      this.generalPersonalities.set(generalId, current);
    }
    return true;
  }

  /**
   * 장수의 개성 제거
   */
  removePersonality(generalId: string, personalityId: string): boolean {
    const current = this.generalPersonalities.get(generalId);
    if (!current) return false;

    const index = current.indexOf(personalityId);
    if (index === -1) return false;

    current.splice(index, 1);
    return true;
  }

  /**
   * 스탯 보정치 계산
   */
  calculateStatModifiers(generalId: string, context: PersonalityTriggerContext): StatModifiers {
    const modifiers: StatModifiers = {
      attack: 1.0,
      defense: 1.0,
      intelligence: 1.0,
      speed: 1.0,
      hp: 1.0,
      critChance: 0,
      accuracy: 1.0,
    };

    const personalities = this.getGeneralPersonalities(generalId);

    for (const personality of personalities) {
      this.applyPersonalityEffect(modifiers, personality, context);
    }

    return modifiers;
  }

  /**
   * 개성 효과 적용
   */
  private applyPersonalityEffect(
    modifiers: StatModifiers,
    personality: Personality,
    context: PersonalityTriggerContext
  ): void {
    const effect = personality.effect;

    switch (effect.type) {
      case 'firstAttackBonus':
        if (context.isFirstAttack) {
          modifiers.attack += effect.value as number;
        }
        break;

      case 'defenseBonus':
        modifiers.defense += effect.value as number;
        break;

      case 'rangedBonus':
        // 원거리 공격 보너스는 별도 처리 필요
        break;

      case 'speedBonus':
        modifiers.speed += effect.value as number;
        break;

      case 'lowHpAttackBonus':
        if (
          context.currentHpPercent !== undefined &&
          context.currentHpPercent <= (effect.threshold as number)
        ) {
          modifiers.attack += effect.value as number;
        }
        break;

      case 'adjacentEnemyDebuff':
        // 인접 적 디버프는 적 유닛에 적용
        break;

      case 'adjacentAllyBuff':
        // 인접 아군 버프는 아군 유닛에 적용
        if (context.adjacentAllies && context.adjacentAllies.length > 0) {
          const stat = effect.stat as keyof StatModifiers;
          if (stat in modifiers) {
            (modifiers as Record<string, number>)[stat] += effect.value as number;
          }
        }
        break;

      case 'multiEnemyDefense':
        if (context.adjacentEnemies && context.adjacentEnemies.length > 1) {
          modifiers.defense += effect.value as number;
        }
        break;

      case 'firstStrikeBonus':
        if (context.isFirstTurn) {
          modifiers.attack += effect.value as number;
        }
        break;

      case 'lordProximityBonus':
        // 주군 인접 여부 확인 필요
        break;

      case 'duelBonus':
        // 일기토 보너스는 DuelManager에서 처리
        modifiers.attack += (effect.damageValue as number) ?? 0;
        break;

      case 'attackDefenseTrade':
        modifiers.attack += effect.attackBonus as number;
        modifiers.defense -= effect.defensePenalty as number;
        break;

      case 'armyMoraleBonus':
        modifiers.defense += (effect.resistValue as number) ?? 0;
        break;

      case 'strategyBonus':
        modifiers.intelligence += (effect.damageValue as number) ?? 0;
        break;

      case 'perfectStrategy':
        modifiers.intelligence += (effect.damageValue as number) ?? 0;
        modifiers.accuracy = 1.0; // 100% 성공률
        break;

      case 'unmatched':
        modifiers.attack += (effect.powerBonus as number) ?? 0;
        break;

      case 'critBonus':
        modifiers.critChance += effect.value as number;
        break;

      case 'armorPiercing':
        // 방어력 무시는 데미지 계산에서 처리
        break;

      case 'berserk':
        modifiers.attack += effect.attackBonus as number;
        modifiers.defense -= effect.defensePenalty as number;
        break;

      case 'mobility':
        // 이동력 보너스는 별도 처리
        break;

      case 'nightBonus':
        if (context.isNight) {
          modifiers.attack += effect.value as number;
          modifiers.defense += effect.value as number;
          modifiers.speed += effect.value as number;
        }
        break;

      case 'waterBonus':
        if (context.terrain === 'water') {
          modifiers.attack += effect.value as number;
          modifiers.defense += effect.value as number;
        }
        break;

      // 다른 효과들은 필요에 따라 추가
    }
  }

  /**
   * 턴 시작 시 효과 처리 (예: 회복)
   */
  processTurnStart(unit: BattleUnit): { healAmount?: number; effects: string[] } {
    const effects: string[] = [];
    let healAmount = 0;

    const personalities = this.getGeneralPersonalities(unit.generalId);

    for (const personality of personalities) {
      if (personality.effect.type === 'turnHeal') {
        const amount = Math.floor(unit.stats.maxHp * (personality.effect.value as number));
        healAmount += amount;
        effects.push(`${personality.name}: HP +${amount} 회복`);
      }
    }

    return { healAmount: healAmount > 0 ? healAmount : undefined, effects };
  }

  /**
   * 적 처치 시 효과 처리
   */
  processKill(unit: BattleUnit): { healAmount?: number; effects: string[] } {
    const effects: string[] = [];
    let healAmount = 0;

    const personalities = this.getGeneralPersonalities(unit.generalId);

    for (const personality of personalities) {
      if (personality.effect.type === 'killHeal') {
        const amount = Math.floor(unit.stats.maxHp * (personality.effect.value as number));
        healAmount += amount;
        effects.push(`${personality.name}: HP +${amount} 회복`);
      }
    }

    return { healAmount: healAmount > 0 ? healAmount : undefined, effects };
  }

  /**
   * 반격 확률 계산
   */
  getCounterAttackChance(generalId: string): number {
    const personalities = this.getGeneralPersonalities(generalId);
    let chance = 0;

    for (const personality of personalities) {
      if (personality.effect.type === 'counterAttack') {
        chance += personality.effect.chance as number;
      }
    }

    return Math.min(chance, 1.0); // 최대 100%
  }

  /**
   * 일기토 보너스 계산
   */
  getDuelBonus(generalId: string): number {
    const personalities = this.getGeneralPersonalities(generalId);
    let bonus = 0;

    for (const personality of personalities) {
      if (personality.effect.type === 'duelBonus') {
        bonus += personality.effect.duelValue as number;
      }
      if (personality.effect.type === 'unmatched') {
        bonus += 0.3; // 무쌍은 추가 30% 보너스
      }
    }

    return bonus;
  }

  /**
   * 이동력 보너스 계산
   */
  getMovementBonus(generalId: string, isFirstTurn: boolean): number {
    const personalities = this.getGeneralPersonalities(generalId);
    let bonus = 0;

    for (const personality of personalities) {
      if (personality.effect.type === 'mobility') {
        bonus += personality.effect.movementBonus as number;
      }
      if (personality.effect.type === 'vanguard' && isFirstTurn) {
        bonus += personality.effect.movementBonus as number;
      }
    }

    return bonus;
  }

  /**
   * 계략 원소 보너스 계산
   */
  getElementBonus(generalId: string, element: string): number {
    const personalities = this.getGeneralPersonalities(generalId);
    let bonus = 0;

    for (const personality of personalities) {
      if (
        personality.effect.type === 'elementBonus' &&
        personality.effect.element === element
      ) {
        bonus += personality.effect.value as number;
      }
    }

    return bonus;
  }

  /**
   * 상태이상 면역 확인
   */
  isImmuneToStatus(generalId: string, status: string): boolean {
    const personalities = this.getGeneralPersonalities(generalId);

    for (const personality of personalities) {
      if (
        personality.effect.type === 'statusImmune' &&
        Array.isArray(personality.effect.statuses) &&
        personality.effect.statuses.includes(status)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * 치명상 면역 (결사) 확인
   */
  hasDeathSave(generalId: string): boolean {
    const personalities = this.getGeneralPersonalities(generalId);

    for (const personality of personalities) {
      if (personality.effect.type === 'deathSave') {
        return true;
      }
    }

    return false;
  }

  /**
   * 모든 개성 목록
   */
  getAllPersonalities(): Personality[] {
    return Array.from(this.personalities.values());
  }

  /**
   * 카테고리별 개성 목록
   */
  getPersonalitiesByCategory(category: PersonalityCategory): Personality[] {
    return Array.from(this.personalities.values()).filter(p => p.category === category);
  }

  /**
   * 개성 검색
   */
  searchPersonalities(query: string): Personality[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.personalities.values()).filter(
      p =>
        p.name.includes(query) ||
        p.nameEn.toLowerCase().includes(lowerQuery) ||
        p.description.includes(query)
    );
  }

  /**
   * 장수별 개성 맵 반환
   */
  getGeneralPersonalitiesMap(): Map<string, string[]> {
    return new Map(this.generalPersonalities);
  }

  /**
   * 개성 효과 요약 텍스트
   */
  getPersonalitySummary(personalityId: string): string {
    const personality = this.getPersonality(personalityId);
    if (!personality) return '';

    return `${personality.name} (${personality.nameEn}): ${personality.description}`;
  }

  /**
   * 장수의 개성 요약
   */
  getGeneralPersonalitySummary(generalId: string): string[] {
    const personalities = this.getGeneralPersonalities(generalId);
    return personalities.map(p => this.getPersonalitySummary(p.id));
  }
}

// 싱글톤 인스턴스
let instance: PersonalityManager | null = null;

export function getPersonalityManager(): PersonalityManager {
  if (!instance) {
    instance = new PersonalityManager();
  }
  return instance;
}
