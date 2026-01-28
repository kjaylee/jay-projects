import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OwnedGeneralsManager, getDuplicateShards, GeneralGrade } from '../../src/managers/OwnedGeneralsManager';

describe('OwnedGeneralsManager', () => {
  let manager: OwnedGeneralsManager;
  const userId = 'test_owned_generals';

  beforeEach(() => {
    localStorage.clear();
    manager = new OwnedGeneralsManager(userId);
  });

  describe('초기화', () => {
    it('빈 상태로 시작', () => {
      expect(manager.getOwnedCount()).toBe(0);
    });
  });

  describe('acquireGeneral', () => {
    it('신규 장수 획득', () => {
      const result = manager.acquireGeneral('guan_yu', 'SR');
      
      expect(result.isDuplicate).toBe(false);
      expect(result.shardsGained).toBe(0);
      expect(manager.hasGeneral('guan_yu')).toBe(true);
    });

    it('중복 장수 획득 시 조각 변환', () => {
      manager.acquireGeneral('guan_yu', 'SR');
      const result = manager.acquireGeneral('guan_yu', 'SR');
      
      expect(result.isDuplicate).toBe(true);
      expect(result.shardsGained).toBe(20); // SR = 20 조각
      expect(result.totalShards).toBe(20);
    });

    it('연속 중복 획득 시 조각 누적', () => {
      manager.acquireGeneral('lu_bu', 'UR');
      manager.acquireGeneral('lu_bu', 'UR');
      const result = manager.acquireGeneral('lu_bu', 'UR');
      
      expect(result.totalShards).toBe(200); // 100 * 2
    });
  });

  describe('등급별 조각 수', () => {
    it('N등급 = 1조각', () => {
      manager.acquireGeneral('soldier', 'N');
      const result = manager.acquireGeneral('soldier', 'N');
      expect(result.shardsGained).toBe(1);
    });

    it('R등급 = 5조각', () => {
      manager.acquireGeneral('general_r', 'R');
      const result = manager.acquireGeneral('general_r', 'R');
      expect(result.shardsGained).toBe(5);
    });

    it('SR등급 = 20조각', () => {
      manager.acquireGeneral('general_sr', 'SR');
      const result = manager.acquireGeneral('general_sr', 'SR');
      expect(result.shardsGained).toBe(20);
    });

    it('SSR등급 = 50조각', () => {
      manager.acquireGeneral('general_ssr', 'SSR');
      const result = manager.acquireGeneral('general_ssr', 'SSR');
      expect(result.shardsGained).toBe(50);
    });

    it('UR등급 = 100조각', () => {
      manager.acquireGeneral('general_ur', 'UR');
      const result = manager.acquireGeneral('general_ur', 'UR');
      expect(result.shardsGained).toBe(100);
    });
  });

  describe('getGeneral', () => {
    it('보유 장수 조회', () => {
      manager.acquireGeneral('zhao_yun', 'SR');
      
      const general = manager.getGeneral('zhao_yun');
      expect(general).not.toBeNull();
      expect(general?.generalId).toBe('zhao_yun');
      expect(general?.grade).toBe('SR');
    });

    it('미보유 장수 조회 시 null', () => {
      expect(manager.getGeneral('not_owned')).toBeNull();
    });
  });

  describe('getAllGenerals', () => {
    it('모든 보유 장수 반환', () => {
      manager.acquireGeneral('a', 'N');
      manager.acquireGeneral('b', 'R');
      manager.acquireGeneral('c', 'SR');
      
      const all = manager.getAllGenerals();
      expect(all.length).toBe(3);
    });
  });

  describe('조각 관리', () => {
    it('addShards - 조각 추가', () => {
      manager.acquireGeneral('test', 'SR');
      manager.addShards('test', 50);
      
      expect(manager.getShards('test')).toBe(50);
    });

    it('useShards - 조각 사용', () => {
      manager.acquireGeneral('test', 'SR');
      manager.addShards('test', 100);
      
      const result = manager.useShards('test', 30);
      expect(result).toBe(true);
      expect(manager.getShards('test')).toBe(70);
    });

    it('useShards - 조각 부족 시 실패', () => {
      manager.acquireGeneral('test', 'SR');
      manager.addShards('test', 10);
      
      const result = manager.useShards('test', 50);
      expect(result).toBe(false);
      expect(manager.getShards('test')).toBe(10);
    });
  });

  describe('getOwnedCountByGrade', () => {
    it('등급별 보유 수 반환', () => {
      manager.acquireGeneral('a', 'N');
      manager.acquireGeneral('b', 'N');
      manager.acquireGeneral('c', 'R');
      manager.acquireGeneral('d', 'SSR');
      
      const counts = manager.getOwnedCountByGrade();
      expect(counts.N).toBe(2);
      expect(counts.R).toBe(1);
      expect(counts.SR).toBe(0);
      expect(counts.SSR).toBe(1);
      expect(counts.UR).toBe(0);
    });
  });

  describe('persistence', () => {
    it('LocalStorage에 저장/로드', () => {
      manager.acquireGeneral('persist_test', 'SR');
      manager.acquireGeneral('persist_test', 'SR'); // 중복
      
      const newManager = new OwnedGeneralsManager(userId);
      expect(newManager.hasGeneral('persist_test')).toBe(true);
      expect(newManager.getShards('persist_test')).toBe(20);
    });
  });
});

describe('getDuplicateShards', () => {
  it('등급별 조각 수 반환', () => {
    expect(getDuplicateShards('N')).toBe(1);
    expect(getDuplicateShards('R')).toBe(5);
    expect(getDuplicateShards('SR')).toBe(20);
    expect(getDuplicateShards('SSR')).toBe(50);
    expect(getDuplicateShards('UR')).toBe(100);
  });
});
