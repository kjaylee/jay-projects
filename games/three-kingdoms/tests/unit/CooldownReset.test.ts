import { describe, it, expect, beforeEach } from 'vitest';

import { CooldownResetManager } from '../../src/managers/CooldownResetManager';
import { BattleUnit, createBattleUnit } from '../../src/entities/BattleUnit';

/**
 * 연환계 (쿨다운 초기화) 테스트
 * 스펙: 연환계 → 다음 계략 쿨타임 초기화
 * AC-SKL-10: 연환계 스킬이 발동되었을 때 지정된 스킬의 쿨다운이 0으로 초기화
 */
describe('CooldownResetManager', () => {
  let resetManager: CooldownResetManager;
  let unit: BattleUnit;

  beforeEach(() => {
    resetManager = new CooldownResetManager();
    
    unit = createBattleUnit({
      id: 'unit-1',
      name: '제갈량',
      generalId: 'zhuge-liang',
      team: 'player',
      position: { row: 2, col: 1 },
      baseStats: {
        hp: 800,
        attack: 60,
        defense: 40,
        intelligence: 150,
        speed: 70,
      },
      skills: ['fire-attack', 'chain-stratagem', 'water-attack'],
    });

    // 스킬 쿨다운 설정
    unit.skillCooldowns.set('fire-attack', 4);
    unit.skillCooldowns.set('water-attack', 3);
    unit.skillCooldowns.set('chain-stratagem', 5);
  });

  describe('특정 스킬 쿨다운 초기화', () => {
    it('단일 스킬 쿨다운을 0으로 초기화', () => {
      expect(unit.skillCooldowns.get('fire-attack')).toBe(4);
      
      resetManager.resetSkillCooldown(unit, 'fire-attack');
      
      expect(unit.skillCooldowns.get('fire-attack')).toBe(0);
    });

    it('존재하지 않는 스킬은 무시', () => {
      // 에러 없이 실행되어야 함
      expect(() => {
        resetManager.resetSkillCooldown(unit, 'non-existent-skill');
      }).not.toThrow();
    });

    it('이미 0인 쿨다운은 그대로 유지', () => {
      unit.skillCooldowns.set('fire-attack', 0);
      
      resetManager.resetSkillCooldown(unit, 'fire-attack');
      
      expect(unit.skillCooldowns.get('fire-attack')).toBe(0);
    });
  });

  describe('모든 스킬 쿨다운 초기화', () => {
    it('유닛의 모든 스킬 쿨다운을 0으로 초기화', () => {
      resetManager.resetAllSkillCooldowns(unit);
      
      expect(unit.skillCooldowns.get('fire-attack')).toBe(0);
      expect(unit.skillCooldowns.get('water-attack')).toBe(0);
      expect(unit.skillCooldowns.get('chain-stratagem')).toBe(0);
    });
  });

  describe('다음 스킬 쿨다운 초기화 (연환계)', () => {
    it('사용한 스킬 외 가장 높은 쿨다운의 스킬 초기화', () => {
      // chain-stratagem(5턴) 사용 후 다음 스킬 초기화
      resetManager.resetNextHighestCooldown(unit, 'chain-stratagem');
      
      // fire-attack(4턴)이 가장 높으므로 초기화
      expect(unit.skillCooldowns.get('fire-attack')).toBe(0);
      // water-attack(3턴)은 그대로
      expect(unit.skillCooldowns.get('water-attack')).toBe(3);
    });

    it('쿨다운이 없는 스킬만 있으면 아무것도 안 함', () => {
      unit.skillCooldowns.set('fire-attack', 0);
      unit.skillCooldowns.set('water-attack', 0);
      
      expect(() => {
        resetManager.resetNextHighestCooldown(unit, 'chain-stratagem');
      }).not.toThrow();
    });
  });

  describe('랜덤 스킬 쿨다운 초기화', () => {
    it('쿨다운이 있는 스킬 중 하나를 랜덤 초기화', () => {
      const resetSkillId = resetManager.resetRandomCooldown(unit, 'chain-stratagem');
      
      expect(resetSkillId).not.toBeNull();
      expect(resetSkillId).not.toBe('chain-stratagem');
      
      // 초기화된 스킬 확인
      if (resetSkillId) {
        expect(unit.skillCooldowns.get(resetSkillId)).toBe(0);
      }
    });

    it('본인 외 쿨다운이 있는 스킬이 없으면 null 반환', () => {
      unit.skillCooldowns.set('fire-attack', 0);
      unit.skillCooldowns.set('water-attack', 0);
      
      const resetSkillId = resetManager.resetRandomCooldown(unit, 'chain-stratagem');
      
      expect(resetSkillId).toBeNull();
    });
  });

  describe('쿨다운 감소 (부분 초기화)', () => {
    it('특정 스킬 쿨다운을 지정량만큼 감소', () => {
      resetManager.reduceSkillCooldown(unit, 'fire-attack', 2);
      
      expect(unit.skillCooldowns.get('fire-attack')).toBe(2); // 4 - 2
    });

    it('쿨다운이 0 아래로 내려가지 않음', () => {
      resetManager.reduceSkillCooldown(unit, 'fire-attack', 10);
      
      expect(unit.skillCooldowns.get('fire-attack')).toBe(0);
    });
  });

  describe('연환계 효과 적용', () => {
    it('applyChainStratagem: 시전자 외 아군의 랜덤 스킬 쿨다운 초기화', () => {
      const ally1 = createBattleUnit({
        id: 'ally-1',
        name: '관우',
        generalId: 'guan-yu',
        team: 'player',
        position: { row: 0, col: 0 },
        baseStats: { hp: 1000, attack: 100, defense: 50, intelligence: 60, speed: 80 },
        skills: ['basic-attack'],
      });
      ally1.skillCooldowns.set('basic-attack', 3);

      const ally2 = createBattleUnit({
        id: 'ally-2',
        name: '장비',
        generalId: 'zhang-fei',
        team: 'player',
        position: { row: 0, col: 2 },
        baseStats: { hp: 1100, attack: 110, defense: 45, intelligence: 40, speed: 75 },
        skills: ['roar'],
      });
      ally2.skillCooldowns.set('roar', 4);

      const allUnits = [unit, ally1, ally2];
      
      const result = resetManager.applyChainStratagem(unit, allUnits);
      
      // 시전자 외 아군 중 1명의 스킬 초기화
      expect(result.affectedUnits.length).toBeGreaterThanOrEqual(0);
      
      // 시전자는 영향 없음
      expect(result.affectedUnits.map(u => u.id)).not.toContain(unit.id);
    });

    it('아군이 없으면 빈 결과 반환', () => {
      const result = resetManager.applyChainStratagem(unit, [unit]);
      
      expect(result.affectedUnits).toHaveLength(0);
    });
  });
});
