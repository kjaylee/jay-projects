import { describe, it, expect } from 'vitest';
import { DamageCalculator } from '../../src/utils/DamageCalculator';

interface Unit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

function sortBySpeed(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => b.speed - a.speed);
}

function applyDamage(target: Unit, damage: number): Unit {
  return {
    ...target,
    hp: Math.max(0, target.hp - damage),
  };
}

function isUnitAlive(unit: Unit): boolean {
  return unit.hp > 0;
}

function calculateDamage(attacker: Unit, defender: Unit): number {
  return DamageCalculator.calculatePhysicalDamage(attacker.attack, defender.defense);
}

describe('BattleSystem', () => {
  const unit1: Unit = { id: '1', name: '관우', hp: 1000, maxHp: 1000, attack: 150, defense: 80, speed: 70 };
  const unit2: Unit = { id: '2', name: '장비', hp: 800, maxHp: 800, attack: 180, defense: 60, speed: 65 };
  const unit3: Unit = { id: '3', name: '조운', hp: 900, maxHp: 900, attack: 160, defense: 70, speed: 80 };

  describe('sortBySpeed', () => {
    it('속도 순으로 정렬', () => {
      const sorted = sortBySpeed([unit1, unit2, unit3]);
      expect(sorted[0].name).toBe('조운'); // speed 80
      expect(sorted[1].name).toBe('관우'); // speed 70
      expect(sorted[2].name).toBe('장비'); // speed 65
    });
  });

  describe('applyDamage', () => {
    it('데미지 적용', () => {
      const damaged = applyDamage(unit1, 200);
      expect(damaged.hp).toBe(800);
    });

    it('HP 0 이하로 안 내려감', () => {
      const damaged = applyDamage(unit1, 9999);
      expect(damaged.hp).toBe(0);
    });

    it('원본 유닛 불변', () => {
      applyDamage(unit1, 200);
      expect(unit1.hp).toBe(1000);
    });
  });

  describe('isUnitAlive', () => {
    it('HP > 0 → 생존', () => {
      expect(isUnitAlive(unit1)).toBe(true);
    });

    it('HP = 0 → 사망', () => {
      const dead = { ...unit1, hp: 0 };
      expect(isUnitAlive(dead)).toBe(false);
    });
  });

  describe('calculateDamage', () => {
    it('관우 → 장비 데미지 계산', () => {
      const damage = calculateDamage(unit1, unit2);
      // 150 * (1 - 60/160) = 150 * 0.625 = 93.75 → 93
      expect(damage).toBe(93);
    });

    it('장비 → 관우 데미지 계산', () => {
      const damage = calculateDamage(unit2, unit1);
      // 180 * (1 - 80/180) = 180 * 0.555 = 100
      expect(damage).toBe(100);
    });
  });
});
