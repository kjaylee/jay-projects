import { describe, it, expect } from 'vitest';
import { Formation, Position } from '../../src/entities/Formation';

describe('Formation', () => {
  describe('생성', () => {
    it('빈 진형 생성 (3x3)', () => {
      const formation = new Formation('user-1');
      
      expect(formation.userId).toBe('user-1');
      expect(formation.getSize()).toBe(9);
      expect(formation.getUnitCount()).toBe(0);
    });

    it('기존 배치로 생성', () => {
      const positions: Position[] = [
        { row: 0, col: 1, generalId: 'guan-yu' },
        { row: 1, col: 1, generalId: 'zhang-fei' },
      ];
      const formation = new Formation('user-1', positions);
      
      expect(formation.getUnitCount()).toBe(2);
    });
  });

  describe('유닛 배치', () => {
    it('유닛 배치 성공', () => {
      const formation = new Formation('user-1');
      
      const result = formation.placeUnit('guan-yu', 0, 1);
      expect(result).toBe(true);
      expect(formation.getUnitAt(0, 1)).toBe('guan-yu');
    });

    it('같은 위치 중복 배치 불가', () => {
      const formation = new Formation('user-1');
      
      formation.placeUnit('guan-yu', 0, 1);
      const result = formation.placeUnit('zhang-fei', 0, 1);
      
      expect(result).toBe(false);
      expect(formation.getUnitAt(0, 1)).toBe('guan-yu');
    });

    it('범위 밖 배치 불가', () => {
      const formation = new Formation('user-1');
      
      expect(formation.placeUnit('test', -1, 0)).toBe(false);
      expect(formation.placeUnit('test', 3, 0)).toBe(false);
      expect(formation.placeUnit('test', 0, 3)).toBe(false);
    });

    it('같은 장수 중복 배치 불가', () => {
      const formation = new Formation('user-1');
      
      formation.placeUnit('guan-yu', 0, 0);
      const result = formation.placeUnit('guan-yu', 1, 1);
      
      expect(result).toBe(false);
    });
  });

  describe('유닛 제거', () => {
    it('유닛 제거 성공', () => {
      const formation = new Formation('user-1');
      formation.placeUnit('guan-yu', 0, 1);
      
      const removed = formation.removeUnit(0, 1);
      expect(removed).toBe('guan-yu');
      expect(formation.getUnitAt(0, 1)).toBeNull();
    });

    it('빈 위치 제거 시 null', () => {
      const formation = new Formation('user-1');
      
      const removed = formation.removeUnit(0, 0);
      expect(removed).toBeNull();
    });
  });

  describe('유닛 이동', () => {
    it('빈 위치로 이동 성공', () => {
      const formation = new Formation('user-1');
      formation.placeUnit('guan-yu', 0, 0);
      
      const result = formation.moveUnit(0, 0, 1, 1);
      expect(result).toBe(true);
      expect(formation.getUnitAt(0, 0)).toBeNull();
      expect(formation.getUnitAt(1, 1)).toBe('guan-yu');
    });

    it('점유된 위치로 이동 시 스왑', () => {
      const formation = new Formation('user-1');
      formation.placeUnit('guan-yu', 0, 0);
      formation.placeUnit('zhang-fei', 1, 1);
      
      const result = formation.moveUnit(0, 0, 1, 1);
      expect(result).toBe(true);
      expect(formation.getUnitAt(0, 0)).toBe('zhang-fei');
      expect(formation.getUnitAt(1, 1)).toBe('guan-yu');
    });
  });

  describe('진형 조회', () => {
    it('전열 조회 (row 0)', () => {
      const formation = new Formation('user-1');
      formation.placeUnit('a', 0, 0);
      formation.placeUnit('b', 0, 1);
      formation.placeUnit('c', 0, 2);
      
      const frontRow = formation.getRow(0);
      expect(frontRow).toHaveLength(3);
      expect(frontRow).toContain('a');
      expect(frontRow).toContain('b');
      expect(frontRow).toContain('c');
    });

    it('종렬 조회 (column)', () => {
      const formation = new Formation('user-1');
      formation.placeUnit('a', 0, 1);
      formation.placeUnit('b', 1, 1);
      formation.placeUnit('c', 2, 1);
      
      const centerCol = formation.getColumn(1);
      expect(centerCol).toHaveLength(3);
    });

    it('모든 유닛 조회', () => {
      const formation = new Formation('user-1');
      formation.placeUnit('guan-yu', 0, 1);
      formation.placeUnit('zhang-fei', 1, 0);
      formation.placeUnit('zhao-yun', 1, 2);
      
      const all = formation.getAllUnits();
      expect(all).toHaveLength(3);
    });
  });

  describe('최대 유닛 수', () => {
    it('최대 9명 배치 가능', () => {
      const formation = new Formation('user-1');
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          formation.placeUnit(`unit-${row}-${col}`, row, col);
        }
      }
      
      expect(formation.getUnitCount()).toBe(9);
      expect(formation.isFull()).toBe(true);
    });
  });

  describe('진형 검증', () => {
    it('빈 진형은 유효하지 않음', () => {
      const formation = new Formation('user-1');
      expect(formation.isValid()).toBe(false);
    });

    it('최소 1명 이상이면 유효', () => {
      const formation = new Formation('user-1');
      formation.placeUnit('guan-yu', 1, 1);
      expect(formation.isValid()).toBe(true);
    });
  });

  describe('시너지 계산', () => {
    it('같은 세력 2명 → 공격력 +5%', () => {
      const formation = new Formation('user-1');
      
      const factions = { 'guan-yu': 'shu', 'zhang-fei': 'shu' };
      formation.placeUnit('guan-yu', 0, 0);
      formation.placeUnit('zhang-fei', 0, 1);
      
      const synergy = formation.calculateSynergy(factions);
      expect(synergy.attackBonus).toBe(0.05);
      expect(synergy.details).toHaveLength(1);
      expect(synergy.details[0].count).toBe(2);
    });

    it('같은 세력 3명 → 공격력 +12%', () => {
      const formation = new Formation('user-1');
      
      const factions = { 'guan-yu': 'shu', 'zhang-fei': 'shu', 'zhao-yun': 'shu' };
      formation.placeUnit('guan-yu', 0, 0);
      formation.placeUnit('zhang-fei', 0, 1);
      formation.placeUnit('zhao-yun', 0, 2);
      
      const synergy = formation.calculateSynergy(factions);
      expect(synergy.attackBonus).toBe(0.12);
    });

    it('같은 세력 5명 → 공격력 +30%', () => {
      const formation = new Formation('user-1');
      
      const factions = { 'a': 'shu', 'b': 'shu', 'c': 'shu', 'd': 'shu', 'e': 'shu' };
      formation.placeUnit('a', 0, 0);
      formation.placeUnit('b', 0, 1);
      formation.placeUnit('c', 0, 2);
      formation.placeUnit('d', 1, 0);
      formation.placeUnit('e', 1, 1);
      
      const synergy = formation.calculateSynergy(factions);
      expect(synergy.attackBonus).toBe(0.30);
    });

    it('같은 클래스 3명 → 클래스 보너스', () => {
      const formation = new Formation('user-1');
      
      const classes = { 'a': 'warrior', 'b': 'warrior', 'c': 'warrior' };
      formation.placeUnit('a', 0, 0);
      formation.placeUnit('b', 0, 1);
      formation.placeUnit('c', 0, 2);
      
      const synergy = formation.calculateSynergy({}, classes);
      expect(synergy.classBonus).toBe(0.15); // warrior 3명 = 15%
    });

    it('방패병 3명 → 방어력 +20%', () => {
      const formation = new Formation('user-1');
      
      const classes = { 'a': 'shield', 'b': 'shield', 'c': 'shield' };
      formation.placeUnit('a', 0, 0);
      formation.placeUnit('b', 0, 1);
      formation.placeUnit('c', 0, 2);
      
      const synergy = formation.calculateSynergy({}, classes);
      expect(synergy.defenseBonus).toBe(0.20);
    });

    it('혼합 시너지 (세력 + 클래스)', () => {
      const formation = new Formation('user-1');
      
      const factions = { 'a': 'shu', 'b': 'shu', 'c': 'wei' };
      const classes = { 'a': 'warrior', 'b': 'warrior', 'c': 'warrior' };
      
      formation.placeUnit('a', 0, 0);
      formation.placeUnit('b', 0, 1);
      formation.placeUnit('c', 0, 2);
      
      const synergy = formation.calculateSynergy(factions, classes);
      // shu 2명 = 5%, warrior 3명 = 15%
      expect(synergy.factionBonus).toBe(0.05);
      expect(synergy.classBonus).toBe(0.15);
      expect(synergy.details).toHaveLength(2);
    });
  });

  describe('직렬화', () => {
    it('JSON 변환', () => {
      const formation = new Formation('user-1');
      formation.placeUnit('guan-yu', 0, 1);
      formation.placeUnit('zhang-fei', 1, 1);
      
      const json = formation.toJSON();
      expect(json.userId).toBe('user-1');
      expect(json.positions).toHaveLength(2);
    });

    it('JSON에서 복원', () => {
      const json = {
        userId: 'user-1',
        positions: [
          { row: 0, col: 1, generalId: 'guan-yu' },
          { row: 1, col: 1, generalId: 'zhang-fei' },
        ],
      };
      
      const formation = Formation.fromJSON(json);
      expect(formation.getUnitAt(0, 1)).toBe('guan-yu');
      expect(formation.getUnitAt(1, 1)).toBe('zhang-fei');
    });
  });
});
