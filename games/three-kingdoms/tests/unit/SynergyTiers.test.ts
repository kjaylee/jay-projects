/**
 * 시너지 단계별 보너스 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  getSynergyBonus,
  calculateTieredSynergy,
  FACTION_SYNERGY_TIERS,
  CLASS_SYNERGY_TIERS,
} from '../../src/utils/SynergyCalculator';

describe('SynergyTiers', () => {
  // 테스트용 데이터
  const factions: Record<string, string> = {
    'guan_yu': '촉',
    'zhang_fei': '촉',
    'zhao_yun': '촉',
    'liu_bei': '촉',
    'zhuge_liang': '촉',
    'cao_cao': '위',
    'xiahou_dun': '위',
    'sun_quan': '오',
    'zhou_yu': '오',
  };

  const classes: Record<string, string> = {
    'guan_yu': '무장',
    'zhang_fei': '무장',
    'zhao_yun': '무장',
    'liu_bei': '군주',
    'zhuge_liang': '책사',
    'cao_cao': '군주',
    'xiahou_dun': '무장',
    'sun_quan': '군주',
    'zhou_yu': '책사',
  };

  describe('세력 시너지 단계', () => {
    it('2명 촉: 5% 공격력', () => {
      const units = ['guan_yu', 'zhang_fei'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.attackBonus).toBeCloseTo(0.05);
      expect(result.factionSynergies[0]).toEqual({ faction: '촉', count: 2, bonus: 0.05 });
    });

    it('3명 촉: 10% 공격력', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.attackBonus).toBeCloseTo(0.10);
    });

    it('4명 촉: 15% 공격력', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun', 'liu_bei'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.attackBonus).toBeCloseTo(0.15);
    });

    it('5명 촉: 20% 공격력 + 5% 방어력 (세력) + 10% 방어력 (3무장)', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun', 'liu_bei', 'zhuge_liang'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.attackBonus).toBeCloseTo(0.20);
      // 5명 세력 방어력 5% + 3무장 방어력 10% = 15%
      expect(result.defenseBonus).toBeCloseTo(0.15);
    });

    it('1명만 있으면 세력 시너지 없음', () => {
      const units = ['guan_yu'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.attackBonus).toBe(0);
      expect(result.factionSynergies.length).toBe(0);
    });
  });

  describe('클래스 시너지 단계', () => {
    it('2명 무장: 5% 방어력', () => {
      const units = ['guan_yu', 'zhang_fei'];
      const result = calculateTieredSynergy(units, factions, classes);

      // 세력 시너지 + 클래스 시너지
      expect(result.classSynergies[0]).toEqual({ className: '무장', count: 2, bonus: 0.05 });
    });

    it('3명 무장: 10% 방어력', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.classSynergies.find(s => s.className === '무장')?.bonus).toBeCloseTo(0.10);
    });

    it('4명 무장: 15% 방어력', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun', 'xiahou_dun'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.classSynergies.find(s => s.className === '무장')?.bonus).toBeCloseTo(0.15);
    });
  });

  describe('복합 시너지', () => {
    it('3촉 + 3무장 = 10% 공격 + 10% 방어', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.attackBonus).toBeCloseTo(0.10);  // 3촉
      expect(result.defenseBonus).toBeCloseTo(0.10); // 3무장
    });

    it('다중 세력 시너지 합산', () => {
      const units = ['guan_yu', 'zhang_fei', 'cao_cao', 'xiahou_dun'];
      const result = calculateTieredSynergy(units, factions, classes);

      // 2촉 + 2위 = 5% + 5% = 10%
      expect(result.attackBonus).toBeCloseTo(0.10);
      expect(result.factionSynergies.length).toBe(2);
    });

    it('세력 + 클래스 복합', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun', 'liu_bei', 'zhuge_liang'];
      const result = calculateTieredSynergy(units, factions, classes);

      // 5촉: 20% 공격 + 5% 방어
      // 3무장: 10% 방어
      // 1군주, 1책사: 시너지 없음
      expect(result.attackBonus).toBeCloseTo(0.20);
      expect(result.defenseBonus).toBeCloseTo(0.15); // 5% + 10%
    });
  });

  describe('시너지 상세 정보', () => {
    it('factionSynergies에 상세 정보 포함', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.factionSynergies).toEqual([
        { faction: '촉', count: 3, bonus: 0.10 },
      ]);
    });

    it('classSynergies에 상세 정보 포함', () => {
      const units = ['guan_yu', 'zhang_fei', 'zhao_yun'];
      const result = calculateTieredSynergy(units, factions, classes);

      expect(result.classSynergies).toEqual([
        { className: '무장', count: 3, bonus: 0.10 },
      ]);
    });

    it('빈 진형 시 빈 결과', () => {
      const result = calculateTieredSynergy([], factions, classes);

      expect(result.attackBonus).toBe(0);
      expect(result.defenseBonus).toBe(0);
      expect(result.factionSynergies).toEqual([]);
      expect(result.classSynergies).toEqual([]);
    });
  });
});

describe('getSynergyBonus helper', () => {
  it('0명 → 0%', () => {
    expect(getSynergyBonus(0, FACTION_SYNERGY_TIERS)).toBe(0);
  });

  it('1명 → 0%', () => {
    expect(getSynergyBonus(1, FACTION_SYNERGY_TIERS)).toBe(0);
  });

  it('2명 → 5%', () => {
    expect(getSynergyBonus(2, FACTION_SYNERGY_TIERS)).toBeCloseTo(0.05);
  });

  it('6명 → 5명 단계 보너스 (20%)', () => {
    expect(getSynergyBonus(6, FACTION_SYNERGY_TIERS)).toBeCloseTo(0.20);
  });
});
