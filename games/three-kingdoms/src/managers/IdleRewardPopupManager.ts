/**
 * 방치 보상 팝업 관리자
 * - 마지막 접속 시간 기록
 * - 경과 시간에 따른 보상 계산
 * - 최대 12시간 제한
 */

export interface IdleRewardData {
  gold: number;
  exp: number;
  elapsedMinutes: number;
  maxClearedStage: string | null;
}

export interface IdlePopupState {
  lastLoginTime: number;
  userId: string;
}

const STORAGE_KEY_PREFIX = 'idlePopup_';
const MAX_IDLE_HOURS = 12;
const MAX_IDLE_MS = MAX_IDLE_HOURS * 60 * 60 * 1000;

// 스테이지별 기본 보상
const STAGE_REWARDS: Record<string, { goldPerMin: number; expPerMin: number }> = {
  '1-1': { goldPerMin: 10, expPerMin: 5 },
  '1-5': { goldPerMin: 15, expPerMin: 8 },
  '1-10': { goldPerMin: 25, expPerMin: 12 },
  '2-1': { goldPerMin: 30, expPerMin: 15 },
  '2-5': { goldPerMin: 40, expPerMin: 20 },
  '3-1': { goldPerMin: 50, expPerMin: 25 },
};

export class IdleRewardPopupManager {
  private userId: string;
  private storageKey: string;
  private state: IdlePopupState;

  constructor(userId: string) {
    this.userId = userId;
    this.storageKey = STORAGE_KEY_PREFIX + userId;
    this.state = this.load();
  }

  private load(): IdlePopupState {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        console.error('Failed to parse IdleRewardPopupManager state');
      }
    }
    return { lastLoginTime: Date.now(), userId: this.userId };
  }

  private save(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  /**
   * 마지막 접속 시간 업데이트 (로그인/앱 종료 시)
   */
  updateLastLoginTime(): void {
    this.state.lastLoginTime = Date.now();
    this.save();
  }

  /**
   * 방치 시간 계산 (밀리초, 최대 12시간)
   */
  getIdleTimeMs(): number {
    const now = Date.now();
    const elapsed = now - this.state.lastLoginTime;
    return Math.min(elapsed, MAX_IDLE_MS);
  }

  /**
   * 방치 시간 계산 (분)
   */
  getIdleTimeMinutes(): number {
    return Math.floor(this.getIdleTimeMs() / (1000 * 60));
  }

  /**
   * 방치 보상 표시가 필요한지 (1분 이상 경과)
   */
  shouldShowPopup(): boolean {
    return this.getIdleTimeMinutes() >= 1;
  }

  /**
   * 방치 보상 계산
   */
  calculateReward(maxClearedStage: string | null): IdleRewardData {
    const elapsedMinutes = this.getIdleTimeMinutes();
    
    // 기본 보상 (스테이지 없으면 최소값)
    const stageKey = this.getHighestStageKey(maxClearedStage);
    const baseReward = STAGE_REWARDS[stageKey] ?? { goldPerMin: 5, expPerMin: 2 };
    
    const gold = Math.floor(baseReward.goldPerMin * elapsedMinutes);
    const exp = Math.floor(baseReward.expPerMin * elapsedMinutes);
    
    return {
      gold,
      exp,
      elapsedMinutes,
      maxClearedStage,
    };
  }

  private getHighestStageKey(maxClearedStage: string | null): string {
    if (!maxClearedStage) return '1-1';
    
    // 가장 가까운 스테이지 키 찾기
    const keys = Object.keys(STAGE_REWARDS).sort((a, b) => {
      const [aChap, aStage] = a.split('-').map(Number);
      const [bChap, bStage] = b.split('-').map(Number);
      return (bChap * 100 + bStage) - (aChap * 100 + aStage);
    });
    
    const [maxChap, maxStage] = maxClearedStage.split('-').map(Number);
    const maxValue = maxChap * 100 + maxStage;
    
    for (const key of keys) {
      const [chap, stage] = key.split('-').map(Number);
      if (chap * 100 + stage <= maxValue) {
        return key;
      }
    }
    
    return '1-1';
  }

  /**
   * 보상 수령 처리 (시간 리셋)
   */
  claimReward(maxClearedStage: string | null = null): IdleRewardData {
    const reward = this.calculateReward(maxClearedStage);
    this.updateLastLoginTime();
    return reward;
  }

  /**
   * 경과 시간 포맷팅
   */
  formatIdleTime(): string {
    const minutes = this.getIdleTimeMinutes();
    if (minutes < 60) {
      return `${minutes}분`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
  }

  /**
   * 상태 초기화 (테스트용)
   */
  reset(): void {
    this.state = { lastLoginTime: Date.now(), userId: this.userId };
    localStorage.removeItem(this.storageKey);
  }

  /**
   * 테스트용: 마지막 로그인 시간 강제 설정
   */
  setLastLoginTime(time: number): void {
    this.state.lastLoginTime = time;
    this.save();
  }

  /**
   * 최대 방치 시간 (시간)
   */
  static getMaxIdleHours(): number {
    return MAX_IDLE_HOURS;
  }
}
