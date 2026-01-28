import { describe, it, expect, beforeEach } from 'vitest';
import { SkillLevelManager, SkillLevelConfig, SkillUpgradeResult } from '../../src/managers/SkillLevelManager';

describe('SkillLevelManager', () => {
  let manager: SkillLevelManager;
  const defaultConfig: SkillLevelConfig = {
    maxLevel: 10,
    baseCost: { gold: 1000, skillBooks: 1 },
    costMultiplier: 1.5, // 레벨당 비용 증가 배율
    effectIncreasePercent: 10, // 레벨당 효과 10% 증가
  };

  beforeEach(() => {
    manager = new SkillLevelManager(defaultConfig);
  });

  describe('기본 기능', () => {
    it('생성 시 기본 설정이 적용된다', () => {
      expect(manager.getConfig()).toEqual(defaultConfig);
    });

    it('스킬의 현재 레벨을 조회할 수 있다', () => {
      expect(manager.getSkillLevel('skill-1')).toBe(1); // 기본 레벨 1
    });

    it('스킬 레벨을 설정할 수 있다', () => {
      manager.setSkillLevel('skill-1', 5);
      expect(manager.getSkillLevel('skill-1')).toBe(5);
    });
  });

  describe('레벨업 비용 계산', () => {
    it('레벨 1→2 업그레이드 비용을 계산한다', () => {
      const cost = manager.getUpgradeCost('skill-1');
      expect(cost).toEqual({ gold: 1000, skillBooks: 1 });
    });

    it('레벨 2→3 업그레이드 비용은 배율이 적용된다', () => {
      manager.setSkillLevel('skill-1', 2);
      const cost = manager.getUpgradeCost('skill-1');
      expect(cost.gold).toBe(Math.floor(1000 * 1.5)); // 1500
      expect(cost.skillBooks).toBe(Math.floor(1 * 1.5) || 1); // 최소 1
    });

    it('레벨 5→6 업그레이드 비용 계산', () => {
      manager.setSkillLevel('skill-1', 5);
      const cost = manager.getUpgradeCost('skill-1');
      // 1000 * 1.5^4 = 5062.5 → 5062
      expect(cost.gold).toBe(Math.floor(1000 * Math.pow(1.5, 4)));
    });

    it('최대 레벨에서는 업그레이드 비용이 null이다', () => {
      manager.setSkillLevel('skill-1', 10);
      const cost = manager.getUpgradeCost('skill-1');
      expect(cost).toBeNull();
    });
  });

  describe('스킬 효과 배율', () => {
    it('레벨 1에서 효과 배율은 1.0이다', () => {
      expect(manager.getEffectMultiplier('skill-1')).toBe(1.0);
    });

    it('레벨 5에서 효과 배율은 1.4이다 (10% × 4 추가)', () => {
      manager.setSkillLevel('skill-1', 5);
      expect(manager.getEffectMultiplier('skill-1')).toBeCloseTo(1.4, 2);
    });

    it('레벨 10에서 효과 배율은 1.9이다', () => {
      manager.setSkillLevel('skill-1', 10);
      expect(manager.getEffectMultiplier('skill-1')).toBeCloseTo(1.9, 2);
    });
  });

  describe('스킬 레벨업', () => {
    it('충분한 재료가 있으면 레벨업 성공', () => {
      const resources = { gold: 5000, skillBooks: 10 };
      const result = manager.upgradeSkill('skill-1', resources);

      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(result.remainingResources?.gold).toBe(4000);
      expect(result.remainingResources?.skillBooks).toBe(9);
    });

    it('재료 부족 시 레벨업 실패', () => {
      const resources = { gold: 500, skillBooks: 0 };
      const result = manager.upgradeSkill('skill-1', resources);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficient_resources');
    });

    it('최대 레벨에서 레벨업 시도 시 실패', () => {
      manager.setSkillLevel('skill-1', 10);
      const resources = { gold: 100000, skillBooks: 100 };
      const result = manager.upgradeSkill('skill-1', resources);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('max_level_reached');
    });

    it('연속 레벨업이 가능하다', () => {
      let resources = { gold: 10000, skillBooks: 20 };
      
      // 1→2
      let result = manager.upgradeSkill('skill-1', resources);
      expect(result.success).toBe(true);
      resources = result.remainingResources!;

      // 2→3
      result = manager.upgradeSkill('skill-1', resources);
      expect(result.success).toBe(true);
      expect(manager.getSkillLevel('skill-1')).toBe(3);
    });
  });

  describe('레벨업 가능 여부 확인', () => {
    it('레벨업 가능 시 true 반환', () => {
      const resources = { gold: 5000, skillBooks: 10 };
      expect(manager.canUpgrade('skill-1', resources)).toBe(true);
    });

    it('재료 부족 시 false 반환', () => {
      const resources = { gold: 100, skillBooks: 0 };
      expect(manager.canUpgrade('skill-1', resources)).toBe(false);
    });

    it('최대 레벨 시 false 반환', () => {
      manager.setSkillLevel('skill-1', 10);
      const resources = { gold: 100000, skillBooks: 100 };
      expect(manager.canUpgrade('skill-1', resources)).toBe(false);
    });
  });

  describe('다중 스킬 관리', () => {
    it('여러 스킬의 레벨을 독립적으로 관리', () => {
      manager.setSkillLevel('skill-1', 5);
      manager.setSkillLevel('skill-2', 3);
      manager.setSkillLevel('skill-3', 8);

      expect(manager.getSkillLevel('skill-1')).toBe(5);
      expect(manager.getSkillLevel('skill-2')).toBe(3);
      expect(manager.getSkillLevel('skill-3')).toBe(8);
    });

    it('모든 스킬 레벨을 리셋할 수 있다', () => {
      manager.setSkillLevel('skill-1', 5);
      manager.setSkillLevel('skill-2', 3);
      
      manager.resetAll();
      
      expect(manager.getSkillLevel('skill-1')).toBe(1);
      expect(manager.getSkillLevel('skill-2')).toBe(1);
    });
  });

  describe('저장/로드', () => {
    it('스킬 레벨 데이터를 JSON으로 내보낼 수 있다', () => {
      manager.setSkillLevel('skill-1', 5);
      manager.setSkillLevel('skill-2', 3);
      
      const data = manager.toJSON();
      expect(data).toEqual({
        'skill-1': 5,
        'skill-2': 3,
      });
    });

    it('JSON에서 스킬 레벨을 복원할 수 있다', () => {
      const data = { 'skill-1': 7, 'skill-2': 4 };
      manager.fromJSON(data);
      
      expect(manager.getSkillLevel('skill-1')).toBe(7);
      expect(manager.getSkillLevel('skill-2')).toBe(4);
    });
  });

  describe('장수별 스킬 레벨 관리', () => {
    it('장수 ID와 스킬 ID를 조합하여 고유 키 생성', () => {
      const key = SkillLevelManager.createSkillKey('general-1', 'fire-attack');
      expect(key).toBe('general-1:fire-attack');
    });

    it('장수별로 같은 스킬도 독립적으로 레벨 관리', () => {
      const key1 = SkillLevelManager.createSkillKey('general-1', 'fire-attack');
      const key2 = SkillLevelManager.createSkillKey('general-2', 'fire-attack');
      
      manager.setSkillLevel(key1, 5);
      manager.setSkillLevel(key2, 3);
      
      expect(manager.getSkillLevel(key1)).toBe(5);
      expect(manager.getSkillLevel(key2)).toBe(3);
    });
  });
});
