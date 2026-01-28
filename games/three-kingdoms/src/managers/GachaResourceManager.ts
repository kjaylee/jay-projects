/**
 * 가챠 재화 관리자
 * - 보석 소모/확인 로직
 * - LocalStorage 저장
 */

export const GACHA_SINGLE_COST = 16;
export const GACHA_MULTI_COST = 160;

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
    return this.gems >= GACHA_SINGLE_COST;
  }

  /**
   * 10연차 가능 여부
   */
  canPullMulti(): boolean {
    return this.gems >= GACHA_MULTI_COST;
  }

  /**
   * 단차 비용 소모
   * @returns 성공 여부
   */
  spendSingleCost(): boolean {
    if (!this.canPullSingle()) {
      return false;
    }
    this.gems -= GACHA_SINGLE_COST;
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
    this.gems -= GACHA_MULTI_COST;
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

  /**
   * 비용 상수
   */
  static getSingleCost(): number {
    return GACHA_SINGLE_COST;
  }

  static getMultiCost(): number {
    return GACHA_MULTI_COST;
  }
}
