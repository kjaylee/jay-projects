import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 가챠 재화 연동 테스트
 * - 단차: 보석 16개 소모
 * - 10연차: 보석 160개 소모
 * - 보석 부족 시 실패
 * - GameManager와 연동
 */

export const SINGLE_COST = 16;
export const MULTI_COST = 160;

export interface GachaResourceState {
  gems: number;
  userId: string;
}

const STORAGE_KEY_PREFIX = 'gachaResource_';

export class GachaResourceManager {
  private userId: string;
  private storageKey: string;
  private gems: number;

  constructor(userId: string, initialGems: number = 100) {
    this.userId = userId;
    this.storageKey = STORAGE_KEY_PREFIX + userId;
    
    const saved = this.load();
    this.gems = saved?.gems ?? initialGems;
  }

  private load(): GachaResourceState | null {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }

  private save(): void {
    localStorage.setItem(this.storageKey, JSON.stringify({
      gems: this.gems,
      userId: this.userId,
    }));
  }

  /**
   * 현재 보석 수
   */
  getGems(): number {
    return this.gems;
  }

  /**
   * 단차 가능 여부
   */
  canPullSingle(): boolean {
    return this.gems >= SINGLE_COST;
  }

  /**
   * 10연차 가능 여부
   */
  canPullMulti(): boolean {
    return this.gems >= MULTI_COST;
  }

  /**
   * 단차 비용 소모
   * @returns 성공 여부
   */
  spendSingleCost(): boolean {
    if (!this.canPullSingle()) {
      return false;
    }
    this.gems -= SINGLE_COST;
    this.save();
    return true;
  }

  /**
   * 10연차 비용 소모
   * @returns 성공 여부
   */
  spendMultiCost(): boolean {
    if (!this.canPullMulti()) {
      return false;
    }
    this.gems -= MULTI_COST;
    this.save();
    return true;
  }

  /**
   * 보석 추가 (상점 구매, 보상 등)
   */
  addGems(amount: number): void {
    if (amount <= 0) return;
    this.gems += amount;
    this.save();
  }

  /**
   * 보석 설정 (테스트/관리용)
   */
  setGems(amount: number): void {
    this.gems = Math.max(0, amount);
    this.save();
  }

  /**
   * 상태 초기화 (테스트용)
   */
  reset(initialGems: number = 100): void {
    this.gems = initialGems;
    localStorage.removeItem(this.storageKey);
  }
}

describe('GachaResourceManager', () => {
  let manager: GachaResourceManager;
  const userId = 'test_gacha_resource';

  beforeEach(() => {
    localStorage.clear();
    manager = new GachaResourceManager(userId, 100);
  });

  describe('getGems', () => {
    it('초기 보석 수 확인', () => {
      expect(manager.getGems()).toBe(100);
    });
  });

  describe('canPullSingle', () => {
    it('16개 이상이면 가능', () => {
      expect(manager.canPullSingle()).toBe(true);
    });

    it('15개 이하면 불가능', () => {
      manager.setGems(15);
      expect(manager.canPullSingle()).toBe(false);
    });

    it('정확히 16개면 가능', () => {
      manager.setGems(16);
      expect(manager.canPullSingle()).toBe(true);
    });
  });

  describe('canPullMulti', () => {
    it('160개 이상이면 가능', () => {
      manager.setGems(200);
      expect(manager.canPullMulti()).toBe(true);
    });

    it('159개 이하면 불가능', () => {
      manager.setGems(159);
      expect(manager.canPullMulti()).toBe(false);
    });
  });

  describe('spendSingleCost', () => {
    it('성공 시 16개 차감', () => {
      const result = manager.spendSingleCost();
      
      expect(result).toBe(true);
      expect(manager.getGems()).toBe(84);
    });

    it('보석 부족 시 실패', () => {
      manager.setGems(10);
      const result = manager.spendSingleCost();
      
      expect(result).toBe(false);
      expect(manager.getGems()).toBe(10);
    });

    it('연속 뽑기 가능 (충분한 보석)', () => {
      manager.setGems(50);
      
      expect(manager.spendSingleCost()).toBe(true);  // 50 → 34
      expect(manager.spendSingleCost()).toBe(true);  // 34 → 18
      expect(manager.spendSingleCost()).toBe(true);  // 18 → 2
      expect(manager.spendSingleCost()).toBe(false); // 2 < 16
      
      expect(manager.getGems()).toBe(2);
    });
  });

  describe('spendMultiCost', () => {
    it('성공 시 160개 차감', () => {
      manager.setGems(200);
      const result = manager.spendMultiCost();
      
      expect(result).toBe(true);
      expect(manager.getGems()).toBe(40);
    });

    it('보석 부족 시 실패', () => {
      const result = manager.spendMultiCost();
      
      expect(result).toBe(false);
      expect(manager.getGems()).toBe(100);
    });
  });

  describe('addGems', () => {
    it('보석 추가', () => {
      manager.addGems(50);
      expect(manager.getGems()).toBe(150);
    });

    it('음수나 0은 무시', () => {
      manager.addGems(0);
      expect(manager.getGems()).toBe(100);
      
      manager.addGems(-10);
      expect(manager.getGems()).toBe(100);
    });
  });

  describe('persistence', () => {
    it('LocalStorage에 저장됨', () => {
      manager.spendSingleCost();
      
      const newManager = new GachaResourceManager(userId);
      expect(newManager.getGems()).toBe(84);
    });

    it('다른 유저와 독립적', () => {
      manager.setGems(50);
      
      const otherManager = new GachaResourceManager('other_user', 100);
      expect(otherManager.getGems()).toBe(100);
    });
  });
});

describe('Cost Constants', () => {
  it('단차 비용은 16', () => {
    expect(SINGLE_COST).toBe(16);
  });

  it('10연차 비용은 160', () => {
    expect(MULTI_COST).toBe(160);
  });
});
