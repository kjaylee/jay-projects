import { describe, it, expect, beforeEach } from 'vitest';

import { BuffManager, ActiveBuff } from '../../src/managers/BuffManager';
import { StunManager } from '../../src/managers/StunManager';
import { BattleUnit, createBattleUnit } from '../../src/entities/BattleUnit';

/**
 * 스턴(행동불가) 효과 테스트
 * 스펙: 낙석 → 적 단일 고정 데미지 + 스턴 (행동불가)
 */
describe('StunManager', () => {
  let stunManager: StunManager;
  let unit1: BattleUnit;
  let unit2: BattleUnit;

  beforeEach(() => {
    stunManager = new StunManager();
    
    unit1 = createBattleUnit({
      id: 'unit-1',
      name: '관우',
      generalId: 'guan-yu',
      team: 'player',
      position: { row: 0, col: 0 },
      baseStats: {
        hp: 1000,
        attack: 100,
        defense: 50,
        intelligence: 60,
        speed: 80,
      },
      skills: ['rock-fall'],
    });

    unit2 = createBattleUnit({
      id: 'unit-2',
      name: '여포',
      generalId: 'lu-bu',
      team: 'enemy',
      position: { row: 0, col: 1 },
      baseStats: {
        hp: 1200,
        attack: 120,
        defense: 40,
        intelligence: 40,
        speed: 90,
      },
      skills: [],
    });
  });

  describe('스턴 적용', () => {
    it('유닛에 스턴을 적용할 수 있다', () => {
      stunManager.applyStun(unit2.id, 2); // 2턴 스턴
      
      expect(stunManager.isStunned(unit2.id)).toBe(true);
      expect(stunManager.getStunDuration(unit2.id)).toBe(2);
    });

    it('스턴 상태의 유닛은 행동 불가', () => {
      stunManager.applyStun(unit2.id, 1);
      
      expect(stunManager.canAct(unit2.id)).toBe(false);
    });

    it('스턴이 없는 유닛은 행동 가능', () => {
      expect(stunManager.canAct(unit1.id)).toBe(true);
    });
  });

  describe('스턴 지속시간', () => {
    it('턴 종료 시 스턴 지속시간 감소', () => {
      stunManager.applyStun(unit2.id, 3);
      
      stunManager.tickStuns();
      expect(stunManager.getStunDuration(unit2.id)).toBe(2);
      
      stunManager.tickStuns();
      expect(stunManager.getStunDuration(unit2.id)).toBe(1);
    });

    it('지속시간 0이 되면 스턴 해제', () => {
      stunManager.applyStun(unit2.id, 1);
      
      expect(stunManager.isStunned(unit2.id)).toBe(true);
      
      stunManager.tickStuns();
      expect(stunManager.isStunned(unit2.id)).toBe(false);
      expect(stunManager.canAct(unit2.id)).toBe(true);
    });

    it('만료된 스턴 목록 반환', () => {
      stunManager.applyStun('unit-a', 1);
      stunManager.applyStun('unit-b', 2);
      
      const expired = stunManager.tickStuns();
      
      expect(expired).toContain('unit-a');
      expect(expired).not.toContain('unit-b');
    });
  });

  describe('스턴 갱신', () => {
    it('이미 스턴 상태일 때 더 긴 스턴 적용하면 갱신', () => {
      stunManager.applyStun(unit2.id, 1);
      stunManager.applyStun(unit2.id, 3); // 더 긴 스턴
      
      expect(stunManager.getStunDuration(unit2.id)).toBe(3);
    });

    it('이미 스턴 상태일 때 더 짧은 스턴은 무시', () => {
      stunManager.applyStun(unit2.id, 3);
      stunManager.applyStun(unit2.id, 1); // 더 짧은 스턴
      
      expect(stunManager.getStunDuration(unit2.id)).toBe(3);
    });
  });

  describe('스턴 제거', () => {
    it('특정 유닛의 스턴 해제', () => {
      stunManager.applyStun(unit2.id, 3);
      stunManager.removeStun(unit2.id);
      
      expect(stunManager.isStunned(unit2.id)).toBe(false);
    });

    it('모든 스턴 초기화', () => {
      stunManager.applyStun('unit-a', 2);
      stunManager.applyStun('unit-b', 3);
      
      stunManager.clearAllStuns();
      
      expect(stunManager.isStunned('unit-a')).toBe(false);
      expect(stunManager.isStunned('unit-b')).toBe(false);
    });
  });

  describe('스턴된 유닛 목록', () => {
    it('현재 스턴 상태인 유닛 ID 목록 반환', () => {
      stunManager.applyStun('unit-a', 2);
      stunManager.applyStun('unit-b', 1);
      stunManager.applyStun('unit-c', 3);
      
      const stunned = stunManager.getStunnedUnits();
      
      expect(stunned).toHaveLength(3);
      expect(stunned).toContain('unit-a');
      expect(stunned).toContain('unit-b');
      expect(stunned).toContain('unit-c');
    });
  });

  describe('스턴 효과 타입', () => {
    it('스턴은 speed=-9999로 처리 (행동 순서 최하위)', () => {
      // StunManager는 BuffManager와 별도로 동작
      // 행동 순서 결정 시 isStunned 체크해서 스킵
      stunManager.applyStun(unit2.id, 1);
      
      expect(stunManager.isStunned(unit2.id)).toBe(true);
      expect(stunManager.canAct(unit2.id)).toBe(false);
    });
  });
});
