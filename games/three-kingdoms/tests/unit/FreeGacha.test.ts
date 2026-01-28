import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 일일 무료 가챠 시스템 테스트
 * - 하루에 1회만 무료 뽑기 가능
 * - LocalStorage에 lastFreeGachaDate 저장
 * - 자정 지나면 리셋
 */

// 날짜 문자열 생성 (YYYY-MM-DD)
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// FreeGachaManager 클래스 (구현 예정)
interface FreeGachaState {
  lastFreeDate: string | null;
  userId: string;
}

class FreeGachaManager {
  private userId: string;
  private storageKey: string;
  private state: FreeGachaState;

  constructor(userId: string) {
    this.userId = userId;
    this.storageKey = `freeGacha_${userId}`;
    this.state = this.load();
  }

  private load(): FreeGachaState {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
    return { lastFreeDate: null, userId: this.userId };
  }

  private save(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  /**
   * 오늘 무료 가챠를 사용할 수 있는지 확인
   */
  canUseFreeGacha(): boolean {
    if (!this.state.lastFreeDate) {
      return true;
    }
    const today = getDateString(new Date());
    return this.state.lastFreeDate !== today;
  }

  /**
   * 무료 가챠 사용 처리
   * @returns 성공 여부
   */
  useFreeGacha(): boolean {
    if (!this.canUseFreeGacha()) {
      return false;
    }
    this.state.lastFreeDate = getDateString(new Date());
    this.save();
    return true;
  }

  /**
   * 다음 무료 가챠까지 남은 시간 (밀리초)
   */
  getTimeUntilReset(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  /**
   * 마지막 무료 가챠 사용 날짜
   */
  getLastFreeDate(): string | null {
    return this.state.lastFreeDate;
  }

  /**
   * 상태 초기화 (테스트용)
   */
  reset(): void {
    this.state = { lastFreeDate: null, userId: this.userId };
    localStorage.removeItem(this.storageKey);
  }
}

describe('FreeGachaManager', () => {
  let manager: FreeGachaManager;
  const userId = 'test_user_123';

  beforeEach(() => {
    localStorage.clear();
    manager = new FreeGachaManager(userId);
  });

  describe('canUseFreeGacha', () => {
    it('첫 사용자는 무료 가챠 가능', () => {
      expect(manager.canUseFreeGacha()).toBe(true);
    });

    it('오늘 사용했으면 불가능', () => {
      manager.useFreeGacha();
      expect(manager.canUseFreeGacha()).toBe(false);
    });

    it('어제 사용했으면 오늘 가능', () => {
      // 어제 날짜로 저장
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getDateString(yesterday);
      
      localStorage.setItem(`freeGacha_${userId}`, JSON.stringify({
        lastFreeDate: yesterdayStr,
        userId,
      }));
      
      const newManager = new FreeGachaManager(userId);
      expect(newManager.canUseFreeGacha()).toBe(true);
    });
  });

  describe('useFreeGacha', () => {
    it('성공 시 true 반환하고 날짜 기록', () => {
      const result = manager.useFreeGacha();
      
      expect(result).toBe(true);
      expect(manager.getLastFreeDate()).toBe(getDateString(new Date()));
    });

    it('이미 사용했으면 false 반환', () => {
      manager.useFreeGacha();
      const result = manager.useFreeGacha();
      
      expect(result).toBe(false);
    });

    it('LocalStorage에 저장됨', () => {
      manager.useFreeGacha();
      
      const saved = localStorage.getItem(`freeGacha_${userId}`);
      expect(saved).not.toBeNull();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.lastFreeDate).toBe(getDateString(new Date()));
    });
  });

  describe('getTimeUntilReset', () => {
    it('자정까지 남은 시간 반환', () => {
      const time = manager.getTimeUntilReset();
      
      // 최대 24시간
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });
  });

  describe('reset', () => {
    it('상태 초기화', () => {
      manager.useFreeGacha();
      expect(manager.canUseFreeGacha()).toBe(false);
      
      manager.reset();
      expect(manager.canUseFreeGacha()).toBe(true);
    });
  });

  describe('persistence', () => {
    it('새 인스턴스에서도 상태 유지', () => {
      manager.useFreeGacha();
      
      const newManager = new FreeGachaManager(userId);
      expect(newManager.canUseFreeGacha()).toBe(false);
      expect(newManager.getLastFreeDate()).toBe(getDateString(new Date()));
    });
  });
});

// FreeGachaManager를 export
export { FreeGachaManager, getDateString };
