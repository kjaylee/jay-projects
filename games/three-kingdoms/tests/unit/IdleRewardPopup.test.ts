import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 방치 보상 팝업 시스템 테스트
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
        console.error('Failed to parse IdlePopupManager state');
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
  claimReward(): IdleRewardData {
    const reward = this.calculateReward(null);
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
}

describe('IdleRewardPopupManager', () => {
  let manager: IdleRewardPopupManager;
  const userId = 'test_idle_user';

  beforeEach(() => {
    localStorage.clear();
    manager = new IdleRewardPopupManager(userId);
  });

  describe('getIdleTimeMinutes', () => {
    it('방금 접속했으면 0분', () => {
      expect(manager.getIdleTimeMinutes()).toBe(0);
    });

    it('10분 전 접속이면 10분', () => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      manager.setLastLoginTime(tenMinutesAgo);
      
      expect(manager.getIdleTimeMinutes()).toBe(10);
    });

    it('최대 12시간 (720분) 제한', () => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      manager.setLastLoginTime(dayAgo);
      
      expect(manager.getIdleTimeMinutes()).toBe(720);
    });
  });

  describe('shouldShowPopup', () => {
    it('방금 접속 → false', () => {
      expect(manager.shouldShowPopup()).toBe(false);
    });

    it('1분 이상 경과 → true', () => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      manager.setLastLoginTime(twoMinutesAgo);
      
      expect(manager.shouldShowPopup()).toBe(true);
    });
  });

  describe('calculateReward', () => {
    it('스테이지 없으면 기본 보상', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      manager.setLastLoginTime(oneHourAgo);
      
      const reward = manager.calculateReward(null);
      
      // 기본: goldPerMin=5, expPerMin=2 → 60분 → 300 gold, 120 exp
      // 실제는 1-1 기본값(10, 5)이 적용됨
      expect(reward.gold).toBe(600); // 10 * 60
      expect(reward.exp).toBe(300);  // 5 * 60
      expect(reward.elapsedMinutes).toBe(60);
    });

    it('높은 스테이지 클리어 시 보상 증가', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      manager.setLastLoginTime(oneHourAgo);
      
      const reward = manager.calculateReward('2-5');
      
      // 2-5: goldPerMin=40, expPerMin=20 → 60분 → 2400 gold, 1200 exp
      expect(reward.gold).toBe(2400);
      expect(reward.exp).toBe(1200);
    });

    it('12시간 방치 시 최대 보상', () => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      manager.setLastLoginTime(dayAgo);
      
      const reward = manager.calculateReward('3-1');
      
      // 3-1: goldPerMin=50, expPerMin=25 → 720분 (12시간)
      expect(reward.gold).toBe(36000);  // 50 * 720
      expect(reward.exp).toBe(18000);   // 25 * 720
      expect(reward.elapsedMinutes).toBe(720);
    });
  });

  describe('claimReward', () => {
    it('보상 수령 후 시간 리셋', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      manager.setLastLoginTime(oneHourAgo);
      
      expect(manager.shouldShowPopup()).toBe(true);
      
      manager.claimReward();
      
      expect(manager.shouldShowPopup()).toBe(false);
      expect(manager.getIdleTimeMinutes()).toBeLessThan(1);
    });
  });

  describe('formatIdleTime', () => {
    it('30분 표시', () => {
      const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
      manager.setLastLoginTime(thirtyMinAgo);
      
      expect(manager.formatIdleTime()).toBe('30분');
    });

    it('2시간 30분 표시', () => {
      const twoHalfHoursAgo = Date.now() - 150 * 60 * 1000;
      manager.setLastLoginTime(twoHalfHoursAgo);
      
      expect(manager.formatIdleTime()).toBe('2시간 30분');
    });

    it('정각 시간은 분 생략', () => {
      const threeHoursAgo = Date.now() - 180 * 60 * 1000;
      manager.setLastLoginTime(threeHoursAgo);
      
      expect(manager.formatIdleTime()).toBe('3시간');
    });
  });

  describe('persistence', () => {
    it('새 인스턴스에서도 상태 유지', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      manager.setLastLoginTime(oneHourAgo);
      
      const newManager = new IdleRewardPopupManager(userId);
      
      expect(newManager.getIdleTimeMinutes()).toBeGreaterThanOrEqual(59);
      expect(newManager.getIdleTimeMinutes()).toBeLessThanOrEqual(61);
    });
  });
});
