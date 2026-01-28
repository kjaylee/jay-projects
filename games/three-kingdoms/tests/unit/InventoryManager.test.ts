import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryManager } from '../../src/managers/InventoryManager';

describe('InventoryManager', () => {
  let manager: InventoryManager;
  const userId = 'test_inventory';

  beforeEach(() => {
    localStorage.clear();
    manager = new InventoryManager(userId);
  });

  describe('초기화', () => {
    it('빈 인벤토리로 시작', () => {
      expect(manager.getItemTypeCount()).toBe(0);
      expect(manager.getAllItems()).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('아이템 추가', () => {
      manager.addItem('iron_sword', 1);
      expect(manager.getItemCount('iron_sword')).toBe(1);
    });

    it('같은 아이템 누적', () => {
      manager.addItem('health_potion', 3);
      manager.addItem('health_potion', 5);
      expect(manager.getItemCount('health_potion')).toBe(8);
    });

    it('0 이하 수량은 무시', () => {
      manager.addItem('sword', 0);
      manager.addItem('shield', -1);
      expect(manager.getItemTypeCount()).toBe(0);
    });

    it('여러 종류 아이템 관리', () => {
      manager.addItem('sword', 1);
      manager.addItem('shield', 2);
      manager.addItem('potion', 5);
      expect(manager.getItemTypeCount()).toBe(3);
    });
  });

  describe('removeItem', () => {
    it('아이템 제거', () => {
      manager.addItem('potion', 10);
      const result = manager.removeItem('potion', 3);
      expect(result).toBe(true);
      expect(manager.getItemCount('potion')).toBe(7);
    });

    it('수량이 0이 되면 목록에서 제거', () => {
      manager.addItem('key', 1);
      manager.removeItem('key', 1);
      expect(manager.getItemCount('key')).toBe(0);
      expect(manager.getItemTypeCount()).toBe(0);
    });

    it('보유 수량 부족 시 실패', () => {
      manager.addItem('gem', 2);
      const result = manager.removeItem('gem', 5);
      expect(result).toBe(false);
      expect(manager.getItemCount('gem')).toBe(2);
    });

    it('미보유 아이템 제거 실패', () => {
      const result = manager.removeItem('nonexistent', 1);
      expect(result).toBe(false);
    });

    it('0 이하 수량 제거 실패', () => {
      manager.addItem('item', 5);
      expect(manager.removeItem('item', 0)).toBe(false);
      expect(manager.removeItem('item', -1)).toBe(false);
    });
  });

  describe('hasItem', () => {
    it('아이템 보유 확인', () => {
      manager.addItem('scroll', 3);
      expect(manager.hasItem('scroll')).toBe(true);
      expect(manager.hasItem('scroll', 3)).toBe(true);
      expect(manager.hasItem('scroll', 4)).toBe(false);
    });

    it('미보유 아이템', () => {
      expect(manager.hasItem('nothing')).toBe(false);
    });
  });

  describe('getAllItems', () => {
    it('전체 아이템 목록 반환', () => {
      manager.addItem('a', 1);
      manager.addItem('b', 2);
      manager.addItem('c', 3);

      const items = manager.getAllItems();
      expect(items.length).toBe(3);
      expect(items.find(i => i.itemId === 'a')?.quantity).toBe(1);
      expect(items.find(i => i.itemId === 'b')?.quantity).toBe(2);
      expect(items.find(i => i.itemId === 'c')?.quantity).toBe(3);
    });
  });

  describe('persistence', () => {
    it('LocalStorage에 저장/로드', () => {
      manager.addItem('persist_item', 42);
      manager.addItem('another_item', 7);

      // 새 인스턴스 생성 (로드 테스트)
      const newManager = new InventoryManager(userId);
      expect(newManager.getItemCount('persist_item')).toBe(42);
      expect(newManager.getItemCount('another_item')).toBe(7);
    });
  });

  describe('reset', () => {
    it('인벤토리 초기화', () => {
      manager.addItem('item1', 5);
      manager.addItem('item2', 10);
      manager.reset();

      expect(manager.getItemTypeCount()).toBe(0);
      expect(manager.getAllItems()).toEqual([]);
    });
  });
});
