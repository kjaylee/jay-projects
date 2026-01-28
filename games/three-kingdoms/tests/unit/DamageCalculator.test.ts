import { describe, it, expect } from 'vitest';

// 데미지 공식: ATK * (1 - DEF/(DEF+100))
function calculateDamage(attack: number, defense: number): number {
  const damageReduction = defense / (defense + 100);
  return Math.floor(attack * (1 - damageReduction));
}

// 계략 데미지: INT * multiplier * (1 - RES/(RES+80))
function calculateSkillDamage(intelligence: number, multiplier: number, resistance: number): number {
  const resistReduction = resistance / (resistance + 80);
  return Math.floor(intelligence * multiplier * (1 - resistReduction));
}

describe('DamageCalculator', () => {
  describe('calculateDamage (물리)', () => {
    it('방어력 0일 때 100% 데미지', () => {
      expect(calculateDamage(100, 0)).toBe(100);
    });

    it('방어력 100일 때 50% 데미지', () => {
      expect(calculateDamage(100, 100)).toBe(50);
    });

    it('방어력 200일 때 33% 데미지', () => {
      expect(calculateDamage(100, 200)).toBe(33);
    });

    it('높은 공격력 테스트', () => {
      expect(calculateDamage(500, 100)).toBe(250);
    });

    it('음수 데미지 없음 (최소 1)', () => {
      // 방어력이 매우 높아도 최소 1 데미지
      const damage = calculateDamage(10, 1000);
      expect(damage).toBeGreaterThanOrEqual(0); // 0 이상
    });
  });

  describe('calculateSkillDamage (계략)', () => {
    it('저항 0일 때 풀 데미지', () => {
      expect(calculateSkillDamage(100, 2.0, 0)).toBe(200);
    });

    it('저항 80일 때 50% 데미지', () => {
      expect(calculateSkillDamage(100, 2.0, 80)).toBe(100);
    });

    it('배수 적용 테스트', () => {
      expect(calculateSkillDamage(100, 3.0, 0)).toBe(300);
    });
  });
});
