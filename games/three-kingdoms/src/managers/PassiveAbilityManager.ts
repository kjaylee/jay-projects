import { BattleUnit } from '../entities/BattleUnit';

/**
 * 패시브 능력 타입
 */
export type PassiveAbilityType = 
  | 'underdog'       // 역전의 명수
  | 'victory_heal'   // 환호성
  | 'bleed'          // 출혈
  | 'overwhelm'      // 압도
  | 'negotiation'    // 협상
  | 'lifesteal';     // 흡혈

/**
 * 패시브 능력 설정
 */
export interface PassiveAbilityConfig {
  id: string;
  type: PassiveAbilityType;
  name: string;
  nameEn: string;
  description: string;
  /** 최소 효과 값 */
  minValue: number;
  /** 최대 효과 값 */
  maxValue: number;
  /** 발동 확률 (0~1) */
  triggerChance?: number;
  /** 지속 턴 수 */
  duration?: number;
}

/**
 * 출혈 스택 정보
 */
export interface BleedStack {
  unitId: string;
  targetId: string;
  stacks: number;
  damageBonus: number;
  remainingTurns: number;
}

/**
 * 압도 효과 정보
 */
export interface OverwhelmEffect {
  unitId: string;
  type: 'evasion' | 'damage_reduction';
  value: number;
  used: boolean;
}

/**
 * 패시브 능력 발동 결과
 */
export interface PassiveAbilityResult {
  triggered: boolean;
  abilityType: PassiveAbilityType;
  abilityName: string;
  effect?: {
    type: string;
    value: number;
    target?: string;
  };
  message?: string;
}

/**
 * 패시브 능력 정의
 */
export const PASSIVE_ABILITIES: Record<PassiveAbilityType, PassiveAbilityConfig> = {
  underdog: {
    id: 'passive_underdog',
    type: 'underdog',
    name: '역전의 명수',
    nameEn: 'Underdog',
    description: 'HP가 적보다 낮을 때 25% 확률로 40~80% 추가 데미지',
    minValue: 0.4,
    maxValue: 0.8,
    triggerChance: 0.25,
  },
  victory_heal: {
    id: 'passive_victory_heal',
    type: 'victory_heal',
    name: '환호성',
    nameEn: 'Victory Heal',
    description: '전투 승리 시 잃은 병력의 20~40% 회복',
    minValue: 0.2,
    maxValue: 0.4,
  },
  bleed: {
    id: 'passive_bleed',
    type: 'bleed',
    name: '출혈',
    nameEn: 'Bleed',
    description: '공격 시 23~30% 확률로 3턴간 평타 데미지 11~16% 증가 (스택 가능)',
    minValue: 0.11,
    maxValue: 0.16,
    triggerChance: 0.265, // (0.23 + 0.30) / 2
    duration: 3,
  },
  overwhelm: {
    id: 'passive_overwhelm',
    type: 'overwhelm',
    name: '압도',
    nameEn: 'Overwhelm',
    description: '전투 첫 턴에 첫 공격 30~45% 회피 또는 피해 15~40% 감소',
    minValue: 0.15,
    maxValue: 0.45,
  },
  negotiation: {
    id: 'passive_negotiation',
    type: 'negotiation',
    name: '협상',
    nameEn: 'Negotiation',
    description: '전투 시작 시 적 최대 HP 9~18% 감소 (정치+매력 비교)',
    minValue: 0.09,
    maxValue: 0.18,
  },
  lifesteal: {
    id: 'passive_lifesteal',
    type: 'lifesteal',
    name: '흡혈',
    nameEn: 'Lifesteal',
    description: '데미지 적용 시 가한 데미지의 13~23% HP 회복',
    minValue: 0.13,
    maxValue: 0.23,
  },
};

/**
 * 패시브 능력 매니저
 * 전투 중 패시브 능력의 발동 조건 체크 및 효과 적용을 담당
 */
export class PassiveAbilityManager {
  /** 유닛별 보유 패시브 능력 */
  private unitAbilities: Map<string, PassiveAbilityType[]> = new Map();
  
  /** 출혈 스택 추적 */
  private bleedStacks: Map<string, BleedStack[]> = new Map();
  
  /** 압도 효과 추적 (전투 첫 턴용) */
  private overwhelmEffects: Map<string, OverwhelmEffect> = new Map();
  
  /** 협상 적용 여부 */
  private negotiationApplied: Set<string> = new Set();
  
  /** 현재 턴 */
  private currentTurn: number = 0;

  /** 랜덤 함수 (테스트용 오버라이드 가능) */
  private randomFn: () => number = Math.random;

  constructor() {
    this.reset();
  }

  /**
   * 랜덤 함수 설정 (테스트용)
   */
  setRandomFn(fn: () => number): void {
    this.randomFn = fn;
  }

  /**
   * 상태 초기화
   */
  reset(): void {
    this.unitAbilities.clear();
    this.bleedStacks.clear();
    this.overwhelmEffects.clear();
    this.negotiationApplied.clear();
    this.currentTurn = 0;
  }

  /**
   * 유닛에 패시브 능력 등록
   */
  registerAbility(unitId: string, abilityType: PassiveAbilityType): void {
    if (!this.unitAbilities.has(unitId)) {
      this.unitAbilities.set(unitId, []);
    }
    const abilities = this.unitAbilities.get(unitId)!;
    if (!abilities.includes(abilityType)) {
      abilities.push(abilityType);
    }
  }

  /**
   * 유닛의 패시브 능력 조회
   */
  getAbilities(unitId: string): PassiveAbilityType[] {
    return this.unitAbilities.get(unitId) ?? [];
  }

  /**
   * 유닛이 특정 패시브 능력을 보유하는지 확인
   */
  hasAbility(unitId: string, abilityType: PassiveAbilityType): boolean {
    return this.getAbilities(unitId).includes(abilityType);
  }

  /**
   * 턴 시작 처리
   */
  onTurnStart(turn: number): void {
    this.currentTurn = turn;
    
    // 출혈 스택 지속 시간 감소
    for (const [unitId, stacks] of this.bleedStacks) {
      const remaining = stacks.filter(stack => {
        stack.remainingTurns--;
        return stack.remainingTurns > 0;
      });
      if (remaining.length > 0) {
        this.bleedStacks.set(unitId, remaining);
      } else {
        this.bleedStacks.delete(unitId);
      }
    }
  }

  /**
   * 역전의 명수 (Underdog) 체크
   * 조건: 현재 HP가 적보다 낮을 때
   * 효과: 25% 확률로 40~80% 추가 데미지
   */
  checkUnderdog(attacker: BattleUnit, defender: BattleUnit): PassiveAbilityResult {
    const result: PassiveAbilityResult = {
      triggered: false,
      abilityType: 'underdog',
      abilityName: PASSIVE_ABILITIES.underdog.name,
    };

    if (!this.hasAbility(attacker.id, 'underdog')) {
      return result;
    }

    // HP 비율 비교
    const attackerHpRatio = attacker.stats.currentHp / attacker.stats.maxHp;
    const defenderHpRatio = defender.stats.currentHp / defender.stats.maxHp;

    if (attackerHpRatio >= defenderHpRatio) {
      return result;
    }

    // 25% 확률 체크
    const config = PASSIVE_ABILITIES.underdog;
    if (this.randomFn() > config.triggerChance!) {
      return result;
    }

    // 40~80% 추가 데미지 계산
    const bonusMultiplier = this.randomRange(config.minValue, config.maxValue);

    result.triggered = true;
    result.effect = {
      type: 'damage_bonus',
      value: bonusMultiplier,
      target: defender.id,
    };
    result.message = `${attacker.name}의 역전의 명수 발동! 데미지 ${Math.round(bonusMultiplier * 100)}% 증가`;

    return result;
  }

  /**
   * 환호성 (Victory Heal) 체크
   * 조건: 전투 승리 시
   * 효과: 잃은 병력의 20~40% 회복
   */
  checkVictoryHeal(unit: BattleUnit): PassiveAbilityResult {
    const result: PassiveAbilityResult = {
      triggered: false,
      abilityType: 'victory_heal',
      abilityName: PASSIVE_ABILITIES.victory_heal.name,
    };

    if (!this.hasAbility(unit.id, 'victory_heal')) {
      return result;
    }

    if (!unit.isAlive) {
      return result;
    }

    const config = PASSIVE_ABILITIES.victory_heal;
    const lostHp = unit.stats.maxHp - unit.stats.currentHp;
    
    if (lostHp <= 0) {
      return result;
    }

    // 20~40% 회복량 계산
    const healRatio = this.randomRange(config.minValue, config.maxValue);
    const healAmount = Math.floor(lostHp * healRatio);

    result.triggered = true;
    result.effect = {
      type: 'heal',
      value: healAmount,
    };
    result.message = `${unit.name}의 환호성 발동! HP ${healAmount} 회복`;

    return result;
  }

  /**
   * 환호성 효과 적용
   */
  applyVictoryHeal(unit: BattleUnit): number {
    const checkResult = this.checkVictoryHeal(unit);
    if (!checkResult.triggered || !checkResult.effect) {
      return 0;
    }

    const healAmount = checkResult.effect.value;
    unit.stats.currentHp = Math.min(unit.stats.maxHp, unit.stats.currentHp + healAmount);
    return healAmount;
  }

  /**
   * 출혈 (Bleed) 체크
   * 조건: 공격 시 23~30% 확률
   * 효과: 3턴간 평타 데미지 11~16% 증가 (스택 가능)
   */
  checkBleed(attacker: BattleUnit, defender: BattleUnit): PassiveAbilityResult {
    const result: PassiveAbilityResult = {
      triggered: false,
      abilityType: 'bleed',
      abilityName: PASSIVE_ABILITIES.bleed.name,
    };

    if (!this.hasAbility(attacker.id, 'bleed')) {
      return result;
    }

    const config = PASSIVE_ABILITIES.bleed;
    
    // 23~30% 확률 체크
    const triggerChance = this.randomRange(0.23, 0.30);
    if (this.randomFn() > triggerChance) {
      return result;
    }

    // 11~16% 데미지 증가 계산
    const bleedBonus = this.randomRange(config.minValue, config.maxValue);

    // 스택 추가
    this.addBleedStack(attacker.id, defender.id, bleedBonus, config.duration!);

    result.triggered = true;
    result.effect = {
      type: 'bleed',
      value: bleedBonus,
      target: defender.id,
    };
    result.message = `${attacker.name}의 출혈 발동! ${defender.name}에게 3턴간 출혈 부여`;

    return result;
  }

  /**
   * 출혈 스택 추가
   */
  private addBleedStack(attackerId: string, targetId: string, damageBonus: number, duration: number): void {
    if (!this.bleedStacks.has(attackerId)) {
      this.bleedStacks.set(attackerId, []);
    }
    
    this.bleedStacks.get(attackerId)!.push({
      unitId: attackerId,
      targetId,
      stacks: 1,
      damageBonus,
      remainingTurns: duration,
    });
  }

  /**
   * 출혈 데미지 보너스 계산
   */
  getBleedBonus(attackerId: string, targetId: string): number {
    const stacks = this.bleedStacks.get(attackerId);
    if (!stacks) return 0;

    let totalBonus = 0;
    for (const stack of stacks) {
      if (stack.targetId === targetId) {
        totalBonus += stack.damageBonus;
      }
    }
    return totalBonus;
  }

  /**
   * 압도 (Overwhelm) 초기화
   * 전투 시작 시 호출
   */
  initializeOverwhelm(unit: BattleUnit): void {
    if (!this.hasAbility(unit.id, 'overwhelm')) {
      return;
    }

    const config = PASSIVE_ABILITIES.overwhelm;
    
    // 회피 또는 피해 감소 중 랜덤 선택
    const effectType = this.randomFn() < 0.5 ? 'evasion' : 'damage_reduction';
    
    // 효과 값 계산
    let value: number;
    if (effectType === 'evasion') {
      // 회피: 30~45%
      value = this.randomRange(0.30, 0.45);
    } else {
      // 피해 감소: 15~40%
      value = this.randomRange(0.15, 0.40);
    }

    this.overwhelmEffects.set(unit.id, {
      unitId: unit.id,
      type: effectType,
      value,
      used: false,
    });
  }

  /**
   * 압도 (Overwhelm) 체크
   * 조건: 전투 첫 턴, 첫 공격 받을 때
   */
  checkOverwhelm(defender: BattleUnit): PassiveAbilityResult {
    const result: PassiveAbilityResult = {
      triggered: false,
      abilityType: 'overwhelm',
      abilityName: PASSIVE_ABILITIES.overwhelm.name,
    };

    const effect = this.overwhelmEffects.get(defender.id);
    if (!effect || effect.used || this.currentTurn > 1) {
      return result;
    }

    // 첫 사용 마킹
    effect.used = true;

    result.triggered = true;
    result.effect = {
      type: effect.type,
      value: effect.value,
    };

    if (effect.type === 'evasion') {
      result.message = `${defender.name}의 압도 발동! ${Math.round(effect.value * 100)}% 회피 시도`;
    } else {
      result.message = `${defender.name}의 압도 발동! 피해 ${Math.round(effect.value * 100)}% 감소`;
    }

    return result;
  }

  /**
   * 압도 회피 체크
   * @returns true면 공격 완전 회피
   */
  checkOverwhelmEvasion(defender: BattleUnit): boolean {
    const effect = this.overwhelmEffects.get(defender.id);
    if (!effect || effect.used || this.currentTurn > 1) {
      return false;
    }

    if (effect.type !== 'evasion') {
      return false;
    }

    // 회피 확률 체크
    const evades = this.randomFn() < effect.value;
    effect.used = true;

    return evades;
  }

  /**
   * 압도 피해 감소율 조회
   * @returns 피해 감소 비율 (0이면 효과 없음)
   */
  getOverwhelmDamageReduction(defender: BattleUnit): number {
    const effect = this.overwhelmEffects.get(defender.id);
    if (!effect || effect.used || this.currentTurn > 1) {
      return 0;
    }

    if (effect.type !== 'damage_reduction') {
      return 0;
    }

    effect.used = true;
    return effect.value;
  }

  /**
   * 협상 (Negotiation) 적용
   * 조건: 전투 시작 시
   * 효과: 적 최대 HP 9~18% 감소 (정치+매력 비교)
   */
  applyNegotiation(
    user: BattleUnit, 
    target: BattleUnit,
    userPolitics: number = 0,
    targetPolitics: number = 0
  ): PassiveAbilityResult {
    const result: PassiveAbilityResult = {
      triggered: false,
      abilityType: 'negotiation',
      abilityName: PASSIVE_ABILITIES.negotiation.name,
    };

    if (!this.hasAbility(user.id, 'negotiation')) {
      return result;
    }

    // 이미 적용됨
    const key = `${user.id}_${target.id}`;
    if (this.negotiationApplied.has(key)) {
      return result;
    }

    // 정치력 비교 (사용자가 높아야 함)
    if (userPolitics <= targetPolitics) {
      return result;
    }

    const config = PASSIVE_ABILITIES.negotiation;
    
    // 정치력 차이에 따른 효과 보정
    const politicsDiff = userPolitics - targetPolitics;
    const politicsBonus = Math.min(politicsDiff / 200, 0.1); // 최대 10% 추가 보정
    
    // 9~18% HP 감소
    const baseReduction = this.randomRange(config.minValue, config.maxValue);
    const totalReduction = Math.min(baseReduction + politicsBonus, 0.25); // 최대 25%
    
    const hpReduction = Math.floor(target.stats.maxHp * totalReduction);
    
    // 적용
    target.stats.maxHp -= hpReduction;
    target.stats.currentHp = Math.min(target.stats.currentHp, target.stats.maxHp);
    
    this.negotiationApplied.add(key);

    result.triggered = true;
    result.effect = {
      type: 'hp_reduction',
      value: hpReduction,
      target: target.id,
    };
    result.message = `${user.name}의 협상 발동! ${target.name}의 최대 HP ${hpReduction} 감소`;

    return result;
  }

  /**
   * 흡혈 (Lifesteal) 계산
   * 조건: 데미지 적용 시
   * 효과: 가한 데미지의 13~23% HP 회복
   */
  calculateLifesteal(attacker: BattleUnit, damageDealt: number): PassiveAbilityResult {
    const result: PassiveAbilityResult = {
      triggered: false,
      abilityType: 'lifesteal',
      abilityName: PASSIVE_ABILITIES.lifesteal.name,
    };

    if (!this.hasAbility(attacker.id, 'lifesteal')) {
      return result;
    }

    const config = PASSIVE_ABILITIES.lifesteal;
    
    // 13~23% 회복
    const lifestealRatio = this.randomRange(config.minValue, config.maxValue);
    const healAmount = Math.floor(damageDealt * lifestealRatio);

    if (healAmount <= 0) {
      return result;
    }

    result.triggered = true;
    result.effect = {
      type: 'heal',
      value: healAmount,
    };
    result.message = `${attacker.name}의 흡혈 발동! HP ${healAmount} 회복`;

    return result;
  }

  /**
   * 흡혈 효과 적용
   */
  applyLifesteal(attacker: BattleUnit, damageDealt: number): number {
    const checkResult = this.calculateLifesteal(attacker, damageDealt);
    if (!checkResult.triggered || !checkResult.effect) {
      return 0;
    }

    const healAmount = checkResult.effect.value;
    attacker.stats.currentHp = Math.min(attacker.stats.maxHp, attacker.stats.currentHp + healAmount);
    return healAmount;
  }

  /**
   * 범위 내 랜덤 값 생성
   */
  private randomRange(min: number, max: number): number {
    return min + this.randomFn() * (max - min);
  }

  /**
   * 모든 패시브 능력 설정 조회
   */
  static getAbilityConfig(type: PassiveAbilityType): PassiveAbilityConfig {
    return PASSIVE_ABILITIES[type];
  }

  /**
   * 모든 패시브 능력 목록
   */
  static getAllAbilities(): PassiveAbilityConfig[] {
    return Object.values(PASSIVE_ABILITIES);
  }
}
