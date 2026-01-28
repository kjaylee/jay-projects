/**
 * 천장 카운터 LocalStorage 저장 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GachaManager, GachaPool } from '../../src/managers/GachaManager';

describe('PityStorage', () => {
  const testPool: GachaPool = {
    N: ['n_general_1', 'n_general_2'],
    R: ['r_general_1', 'r_general_2'],
    SR: ['sr_general_1', 'sr_general_2'],
    SSR: ['ssr_general_1'],
    UR: ['ur_general_1'],
  };

  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
    });
  });

  describe('천장 카운터 저장', () => {
    it('userId 설정 시 LocalStorage에서 천장 카운터 로드', () => {
      // 미리 저장된 데이터
      mockStorage['gacha_pity_user123'] = JSON.stringify({ pityCount: 50, lastUpdated: Date.now() });

      const manager = new GachaManager(testPool, 'user123');
      expect(manager.getPityCount()).toBe(50);
    });

    it('뽑기 후 LocalStorage에 천장 카운터 저장', () => {
      const manager = new GachaManager(testPool, 'user456');
      
      manager.pull();
      
      const saved = JSON.parse(mockStorage['gacha_pity_user456']);
      expect(saved.pityCount).toBeGreaterThanOrEqual(0);
      expect(saved.lastUpdated).toBeDefined();
    });

    it('setPityCount() 호출 시 LocalStorage에 저장', () => {
      const manager = new GachaManager(testPool, 'user789');
      
      manager.setPityCount(30);
      
      const saved = JSON.parse(mockStorage['gacha_pity_user789']);
      expect(saved.pityCount).toBe(30);
    });

    it('SSR 획득 시 천장 리셋 후 0으로 저장', () => {
      const manager = new GachaManager(testPool, 'user_ssr');
      manager.setPityCount(79); // 다음 뽑기가 80회차 → SSR 확정

      // 80회차 뽑기 (천장)
      const result = manager.pull();
      expect(result.grade).toBe('SSR');
      
      const saved = JSON.parse(mockStorage['gacha_pity_user_ssr']);
      expect(saved.pityCount).toBe(0);
    });

    it('userId 없이 생성하면 저장 안 함', () => {
      const manager = new GachaManager(testPool);
      
      manager.pull();
      
      expect(Object.keys(mockStorage).length).toBe(0);
    });

    it('setUserId()로 나중에 userId 설정 가능', () => {
      mockStorage['gacha_pity_late_user'] = JSON.stringify({ pityCount: 25, lastUpdated: Date.now() });
      
      const manager = new GachaManager(testPool);
      expect(manager.getPityCount()).toBe(0);
      
      manager.setUserId('late_user');
      expect(manager.getPityCount()).toBe(25);
    });

    it('손상된 LocalStorage 데이터 처리 (graceful fallback)', () => {
      mockStorage['gacha_pity_corrupt'] = 'not valid json';
      
      // 에러 없이 생성되어야 함
      const manager = new GachaManager(testPool, 'corrupt');
      expect(manager.getPityCount()).toBe(0);
    });
  });
});
