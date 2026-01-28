/**
 * 스킬 레벨 관리자
 * 스킬 강화 시스템: 재료 소모하여 스킬 효과 증가
 */

export interface SkillLevelConfig {
  maxLevel: number;                    // 최대 레벨 (기본 10)
  baseCost: { gold: number; skillBooks: number };  // 기본 비용
  costMultiplier: number;              // 레벨당 비용 증가 배율
  effectIncreasePercent: number;       // 레벨당 효과 증가 %
}

export interface UpgradeCost {
  gold: number;
  skillBooks: number;
}

export interface SkillUpgradeResult {
  success: boolean;
  newLevel?: number;
  remainingResources?: { gold: number; skillBooks: number };
  reason?: 'insufficient_resources' | 'max_level_reached';
}

export class SkillLevelManager {
  private config: SkillLevelConfig;
  private skillLevels: Map<string, number> = new Map();

  constructor(config: SkillLevelConfig) {
    this.config = config;
  }

  /**
   * 현재 설정을 반환
   */
  getConfig(): SkillLevelConfig {
    return { ...this.config };
  }

  /**
   * 스킬의 현재 레벨 조회 (기본 1)
   */
  getSkillLevel(skillId: string): number {
    return this.skillLevels.get(skillId) ?? 1;
  }

  /**
   * 스킬 레벨 설정
   */
  setSkillLevel(skillId: string, level: number): void {
    const clampedLevel = Math.max(1, Math.min(level, this.config.maxLevel));
    this.skillLevels.set(skillId, clampedLevel);
  }

  /**
   * 업그레이드 비용 계산
   * 레벨 N → N+1 비용 = baseCost * multiplier^(N-1)
   */
  getUpgradeCost(skillId: string): UpgradeCost | null {
    const currentLevel = this.getSkillLevel(skillId);
    if (currentLevel >= this.config.maxLevel) {
      return null;
    }

    const multiplier = Math.pow(this.config.costMultiplier, currentLevel - 1);
    return {
      gold: Math.floor(this.config.baseCost.gold * multiplier),
      skillBooks: Math.max(1, Math.floor(this.config.baseCost.skillBooks * multiplier)),
    };
  }

  /**
   * 스킬 효과 배율 계산
   * 레벨 N에서 배율 = 1.0 + (N-1) * (effectIncreasePercent / 100)
   */
  getEffectMultiplier(skillId: string): number {
    const level = this.getSkillLevel(skillId);
    return 1.0 + (level - 1) * (this.config.effectIncreasePercent / 100);
  }

  /**
   * 스킬 레벨업 실행
   */
  upgradeSkill(
    skillId: string,
    resources: { gold: number; skillBooks: number }
  ): SkillUpgradeResult {
    const currentLevel = this.getSkillLevel(skillId);
    
    // 최대 레벨 체크
    if (currentLevel >= this.config.maxLevel) {
      return { success: false, reason: 'max_level_reached' };
    }

    const cost = this.getUpgradeCost(skillId)!;
    
    // 재료 체크
    if (resources.gold < cost.gold || resources.skillBooks < cost.skillBooks) {
      return { success: false, reason: 'insufficient_resources' };
    }

    // 레벨업 적용
    const newLevel = currentLevel + 1;
    this.setSkillLevel(skillId, newLevel);

    return {
      success: true,
      newLevel,
      remainingResources: {
        gold: resources.gold - cost.gold,
        skillBooks: resources.skillBooks - cost.skillBooks,
      },
    };
  }

  /**
   * 업그레이드 가능 여부 확인
   */
  canUpgrade(skillId: string, resources: { gold: number; skillBooks: number }): boolean {
    const cost = this.getUpgradeCost(skillId);
    if (!cost) return false;
    return resources.gold >= cost.gold && resources.skillBooks >= cost.skillBooks;
  }

  /**
   * 모든 스킬 레벨 리셋
   */
  resetAll(): void {
    this.skillLevels.clear();
  }

  /**
   * 스킬 레벨 데이터를 JSON으로 내보내기
   */
  toJSON(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [skillId, level] of this.skillLevels) {
      result[skillId] = level;
    }
    return result;
  }

  /**
   * JSON에서 스킬 레벨 복원
   */
  fromJSON(data: Record<string, number>): void {
    this.skillLevels.clear();
    for (const [skillId, level] of Object.entries(data)) {
      this.skillLevels.set(skillId, level);
    }
  }

  /**
   * 장수 ID와 스킬 ID를 조합하여 고유 키 생성
   */
  static createSkillKey(generalId: string, skillId: string): string {
    return `${generalId}:${skillId}`;
  }
}
