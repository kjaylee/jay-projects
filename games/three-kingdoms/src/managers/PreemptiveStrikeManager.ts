/**
 * 선제 기습 효과 관리자
 * 매복 스킬 보유 유닛에게 첫 턴 2배 데미지 효과를 부여
 */

export interface PreemptiveStrikeConfig {
  damageMultiplier: number;  // 데미지 배율 (기본 2.0)
  duration: number;          // 지속 턴 수 (기본 1)
}

interface StrikeEffect {
  remainingTurns: number;
  multiplier: number;
}

export class PreemptiveStrikeManager {
  static readonly AMBUSH_SKILL_ID = 'ambush';

  private config: PreemptiveStrikeConfig;
  private effects: Map<string, StrikeEffect> = new Map();

  constructor(config: PreemptiveStrikeConfig) {
    this.config = config;
  }

  /**
   * 현재 설정을 반환
   */
  getConfig(): PreemptiveStrikeConfig {
    return { ...this.config };
  }

  /**
   * 유닛에 선제 기습 효과 부여
   */
  applyPreemptiveStrike(unitId: string): void {
    this.effects.set(unitId, {
      remainingTurns: this.config.duration,
      multiplier: this.config.damageMultiplier,
    });
  }

  /**
   * 유닛이 선제 기습 효과를 가지고 있는지 확인
   */
  hasPreemptiveStrike(unitId: string): boolean {
    return this.effects.has(unitId);
  }

  /**
   * 데미지 배율 반환 (효과 없으면 1.0)
   */
  getDamageMultiplier(unitId: string): number {
    const effect = this.effects.get(unitId);
    return effect ? effect.multiplier : 1.0;
  }

  /**
   * 남은 턴 수 반환 (효과 없으면 0)
   */
  getRemainingTurns(unitId: string): number {
    const effect = this.effects.get(unitId);
    return effect ? effect.remainingTurns : 0;
  }

  /**
   * 턴 종료 시 효과 감소
   */
  onTurnEnd(unitId: string): void {
    const effect = this.effects.get(unitId);
    if (!effect) return;

    effect.remainingTurns--;
    if (effect.remainingTurns <= 0) {
      this.effects.delete(unitId);
    }
  }

  /**
   * 모든 효과 초기화
   */
  resetAll(): void {
    this.effects.clear();
  }

  /**
   * 선제 기습 효과가 있는 유닛 목록
   */
  getUnitsWithEffect(): string[] {
    return Array.from(this.effects.keys());
  }

  /**
   * 전투 시작 시 매복 스킬 보유 유닛에게 효과 부여
   */
  applyOnBattleStart(unitsWithAmbush: string[]): void {
    for (const unitId of unitsWithAmbush) {
      this.applyPreemptiveStrike(unitId);
    }
  }

  /**
   * 특정 유닛의 효과 제거
   */
  removeEffect(unitId: string): void {
    this.effects.delete(unitId);
  }

  /**
   * 스킬이 매복 스킬인지 확인
   */
  static isAmbushSkill(skillId: string): boolean {
    return skillId === PreemptiveStrikeManager.AMBUSH_SKILL_ID;
  }
}
