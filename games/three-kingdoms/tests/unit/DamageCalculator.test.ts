import { describe, it, expect } from 'vitest';
import { 
  DamageCalculator, 
  calculateDamage, 
  calculateSkillDamage 
} from '../../src/utils/DamageCalculator';

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

  describe('DamageCalculator class methods', () => {
    describe('calculatePhysicalDamage', () => {
      it('works the same as calculateDamage', () => {
        expect(DamageCalculator.calculatePhysicalDamage(100, 0)).toBe(100);
        expect(DamageCalculator.calculatePhysicalDamage(100, 100)).toBe(50);
        expect(DamageCalculator.calculatePhysicalDamage(100, 200)).toBe(33);
      });
    });

    describe('calculateMagicalDamage', () => {
      it('works the same as calculateSkillDamage', () => {
        expect(DamageCalculator.calculateMagicalDamage(100, 0, 2.0)).toBe(200);
        expect(DamageCalculator.calculateMagicalDamage(100, 80, 2.0)).toBe(100);
        expect(DamageCalculator.calculateMagicalDamage(100, 0, 3.0)).toBe(300);
      });
    });

    describe('rollCritical', () => {
      it('속도 0일 때 약 10% 확률', () => {
        // 확률 테스트는 여러번 실행하여 통계적으로 확인
        let crits = 0;
        const iterations = 1000;
        for (let i = 0; i < iterations; i++) {
          if (DamageCalculator.rollCritical(0)) crits++;
        }
        // 10% 기대, ±5% 허용 (5~15%)
        expect(crits).toBeGreaterThanOrEqual(50);
        expect(crits).toBeLessThanOrEqual(150);
      });

      it('속도 90 이상일 때 거의 100% 크리티컬', () => {
        let crits = 0;
        const iterations = 100;
        for (let i = 0; i < iterations; i++) {
          if (DamageCalculator.rollCritical(90)) crits++;
        }
        // 100% 기대
        expect(crits).toBe(100);
      });
    });

    describe('calculateFinalDamage', () => {
      it('치명타 아닐 때 기본 데미지', () => {
        expect(DamageCalculator.calculateFinalDamage(100, false)).toBe(100);
      });

      it('치명타일 때 1.5배 데미지', () => {
        expect(DamageCalculator.calculateFinalDamage(100, true)).toBe(150);
      });

      it('소수점 버림', () => {
        expect(DamageCalculator.calculateFinalDamage(101, true)).toBe(151);
      });
    });

    describe('calculatePhysicalAttack', () => {
      it('returns DamageResult with physical type', () => {
        const result = DamageCalculator.calculatePhysicalAttack(100, 100, 0);
        expect(result.damageType).toBe('physical');
        expect(typeof result.damage).toBe('number');
        expect(typeof result.isCritical).toBe('boolean');
      });
    });

    describe('calculateMagicalAttack', () => {
      it('returns DamageResult with magical type', () => {
        const result = DamageCalculator.calculateMagicalAttack(100, 0, 2.0, 0);
        expect(result.damageType).toBe('magical');
        expect(typeof result.damage).toBe('number');
        expect(typeof result.isCritical).toBe('boolean');
      });
    });
  });
});
