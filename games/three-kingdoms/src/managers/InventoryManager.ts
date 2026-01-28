/**
 * InventoryManager - 아이템 인벤토리 관리
 * - 아이템 추가/제거/조회
 * - LocalStorage 영속성
 */

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

const STORAGE_KEY_PREFIX = 'inventory_';

export class InventoryManager {
  private userId: string;
  private items: Map<string, number>;
  private storageKey: string;

  constructor(userId: string) {
    this.userId = userId;
    this.storageKey = STORAGE_KEY_PREFIX + userId;
    this.items = new Map();
    this.load();
  }

  private load(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved) as InventoryItem[];
        data.forEach(item => this.items.set(item.itemId, item.quantity));
      }
    } catch (e) {
      console.error('Failed to load inventory:', e);
    }
  }

  private save(): void {
    try {
      const data = this.getAllItems();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save inventory:', e);
    }
  }

  /**
   * 아이템 추가
   * @param itemId 아이템 ID
   * @param quantity 수량 (양수)
   */
  addItem(itemId: string, quantity: number): void {
    if (quantity <= 0) return;
    const current = this.items.get(itemId) ?? 0;
    this.items.set(itemId, current + quantity);
    this.save();
    console.log(`📦 인벤토리 추가: ${itemId} x${quantity} (보유: ${current + quantity})`);
  }

  /**
   * 아이템 제거
   * @returns 성공 여부
   */
  removeItem(itemId: string, quantity: number): boolean {
    if (quantity <= 0) return false;
    const current = this.items.get(itemId) ?? 0;
    if (current < quantity) return false;

    const remaining = current - quantity;
    if (remaining === 0) {
      this.items.delete(itemId);
    } else {
      this.items.set(itemId, remaining);
    }
    this.save();
    return true;
  }

  /**
   * 아이템 보유 수량 조회
   */
  getItemCount(itemId: string): number {
    return this.items.get(itemId) ?? 0;
  }

  /**
   * 아이템 보유 여부
   */
  hasItem(itemId: string, quantity: number = 1): boolean {
    return this.getItemCount(itemId) >= quantity;
  }

  /**
   * 전체 아이템 목록
   */
  getAllItems(): InventoryItem[] {
    return Array.from(this.items.entries()).map(([itemId, quantity]) => ({
      itemId,
      quantity,
    }));
  }

  /**
   * 전체 아이템 종류 수
   */
  getItemTypeCount(): number {
    return this.items.size;
  }

  /**
   * 인벤토리 초기화 (테스트용)
   */
  reset(): void {
    this.items.clear();
    localStorage.removeItem(this.storageKey);
  }
}
