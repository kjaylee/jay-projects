import { describe, it, expect } from 'vitest';

type Grade = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

interface GachaResult {
  grade: Grade;
  generalId: string;
}

// 가챠 확률: N 60%, R 30%, SR 8%, SSR 1.8%, UR 0.2%
const GACHA_RATES: Record<Grade, number> = {
  N: 0.60,
  R: 0.30,
  SR: 0.08,
  SSR: 0.018,
  UR: 0.002,
};

function pullGacha(random: number, pityCount: number): Grade {
  // 천장: 80회 SSR 보장
  if (pityCount >= 80) {
    return 'SSR';
  }

  let cumulative = 0;
  for (const [grade, rate] of Object.entries(GACHA_RATES)) {
    cumulative += rate;
    if (random < cumulative) {
      return grade as Grade;
    }
  }
  return 'N';
}

function simulateGacha(pulls: number): Record<Grade, number> {
  const results: Record<Grade, number> = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
  
  for (let i = 0; i < pulls; i++) {
    const grade = pullGacha(Math.random(), 0);
    results[grade]++;
  }
  
  return results;
}

describe('GachaSystem', () => {
  describe('pullGacha', () => {
    it('random 0.0 → N 등급', () => {
      expect(pullGacha(0.0, 0)).toBe('N');
    });

    it('random 0.59 → N 등급', () => {
      expect(pullGacha(0.59, 0)).toBe('N');
    });

    it('random 0.61 → R 등급', () => {
      expect(pullGacha(0.61, 0)).toBe('R');
    });

    it('random 0.91 → SR 등급', () => {
      expect(pullGacha(0.91, 0)).toBe('SR');
    });

    it('random 0.99 → SSR 등급', () => {
      expect(pullGacha(0.99, 0)).toBe('SSR');
    });

    it('random 0.999 → UR 등급', () => {
      expect(pullGacha(0.999, 0)).toBe('UR');
    });

    it('천장 80회 → SSR 보장', () => {
      expect(pullGacha(0.0, 80)).toBe('SSR');
    });

    it('천장 100회 → SSR 보장', () => {
      expect(pullGacha(0.5, 100)).toBe('SSR');
    });
  });

  describe('확률 분포 검증 (1만회 시뮬)', () => {
    it('N 등급 약 60%', () => {
      const results = simulateGacha(10000);
      const nRate = results.N / 10000;
      expect(nRate).toBeGreaterThan(0.55);
      expect(nRate).toBeLessThan(0.65);
    });

    it('SSR+UR 등급 약 2%', () => {
      const results = simulateGacha(10000);
      const rareRate = (results.SSR + results.UR) / 10000;
      expect(rareRate).toBeGreaterThan(0.01);
      expect(rareRate).toBeLessThan(0.03);
    });
  });
});
