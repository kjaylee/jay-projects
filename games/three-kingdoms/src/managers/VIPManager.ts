/**
 * VIP 보너스 시스템 관리자
 * 결제/포인트 기반 VIP 레벨 및 혜택 관리
 */

export interface VIPBenefits {
  idleRewardBonus: number;    // 방치 보상 보너스 %
  gachaRateBonus: number;     // SR+ 확률 추가 %
  dailyFreeGacha: number;     // 일일 무료 가챠 횟수
  stamRefreshBonus: number;   // 스태미나 추가량
}

export interface VIPConfig {
  maxLevel: number;
  levelThresholds: number[];
  benefits: {
    idleRewardBonus: number[];
    gachaRateBonus: number[];
    dailyFreeGacha: number[];
    stamRefreshBonus: number[];
  };
  pointsPerCurrency?: number; // 1원당 VIP 포인트 (기본 1)
}

export interface VIPLevel {
  level: number;
  points: number;
  pointsToNext: number;
  benefits: VIPBenefits;
}

export class VIPManager {
  private config: VIPConfig;
  private points: number = 0;
  private level: number = 0;

  constructor(config: VIPConfig) {
    this.config = config;
  }

  /**
   * 현재 설정을 반환
   */
  getConfig(): VIPConfig {
    return { ...this.config };
  }

  /**
   * 현재 VIP 레벨
   */
  getCurrentLevel(): number {
    return this.level;
  }

  /**
   * 현재 VIP 포인트
   */
  getCurrentPoints(): number {
    return this.points;
  }

  /**
   * VIP 포인트 적립 및 레벨 계산
   */
  addPoints(amount: number): void {
    this.points += amount;
    this.updateLevel();
  }

  /**
   * 레벨 재계산
   */
  private updateLevel(): void {
    for (let i = this.config.levelThresholds.length - 1; i >= 0; i--) {
      if (this.points >= this.config.levelThresholds[i]) {
        this.level = Math.min(i, this.config.maxLevel);
        break;
      }
    }
  }

  /**
   * 다음 레벨까지 필요한 포인트
   */
  getPointsToNextLevel(): number {
    if (this.level >= this.config.maxLevel) {
      return 0;
    }
    const nextThreshold = this.config.levelThresholds[this.level + 1];
    return nextThreshold - this.points;
  }

  /**
   * 방치 보상 보너스 % 조회
   */
  getIdleRewardBonus(): number {
    return this.config.benefits.idleRewardBonus[this.level] ?? 0;
  }

  /**
   * 방치 보상에 VIP 보너스 적용
   */
  applyIdleRewardBonus(baseReward: number): number {
    const bonusPercent = this.getIdleRewardBonus();
    return Math.floor(baseReward * (1 + bonusPercent / 100));
  }

  /**
   * 가챠 확률 보너스 % 조회
   */
  getGachaRateBonus(): number {
    return this.config.benefits.gachaRateBonus[this.level] ?? 0;
  }

  /**
   * 일일 무료 가챠 횟수 조회
   */
  getDailyFreeGachaCount(): number {
    return this.config.benefits.dailyFreeGacha[this.level] ?? 1;
  }

  /**
   * 스태미나 보너스 조회
   */
  getStaminaRefreshBonus(): number {
    return this.config.benefits.stamRefreshBonus[this.level] ?? 0;
  }

  /**
   * VIP 레벨 직접 설정
   */
  setLevel(level: number): void {
    const clampedLevel = Math.max(0, Math.min(level, this.config.maxLevel));
    this.level = clampedLevel;
    this.points = this.config.levelThresholds[clampedLevel] ?? 0;
  }

  /**
   * 현재 상태를 JSON으로 내보내기
   */
  toJSON(): { points: number; level: number } {
    return {
      points: this.points,
      level: this.level,
    };
  }

  /**
   * JSON에서 상태 복원
   */
  fromJSON(data: { points: number; level: number }): void {
    this.points = data.points;
    this.level = data.level;
  }

  /**
   * 현재 VIP 레벨 정보 조회
   */
  getLevelInfo(): VIPLevel {
    return {
      level: this.level,
      points: this.points,
      pointsToNext: this.getPointsToNextLevel(),
      benefits: this.getBenefitsAtLevel(this.level),
    };
  }

  /**
   * 결제 시 VIP 포인트 적립
   */
  onPurchase(amountInCurrency: number): void {
    const pointsPerCurrency = this.config.pointsPerCurrency ?? 1;
    this.addPoints(amountInCurrency * pointsPerCurrency);
  }

  /**
   * 특정 레벨의 혜택 미리보기
   */
  getBenefitsAtLevel(level: number): VIPBenefits {
    const clampedLevel = Math.max(0, Math.min(level, this.config.maxLevel));
    return {
      idleRewardBonus: this.config.benefits.idleRewardBonus[clampedLevel] ?? 0,
      gachaRateBonus: this.config.benefits.gachaRateBonus[clampedLevel] ?? 0,
      dailyFreeGacha: this.config.benefits.dailyFreeGacha[clampedLevel] ?? 1,
      stamRefreshBonus: this.config.benefits.stamRefreshBonus[clampedLevel] ?? 0,
    };
  }
}
