import { describe, it, expect } from 'vitest';
import { Equipment, EquipmentSlot, EquipmentGrade } from '../../src/entities/Equipment';

describe('Equipment', () => {
  describe('생성', () => {
    it('무기 장비 생성', () => {
      const weapon = new Equipment({
        id: 'green-dragon-blade',
        name: '청룡언월도',
        slot: 'weapon',
        grade: 'legendary',
        stats: { attack: 50, speed: 10 },
      });

      expect(weapon.id).toBe('green-dragon-blade');
      expect(weapon.name).toBe('청룡언월도');
      expect(weapon.slot).toBe('weapon');
      expect(weapon.grade).toBe('legendary');
      expect(weapon.stats.attack).toBe(50);
    });

    it('방어구 장비 생성', () => {
      const armor = new Equipment({
        id: 'iron-armor',
        name: '철갑옷',
        slot: 'armor',
        grade: 'rare',
        stats: { defense: 40, hp: 200 },
      });

      expect(armor.slot).toBe('armor');
      expect(armor.stats.defense).toBe(40);
      expect(armor.stats.hp).toBe(200);
    });

    it('악세서리 장비 생성', () => {
      const accessory = new Equipment({
        id: 'jade-pendant',
        name: '옥패',
        slot: 'accessory',
        grade: 'epic',
        stats: { intelligence: 25, politics: 20 },
      });

      expect(accessory.slot).toBe('accessory');
    });
  });

  describe('등급', () => {
    it('common 등급 (흰색)', () => {
      const item = new Equipment({
        id: 'wood-sword',
        name: '목검',
        slot: 'weapon',
        grade: 'common',
        stats: { attack: 5 },
      });
      expect(item.getColor()).toBe('#ffffff');
    });

    it('rare 등급 (파란색)', () => {
      const item = new Equipment({
        id: 'steel-sword',
        name: '강철검',
        slot: 'weapon',
        grade: 'rare',
        stats: { attack: 20 },
      });
      expect(item.getColor()).toBe('#0088ff');
    });

    it('epic 등급 (보라색)', () => {
      const item = new Equipment({
        id: 'magic-sword',
        name: '마검',
        slot: 'weapon',
        grade: 'epic',
        stats: { attack: 35 },
      });
      expect(item.getColor()).toBe('#9933ff');
    });

    it('legendary 등급 (주황색)', () => {
      const item = new Equipment({
        id: 'legendary-blade',
        name: '전설의 검',
        slot: 'weapon',
        grade: 'legendary',
        stats: { attack: 50 },
      });
      expect(item.getColor()).toBe('#ff8800');
    });
  });

  describe('스탯 보너스', () => {
    it('기본 스탯 제공', () => {
      const weapon = new Equipment({
        id: 'sword',
        name: '검',
        slot: 'weapon',
        grade: 'rare',
        stats: { attack: 30, speed: 5 },
      });

      const bonus = weapon.getStatBonus();
      expect(bonus.attack).toBe(30);
      expect(bonus.speed).toBe(5);
      expect(bonus.defense).toBe(0);
    });

    it('강화 시 스탯 증가 (+5% per level)', () => {
      const weapon = new Equipment({
        id: 'sword',
        name: '검',
        slot: 'weapon',
        grade: 'rare',
        stats: { attack: 100 },
        enhanceLevel: 10,
      });

      const bonus = weapon.getStatBonus();
      // 100 * (1 + 10 * 0.05) = 100 * 1.5 = 150
      expect(bonus.attack).toBe(150);
    });
  });

  describe('강화', () => {
    it('강화 레벨 증가', () => {
      const weapon = new Equipment({
        id: 'sword',
        name: '검',
        slot: 'weapon',
        grade: 'rare',
        stats: { attack: 30 },
      });

      expect(weapon.enhanceLevel).toBe(0);
      weapon.enhance();
      expect(weapon.enhanceLevel).toBe(1);
    });

    it('최대 강화 레벨 제한 (15)', () => {
      const weapon = new Equipment({
        id: 'sword',
        name: '검',
        slot: 'weapon',
        grade: 'rare',
        stats: { attack: 30 },
        enhanceLevel: 15,
      });

      weapon.enhance();
      expect(weapon.enhanceLevel).toBe(15);
    });

    it('강화 비용 계산', () => {
      const weapon = new Equipment({
        id: 'sword',
        name: '검',
        slot: 'weapon',
        grade: 'rare',
        stats: { attack: 30 },
        enhanceLevel: 5,
      });

      // 비용 = 1000 * (level + 1) * gradeMultiplier
      // rare = 2, level 5 → 1000 * 6 * 2 = 12000
      expect(weapon.getEnhanceCost()).toBe(12000);
    });
  });

  describe('슬롯 검증', () => {
    it('무기 슬롯', () => {
      const weapon = new Equipment({
        id: 'sword',
        name: '검',
        slot: 'weapon',
        grade: 'common',
        stats: { attack: 10 },
      });
      expect(weapon.canEquipTo('weapon')).toBe(true);
      expect(weapon.canEquipTo('armor')).toBe(false);
    });

    it('방어구 슬롯', () => {
      const armor = new Equipment({
        id: 'armor',
        name: '갑옷',
        slot: 'armor',
        grade: 'common',
        stats: { defense: 10 },
      });
      expect(armor.canEquipTo('armor')).toBe(true);
      expect(armor.canEquipTo('weapon')).toBe(false);
    });
  });
});
