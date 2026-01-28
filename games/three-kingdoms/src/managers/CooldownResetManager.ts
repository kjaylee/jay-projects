import { BattleUnit } from '../entities/BattleUnit';

/**
 * 연환계 적용 결과
 */
export interface ChainStratagemResult {
  affectedUnits: BattleUnit[];
  resetSkills: Map<string, string>; // unitId → skillId
}

/**
 * 쿨다운 초기화 매니저
 * 연환계(AC-SKL-10): 다음 계략 쿨타임 초기화
 */
export class CooldownResetManager {
  /**
   * 특정 스킬 쿨다운을 0으로 초기화
   */
  resetSkillCooldown(unit: BattleUnit, skillId: string): void {
    if (unit.skillCooldowns.has(skillId)) {
      unit.skillCooldowns.set(skillId, 0);
    }
  }

  /**
   * 유닛의 모든 스킬 쿨다운을 0으로 초기화
   */
  resetAllSkillCooldowns(unit: BattleUnit): void {
    for (const skillId of unit.skillCooldowns.keys()) {
      unit.skillCooldowns.set(skillId, 0);
    }
  }

  /**
   * 사용한 스킬 외 가장 높은 쿨다운의 스킬 초기화
   * @param unit 대상 유닛
   * @param excludeSkillId 제외할 스킬 (보통 연환계 자신)
   * @returns 초기화된 스킬 ID (없으면 null)
   */
  resetNextHighestCooldown(unit: BattleUnit, excludeSkillId: string): string | null {
    let highestCooldown = 0;
    let highestSkillId: string | null = null;

    for (const [skillId, cooldown] of unit.skillCooldowns) {
      if (skillId !== excludeSkillId && cooldown > highestCooldown) {
        highestCooldown = cooldown;
        highestSkillId = skillId;
      }
    }

    if (highestSkillId) {
      unit.skillCooldowns.set(highestSkillId, 0);
    }

    return highestSkillId;
  }

  /**
   * 쿨다운이 있는 스킬 중 하나를 랜덤 초기화
   * @param unit 대상 유닛
   * @param excludeSkillId 제외할 스킬
   * @returns 초기화된 스킬 ID (없으면 null)
   */
  resetRandomCooldown(unit: BattleUnit, excludeSkillId: string): string | null {
    const skillsWithCooldown: string[] = [];

    for (const [skillId, cooldown] of unit.skillCooldowns) {
      if (skillId !== excludeSkillId && cooldown > 0) {
        skillsWithCooldown.push(skillId);
      }
    }

    if (skillsWithCooldown.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * skillsWithCooldown.length);
    const selectedSkillId = skillsWithCooldown[randomIndex];
    unit.skillCooldowns.set(selectedSkillId, 0);

    return selectedSkillId;
  }

  /**
   * 특정 스킬 쿨다운을 지정량만큼 감소
   */
  reduceSkillCooldown(unit: BattleUnit, skillId: string, amount: number): void {
    const currentCooldown = unit.skillCooldowns.get(skillId) ?? 0;
    const newCooldown = Math.max(0, currentCooldown - amount);
    unit.skillCooldowns.set(skillId, newCooldown);
  }

  /**
   * 연환계 효과 적용
   * 시전자 외 아군의 랜덤 스킬 쿨다운 초기화
   * @param caster 시전자
   * @param allUnits 모든 유닛
   * @returns 영향받은 유닛과 초기화된 스킬 정보
   */
  applyChainStratagem(
    caster: BattleUnit,
    allUnits: BattleUnit[]
  ): ChainStratagemResult {
    const result: ChainStratagemResult = {
      affectedUnits: [],
      resetSkills: new Map(),
    };

    // 시전자 외 아군 필터
    const allies = allUnits.filter(
      (u) => u.team === caster.team && u.id !== caster.id && u.isAlive
    );

    if (allies.length === 0) {
      return result;
    }

    // 각 아군에 대해 랜덤 스킬 쿨다운 초기화 시도
    for (const ally of allies) {
      // 쿨다운이 있는 스킬 목록
      const skillsWithCooldown: string[] = [];
      for (const [skillId, cooldown] of ally.skillCooldowns) {
        if (cooldown > 0) {
          skillsWithCooldown.push(skillId);
        }
      }

      if (skillsWithCooldown.length > 0) {
        const randomIndex = Math.floor(Math.random() * skillsWithCooldown.length);
        const selectedSkillId = skillsWithCooldown[randomIndex];
        ally.skillCooldowns.set(selectedSkillId, 0);

        result.affectedUnits.push(ally);
        result.resetSkills.set(ally.id, selectedSkillId);
      }
    }

    return result;
  }
}

// 전역 싱글톤 인스턴스 (필요시 사용)
let globalCooldownResetManager: CooldownResetManager | null = null;

export function getCooldownResetManager(): CooldownResetManager {
  if (!globalCooldownResetManager) {
    globalCooldownResetManager = new CooldownResetManager();
  }
  return globalCooldownResetManager;
}

export function resetCooldownResetManager(): void {
  globalCooldownResetManager = null;
}
