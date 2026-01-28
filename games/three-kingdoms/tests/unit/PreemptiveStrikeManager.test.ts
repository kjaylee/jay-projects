import { describe, it, expect, beforeEach } from 'vitest';
import { PreemptiveStrikeManager, PreemptiveStrikeConfig } from '../../src/managers/PreemptiveStrikeManager';

describe('PreemptiveStrikeManager', () => {
  let manager: PreemptiveStrikeManager;
  const defaultConfig: PreemptiveStrikeConfig = {
    damageMultiplier: 2.0,  // 첫 턴 2배 데미지
    duration: 1,            // 1턴 지속
  };

  beforeEach(() => {
    manager = new PreemptiveStrikeManager(defaultConfig);
  });

  describe('기본 기능', () => {
    it('생성 시 기본 설정이 적용된다', () => {
      expect(manager.getConfig()).toEqual(defaultConfig);
    });

    it('유닛에 선제 기습 효과를 부여할 수 있다', () => {
      manager.applyPreemptiveStrike('unit-1');
      expect(manager.hasPreemptiveStrike('unit-1')).toBe(true);
    });

    it('효과가 없는 유닛은 false를 반환한다', () => {
      expect(manager.hasPreemptiveStrike('unit-1')).toBe(false);
    });
  });

  describe('데미지 배율', () => {
    it('선제 기습 효과가 있으면 데미지 배율을 반환한다', () => {
      manager.applyPreemptiveStrike('unit-1');
      expect(manager.getDamageMultiplier('unit-1')).toBe(2.0);
    });

    it('선제 기습 효과가 없으면 배율 1.0을 반환한다', () => {
      expect(manager.getDamageMultiplier('unit-1')).toBe(1.0);
    });

    it('커스텀 배율 설정이 가능하다', () => {
      const customManager = new PreemptiveStrikeManager({
        damageMultiplier: 1.5,
        duration: 1,
      });
      customManager.applyPreemptiveStrike('unit-1');
      expect(customManager.getDamageMultiplier('unit-1')).toBe(1.5);
    });
  });

  describe('턴 관리', () => {
    it('턴 종료 시 효과가 감소한다', () => {
      manager.applyPreemptiveStrike('unit-1');
      manager.onTurnEnd('unit-1');
      expect(manager.hasPreemptiveStrike('unit-1')).toBe(false);
    });

    it('여러 턴 지속 설정 시 점진적으로 감소한다', () => {
      const multiTurnManager = new PreemptiveStrikeManager({
        damageMultiplier: 2.0,
        duration: 3,
      });
      multiTurnManager.applyPreemptiveStrike('unit-1');
      
      expect(multiTurnManager.getRemainingTurns('unit-1')).toBe(3);
      
      multiTurnManager.onTurnEnd('unit-1');
      expect(multiTurnManager.getRemainingTurns('unit-1')).toBe(2);
      
      multiTurnManager.onTurnEnd('unit-1');
      expect(multiTurnManager.getRemainingTurns('unit-1')).toBe(1);
      
      multiTurnManager.onTurnEnd('unit-1');
      expect(multiTurnManager.hasPreemptiveStrike('unit-1')).toBe(false);
    });

    it('효과 없는 유닛의 onTurnEnd는 안전하게 무시된다', () => {
      expect(() => manager.onTurnEnd('non-existent')).not.toThrow();
    });
  });

  describe('복수 유닛 관리', () => {
    it('여러 유닛에 동시에 효과를 부여할 수 있다', () => {
      manager.applyPreemptiveStrike('unit-1');
      manager.applyPreemptiveStrike('unit-2');
      manager.applyPreemptiveStrike('unit-3');

      expect(manager.hasPreemptiveStrike('unit-1')).toBe(true);
      expect(manager.hasPreemptiveStrike('unit-2')).toBe(true);
      expect(manager.hasPreemptiveStrike('unit-3')).toBe(true);
    });

    it('전체 리셋이 가능하다', () => {
      manager.applyPreemptiveStrike('unit-1');
      manager.applyPreemptiveStrike('unit-2');
      
      manager.resetAll();
      
      expect(manager.hasPreemptiveStrike('unit-1')).toBe(false);
      expect(manager.hasPreemptiveStrike('unit-2')).toBe(false);
    });

    it('선제 기습 효과가 있는 유닛 목록을 가져올 수 있다', () => {
      manager.applyPreemptiveStrike('unit-1');
      manager.applyPreemptiveStrike('unit-3');
      
      const units = manager.getUnitsWithEffect();
      expect(units).toHaveLength(2);
      expect(units).toContain('unit-1');
      expect(units).toContain('unit-3');
    });
  });

  describe('전투 시작 시 자동 부여', () => {
    it('매복 스킬 보유 유닛에게 전투 시작 시 효과를 부여한다', () => {
      const unitsWithAmbush = ['unit-1', 'unit-3'];
      manager.applyOnBattleStart(unitsWithAmbush);
      
      expect(manager.hasPreemptiveStrike('unit-1')).toBe(true);
      expect(manager.hasPreemptiveStrike('unit-2')).toBe(false);
      expect(manager.hasPreemptiveStrike('unit-3')).toBe(true);
    });
  });

  describe('효과 제거', () => {
    it('특정 유닛의 효과를 개별 제거할 수 있다', () => {
      manager.applyPreemptiveStrike('unit-1');
      manager.applyPreemptiveStrike('unit-2');
      
      manager.removeEffect('unit-1');
      
      expect(manager.hasPreemptiveStrike('unit-1')).toBe(false);
      expect(manager.hasPreemptiveStrike('unit-2')).toBe(true);
    });
  });

  describe('스킬 연동', () => {
    it('매복(ambush) 스킬 ID를 확인할 수 있다', () => {
      expect(PreemptiveStrikeManager.AMBUSH_SKILL_ID).toBe('ambush');
    });

    it('스킬이 매복 스킬인지 확인할 수 있다', () => {
      expect(PreemptiveStrikeManager.isAmbushSkill('ambush')).toBe(true);
      expect(PreemptiveStrikeManager.isAmbushSkill('fire-attack')).toBe(false);
    });
  });
});
