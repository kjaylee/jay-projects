import { BattleUnit } from '../entities/BattleUnit';
import { Skill, SkillConfig, SkillEffect } from '../entities/Skill';
import skillsData from '../data/skills.json';
import { BuffManager, ActiveBuff } from './BuffManager';

/**
 * 스킬 실행 결과
 */
export interface SkillResult {
  success: boolean;
  skillId: string;
  skillName: string;
  caster: BattleUnit;
  targets: BattleUnit[];
  effects: EffectResult[];
  totalDamage: number;
  totalHeal: number;
}

/**
 * 개별 효과 결과
 */
export interface EffectResult {
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  target: BattleUnit;
  value: number;
  attribute?: string;
  duration?: number;
}

/**
 * 스킬 데이터 캐시
 */
const skillCache = new Map<string, SkillConfig>();

/**
 * 스킬 데이터 로드
 */
function loadSkillData(skillId: string): SkillConfig | null {
  if (skillCache.has(skillId)) {
    return skillCache.get(skillId)!;
  }

  // skills.json에서 스킬 데이터 조회
  const rawSkill = (skillsData.skills as Array<{
    id: string;
    name: string;
    type: string;
    target: string;
    cooldown: number;
    mpCost: number;
    effects: Array<{
      type: string;
      value?: number;
      duration?: number;
      stat?: string;
    }>;
    description: string;
  }>).find((s) => s.id === skillId);

  if (!rawSkill) {
    return null;
  }

  // JSON 형식을 SkillConfig로 변환
  const config: SkillConfig = {
    id: rawSkill.id,
    name: rawSkill.name,
    type: rawSkill.type === 'attack' || rawSkill.type === 'special' ? 'active' : 'active',
    target: mapTargetType(rawSkill.target),
    effects: rawSkill.effects.map((e) => ({
      type: mapEffectType(e.type),
      value: e.value ?? 0,
      duration: e.duration,
      attribute: e.stat as 'attack' | 'defense' | 'intelligence' | 'speed' | undefined,
    })),
    cooldown: rawSkill.cooldown,
    mpCost: rawSkill.mpCost,
    description: rawSkill.description,
  };

  skillCache.set(skillId, config);
  return config;
}

/**
 * JSON 타겟 타입 변환
 */
function mapTargetType(target: string): 'self' | 'ally_single' | 'ally_all' | 'ally_row' | 'enemy_single' | 'enemy_all' | 'enemy_row' | 'enemy_column' {
  const mapping: Record<string, 'self' | 'ally_single' | 'ally_all' | 'ally_row' | 'enemy_single' | 'enemy_all' | 'enemy_row' | 'enemy_column'> = {
    'self': 'self',
    'single': 'enemy_single',
    'all_enemies': 'enemy_all',
    'column': 'enemy_column',
    'row': 'enemy_row',
    'all_allies': 'ally_all',
    'front_allies': 'ally_row',
  };
  return mapping[target] ?? 'enemy_single';
}

/**
 * JSON 효과 타입 변환
 */
function mapEffectType(type: string): 'damage' | 'heal' | 'buff' | 'debuff' {
  const mapping: Record<string, 'damage' | 'heal' | 'buff' | 'debuff'> = {
    'damage': 'damage',
    'heal': 'heal',
    'buff': 'buff',
    'debuff': 'debuff',
    'stun': 'debuff', // 스턴은 디버프로 처리
  };
  return mapping[type] ?? 'damage';
}

/**
 * 스킬 실행기
 */
export class SkillExecutor {
  private static buffManager: BuffManager | null = null;

  /**
   * BuffManager 설정
   */
  static setBuffManager(manager: BuffManager): void {
    this.buffManager = manager;
  }

  /**
   * BuffManager 조회
   */
  static getBuffManager(): BuffManager | null {
    return this.buffManager;
  }
  /**
   * 스킬 발동 가능 여부
   */
  static canUseSkill(unit: BattleUnit, skillId: string): boolean {
    // 스킬 보유 여부
    if (!unit.skills.includes(skillId)) {
      return false;
    }

    // 쿨다운 체크
    const cooldown = unit.skillCooldowns.get(skillId) ?? 0;
    if (cooldown > 0) {
      return false;
    }

    // 생존 여부
    if (!unit.isAlive) {
      return false;
    }

    return true;
  }

  /**
   * 사용 가능한 스킬 ID 반환
   */
  static getReadySkill(unit: BattleUnit): string | null {
    for (const skillId of unit.skills) {
      if (this.canUseSkill(unit, skillId)) {
        return skillId;
      }
    }
    return null;
  }

  /**
   * 스킬 효과 적용
   */
  static executeSkill(
    caster: BattleUnit,
    skillId: string,
    allUnits: BattleUnit[]
  ): SkillResult | null {
    const skillConfig = loadSkillData(skillId);
    if (!skillConfig) {
      console.warn(`Skill not found: ${skillId}`);
      return null;
    }

    const skill = new Skill(skillConfig);
    const targets = this.selectTargets(caster, skill, allUnits);

    if (targets.length === 0) {
      return null;
    }

    const effects: EffectResult[] = [];
    let totalDamage = 0;
    let totalHeal = 0;

    // 각 타겟에 효과 적용
    for (const target of targets) {
      for (const effect of skill.effects) {
        const result = this.applyEffect(caster, target, effect, skill);
        effects.push(result);

        if (result.type === 'damage') {
          totalDamage += result.value;
        } else if (result.type === 'heal') {
          totalHeal += result.value;
        }
      }
    }

    // 쿨다운 설정
    caster.skillCooldowns.set(skillId, skill.cooldown);

    console.log(`⚡ ${caster.name}이(가) [${skill.name}] 발동! (타겟: ${targets.map(t => t.name).join(', ')})`);

    return {
      success: true,
      skillId: skill.id,
      skillName: skill.name,
      caster,
      targets,
      effects,
      totalDamage,
      totalHeal,
    };
  }

  /**
   * 타겟 선택 (스킬 타입에 따라)
   */
  static selectTargets(
    caster: BattleUnit,
    skill: Skill,
    allUnits: BattleUnit[]
  ): BattleUnit[] {
    const aliveUnits = allUnits.filter((u) => u.isAlive);
    const allies = aliveUnits.filter((u) => u.team === caster.team);
    const enemies = aliveUnits.filter((u) => u.team !== caster.team);

    switch (skill.target) {
      case 'self':
        return [caster];

      case 'ally_single':
        // 가장 체력이 낮은 아군
        return allies
          .sort((a, b) => (a.stats.currentHp / a.stats.maxHp) - (b.stats.currentHp / b.stats.maxHp))
          .slice(0, 1);

      case 'ally_all':
        return allies;

      case 'ally_row':
        // 전열 (row=0) 우선
        const frontAllies = allies.filter((u) => u.position.row === 0);
        return frontAllies.length > 0 ? frontAllies : allies.slice(0, 1);

      case 'enemy_single':
        // 전열 우선 타겟
        return enemies
          .sort((a, b) => a.position.row - b.position.row)
          .slice(0, 1);

      case 'enemy_all':
        return enemies;

      case 'enemy_row':
        // 가장 앞열의 적
        const minRow = Math.min(...enemies.map((e) => e.position.row));
        return enemies.filter((e) => e.position.row === minRow);

      case 'enemy_column':
        // 가장 많은 적이 있는 열
        const colCounts = new Map<number, number>();
        for (const e of enemies) {
          colCounts.set(e.position.col, (colCounts.get(e.position.col) ?? 0) + 1);
        }
        let maxCol = 0;
        let maxCount = 0;
        for (const [col, count] of colCounts) {
          if (count > maxCount) {
            maxCol = col;
            maxCount = count;
          }
        }
        return enemies.filter((e) => e.position.col === maxCol);

      default:
        return [];
    }
  }

  /**
   * 개별 효과 적용
   */
  private static applyEffect(
    caster: BattleUnit,
    target: BattleUnit,
    effect: SkillEffect,
    skill: Skill
  ): EffectResult {
    switch (effect.type) {
      case 'damage': {
        // 스탯 기반 데미지 계산 (버프 적용)
        let statValue = effect.attribute === 'intelligence'
          ? caster.stats.intelligence
          : caster.stats.attack;
        
        // 버프 적용
        if (this.buffManager) {
          const statName = effect.attribute === 'intelligence' ? 'intelligence' : 'attack';
          const modifier = this.buffManager.getStatModifier(caster.id, statName);
          statValue = Math.floor(statValue * modifier);
        }
        
        const baseDamage = skill.calculateDamage(statValue);
        
        // 방어력 적용 (버프 적용)
        let defenseValue = target.stats.defense;
        if (this.buffManager) {
          const defModifier = this.buffManager.getStatModifier(target.id, 'defense');
          defenseValue = Math.floor(defenseValue * defModifier);
        }
        
        const damageReduction = defenseValue / (defenseValue + 100);
        const finalDamage = Math.floor(baseDamage * (1 - damageReduction));

        target.stats.currentHp = Math.max(0, target.stats.currentHp - finalDamage);
        if (target.stats.currentHp === 0) {
          target.isAlive = false;
        }

        return { type: 'damage', target, value: finalDamage };
      }

      case 'heal': {
        const healAmount = skill.calculateHeal(target.stats.maxHp);
        target.stats.currentHp = Math.min(target.stats.maxHp, target.stats.currentHp + healAmount);

        return { type: 'heal', target, value: healAmount };
      }

      case 'buff':
      case 'debuff': {
        // BuffManager에 버프/디버프 추가
        if (this.buffManager && effect.attribute && effect.duration) {
          const buffValue = effect.type === 'buff' ? effect.value : -Math.abs(effect.value);
          const activeBuff: ActiveBuff = {
            id: `${skill.id}_${effect.attribute}_${Date.now()}`,
            skillId: skill.id,
            type: effect.type,
            stat: effect.attribute,
            value: buffValue,
            duration: effect.duration,
            source: caster.id,
          };
          this.buffManager.addBuff(target.id, activeBuff);
          console.log(`  → ${target.name}에게 ${effect.type} 적용: ${effect.attribute} ${buffValue > 0 ? '+' : ''}${buffValue * 100}% (${effect.duration}턴)`);
        }
        return {
          type: effect.type,
          target,
          value: effect.value,
          attribute: effect.attribute,
          duration: effect.duration,
        };
      }

      default:
        return { type: 'damage', target, value: 0 };
    }
  }

  /**
   * 모든 유닛의 쿨다운 감소
   */
  static reduceCooldowns(units: BattleUnit[]): void {
    for (const unit of units) {
      if (!unit.isAlive) continue;
      
      for (const [skillId, cooldown] of unit.skillCooldowns) {
        if (cooldown > 0) {
          unit.skillCooldowns.set(skillId, cooldown - 1);
        }
      }
    }
  }
}
