/**
 * 방치 보상 시스템 매니저
 * 오프라인/방치 시간 기반 골드/경험치 보상 계산
 */

export interface IdleReward {
  gold: number;
  exp: number;
  minutes: number;
}

export interface IdleConfig {
  goldPerMinute: number;  // 정치 합계 기반 (politics * 0.5)
  expPerMinute: number;   // 클리어 스테이지 기반 (stage * 2)
  maxHours: number;       // 최대 누적 시간 (기본 12시간)
  vipBonus?: number;      // VIP 보너스 배율 (1.0 = 100%)
}

/** VIP 레벨별 보너스 배율 */
const VIP_BONUS_TABLE: Record<number, number> = {
  0: 1.0,
  1: 1.05,
  2: 1.10,
  3: 1.15,
  4: 1.20,
  5: 1.30,
  6: 1.40,
  7: 1.50,
  8: 1.60,
  9: 1.80,
  10: 2.00,
};

/** 최소 goldPerMinute */
const MIN_GOLD_PER_MINUTE = 10;

/** 최소 expPerMinute */
const MIN_EXP_PER_MINUTE = 1;

/** 챕터당 스테이지 수 */
const STAGES_PER_CHAPTER = 10;

export class IdleManager {
  private config: IdleConfig;

  constructor(config: IdleConfig) {
    this.config = {
      ...config,
      vipBonus: config.vipBonus ?? 1.0,
    };
  }

  /**
   * 방치 보상 계산
   * @param lastClaimAt 마지막 수령 시간
   * @param now 현재 시간
   */
  calculateReward(lastClaimAt: Date, now: Date): IdleReward {
    const diffMs = now.getTime() - lastClaimAt.getTime();
    let minutes = Math.floor(diffMs / 60000);

    // 최대 시간 제한
    const maxMinutes = this.config.maxHours * 60;
    minutes = Math.min(minutes, maxMinutes);

    // 음수 방지
    minutes = Math.max(0, minutes);

    const vipBonus = this.config.vipBonus ?? 1.0;

    return {
      gold: Math.floor(minutes * this.config.goldPerMinute * vipBonus),
      exp: Math.floor(minutes * this.config.expPerMinute * vipBonus),
      minutes,
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(partial: Partial<IdleConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
    };
  }

  /**
   * 현재 설정 조회
   */
  getConfig(): IdleConfig {
    return { ...this.config };
  }

  /**
   * 정치 스탯 합계로 goldPerMinute 계산
   * 공식: politics * 0.5 (최소 10)
   */
  static calculateGoldPerMinute(politicsSum: number): number {
    const gold = Math.floor(politicsSum * 0.5);
    return Math.max(gold, MIN_GOLD_PER_MINUTE);
  }

  /**
   * 클리어 스테이지 번호로 expPerMinute 계산
   * 공식: stageNumber * 2 (최소 1)
   */
  static calculateExpPerMinute(stageNumber: number): number {
    const exp = Math.floor(stageNumber * 2);
    return Math.max(exp, MIN_EXP_PER_MINUTE);
  }

  /**
   * VIP 레벨별 보너스 배율 조회
   */
  static getVipBonus(vipLevel: number): number {
    return VIP_BONUS_TABLE[vipLevel] ?? 1.0;
  }

  /**
   * 스테이지 ID를 숫자로 변환
   * "1-10" → 10, "2-5" → 15 (챕터1 10개 + 5)
   */
  static parseStageNumber(stageId: string | null): number {
    if (!stageId) return 0;

    const parts = stageId.split('-');
    if (parts.length !== 2) return 0;

    const chapter = parseInt(parts[0], 10) || 0;
    const stage = parseInt(parts[1], 10) || 0;

    return (chapter - 1) * STAGES_PER_CHAPTER + stage;
  }

  /**
   * 보상 요약 문자열 생성
   */
  static getRewardSummary(reward: IdleReward): string {
    const hours = Math.floor(reward.minutes / 60);
    const mins = reward.minutes % 60;

    let timeStr = '';
    if (hours > 0) {
      timeStr = `${hours}시간`;
      if (mins > 0) timeStr += ` ${mins}분`;
    } else {
      timeStr = `${mins}분`;
    }

    const goldFormatted = reward.gold.toLocaleString();
    const expFormatted = reward.exp.toLocaleString();

    return `⏰ 방치 ${timeStr} | 💰 ${goldFormatted} | 📈 ${expFormatted} EXP`;
  }

  /**
   * 진형에서 정치 스탯 합계 계산
   * Formation + General 연동용
   */
  static calculateFormationPolitics(generals: Array<{ politics: number }>): number {
    return generals.reduce((sum, g) => sum + (g.politics || 0), 0);
  }
}
