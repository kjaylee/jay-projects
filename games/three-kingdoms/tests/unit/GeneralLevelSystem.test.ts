import { describe, it, expect, beforeEach } from 'vitest';
import { OwnedGeneralsManager } from '../../src/managers/OwnedGeneralsManager';

describe('장수 레벨/경험치 시스템', () => {
  let manager: OwnedGeneralsManager;
  const userId = 'test_level_system';

  beforeEach(() => {
    localStorage.clear();
    manager = new OwnedGeneralsManager(userId);
  });

  describe('getGeneralLevel', () => {
    it('신규 장수는 레벨 1', () => {
      manager.acquireGeneral('guan_yu', 'SR');
      expect(manager.getGeneralLevel('guan_yu')).toBe(1);
    });

    it('미보유 장수는 레벨 1 반환', () => {
      expect(manager.getGeneralLevel('nonexistent')).toBe(1);
    });
  });

  describe('getGeneralExp', () => {
    it('신규 장수는 경험치 0', () => {
      manager.acquireGeneral('zhao_yun', 'SR');
      expect(manager.getGeneralExp('zhao_yun')).toBe(0);
    });

    it('미보유 장수는 경험치 0 반환', () => {
      expect(manager.getGeneralExp('nonexistent')).toBe(0);
    });
  });

  describe('getExpToNextLevel', () => {
    it('레벨 1→2: 100 EXP', () => {
      expect(OwnedGeneralsManager.getExpToNextLevel(1)).toBe(100);
    });

    it('레벨 2→3: 150 EXP', () => {
      expect(OwnedGeneralsManager.getExpToNextLevel(2)).toBe(150);
    });

    it('레벨 5→6: 300 EXP', () => {
      expect(OwnedGeneralsManager.getExpToNextLevel(5)).toBe(300);
    });

    it('레벨 10→11: 550 EXP', () => {
      expect(OwnedGeneralsManager.getExpToNextLevel(10)).toBe(550);
    });
  });

  describe('addExp', () => {
    it('경험치 추가 (레벨업 안 됨)', () => {
      manager.acquireGeneral('guan_yu', 'SR');
      const result = manager.addExp('guan_yu', 50);

      expect(result.leveled).toBe(false);
      expect(result.newLevel).toBe(1);
      expect(result.expGained).toBe(50);
      expect(manager.getGeneralExp('guan_yu')).toBe(50);
    });

    it('경험치 추가로 레벨업 (100 EXP = 레벨2)', () => {
      manager.acquireGeneral('guan_yu', 'SR');
      const result = manager.addExp('guan_yu', 100);

      expect(result.leveled).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(manager.getGeneralLevel('guan_yu')).toBe(2);
      expect(manager.getGeneralExp('guan_yu')).toBe(0); // 정확히 100이면 잔여 0
    });

    it('여유 경험치로 레벨업', () => {
      manager.acquireGeneral('zhao_yun', 'SR');
      const result = manager.addExp('zhao_yun', 120);

      expect(result.leveled).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(manager.getGeneralExp('zhao_yun')).toBe(20); // 120 - 100 = 20
    });

    it('다중 레벨업 (250 EXP: Lv1→Lv3)', () => {
      manager.acquireGeneral('liu_bei', 'SSR');
      // Lv1→Lv2: 100, Lv2→Lv3: 150, total: 250
      const result = manager.addExp('liu_bei', 250);

      expect(result.leveled).toBe(true);
      expect(result.newLevel).toBe(3);
      expect(manager.getGeneralExp('liu_bei')).toBe(0); // 250 - 100 - 150 = 0
    });

    it('대량 경험치로 여러 레벨 상승', () => {
      manager.acquireGeneral('lu_bu', 'UR');
      // Lv1→2: 100, Lv2→3: 150, Lv3→4: 200, total: 450
      const result = manager.addExp('lu_bu', 460);

      expect(result.leveled).toBe(true);
      expect(result.newLevel).toBe(4);
      expect(manager.getGeneralExp('lu_bu')).toBe(10); // 460 - 100 - 150 - 200 = 10
    });

    it('미보유 장수에게 경험치 추가 실패', () => {
      const result = manager.addExp('nonexistent', 100);
      expect(result.leveled).toBe(false);
      expect(result.newLevel).toBe(1);
    });

    it('0 이하 경험치 무시', () => {
      manager.acquireGeneral('test', 'N');
      const result = manager.addExp('test', 0);
      expect(result.leveled).toBe(false);
      expect(result.expGained).toBe(0);
    });

    it('경험치/레벨이 LocalStorage에 저장됨', () => {
      manager.acquireGeneral('persist_general', 'R');
      manager.addExp('persist_general', 150);

      const newManager = new OwnedGeneralsManager(userId);
      expect(newManager.getGeneralLevel('persist_general')).toBe(2);
      expect(newManager.getGeneralExp('persist_general')).toBe(50); // 150 - 100 = 50
    });
  });

  describe('하위 호환성', () => {
    it('level/exp 필드가 없는 기존 데이터 로드', () => {
      // 기존 형식 데이터를 직접 저장
      const legacyData = [{
        generalId: 'old_general',
        grade: 'SR',
        acquiredAt: Date.now(),
        shards: 10,
        // level, exp 필드 없음
      }];
      localStorage.setItem(`owned_generals_${userId}`, JSON.stringify(legacyData));

      const newManager = new OwnedGeneralsManager(userId);
      expect(newManager.hasGeneral('old_general')).toBe(true);
      expect(newManager.getGeneralLevel('old_general')).toBe(1);
      expect(newManager.getGeneralExp('old_general')).toBe(0);
    });
  });
});
