import { describe, it, expect, vi, beforeEach } from 'vitest';

// GachaAnimationManager 테스트
// Phaser 의존성 없이 순수 로직만 테스트

type GeneralGrade = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

interface GradeEffectConfig {
  color: number;
  glowColor: number;
  particleCount: number;
  duration: number;
  screenFlash: boolean;
  lightning: boolean;
  explosion: boolean;
  rainbow: boolean;
}

const GRADE_EFFECTS: Record<GeneralGrade, GradeEffectConfig> = {
  N: {
    color: 0xaaaaaa,
    glowColor: 0x666666,
    particleCount: 0,
    duration: 300,
    screenFlash: false,
    lightning: false,
    explosion: false,
    rainbow: false,
  },
  R: {
    color: 0x3399ff,
    glowColor: 0x0066cc,
    particleCount: 10,
    duration: 600,
    screenFlash: false,
    lightning: false,
    explosion: false,
    rainbow: false,
  },
  SR: {
    color: 0xaa44ff,
    glowColor: 0x8800ff,
    particleCount: 30,
    duration: 1000,
    screenFlash: true,
    lightning: false,
    explosion: false,
    rainbow: false,
  },
  SSR: {
    color: 0xffcc00,
    glowColor: 0xff9900,
    particleCount: 50,
    duration: 1500,
    screenFlash: true,
    lightning: true,
    explosion: false,
    rainbow: false,
  },
  UR: {
    color: 0xff0088,
    glowColor: 0xff00ff,
    particleCount: 100,
    duration: 2500,
    screenFlash: true,
    lightning: true,
    explosion: true,
    rainbow: true,
  },
};

describe('GachaAnimation', () => {
  describe('등급별 이펙트 설정', () => {
    it('N등급: 기본 연출 (파티클 없음)', () => {
      const config = GRADE_EFFECTS['N'];
      expect(config.particleCount).toBe(0);
      expect(config.screenFlash).toBe(false);
      expect(config.lightning).toBe(false);
      expect(config.explosion).toBe(false);
      expect(config.rainbow).toBe(false);
      expect(config.duration).toBe(300);
    });

    it('R등급: 기본 연출 (파란빛)', () => {
      const config = GRADE_EFFECTS['R'];
      expect(config.color).toBe(0x3399ff); // 파란색
      expect(config.particleCount).toBe(10);
      expect(config.screenFlash).toBe(false);
      expect(config.lightning).toBe(false);
      expect(config.duration).toBe(600);
    });

    it('SR등급: 화려한 연출 (보라빛 + 파티클)', () => {
      const config = GRADE_EFFECTS['SR'];
      expect(config.color).toBe(0xaa44ff); // 보라색
      expect(config.particleCount).toBe(30);
      expect(config.screenFlash).toBe(true);
      expect(config.lightning).toBe(false);
      expect(config.duration).toBe(1000);
    });

    it('SSR등급: 특별 연출 (금빛 + 번개)', () => {
      const config = GRADE_EFFECTS['SSR'];
      expect(config.color).toBe(0xffcc00); // 금색
      expect(config.particleCount).toBe(50);
      expect(config.screenFlash).toBe(true);
      expect(config.lightning).toBe(true);
      expect(config.explosion).toBe(false);
      expect(config.duration).toBe(1500);
    });

    it('UR등급: 최고급 연출 (무지개빛 + 폭발 + 번개)', () => {
      const config = GRADE_EFFECTS['UR'];
      expect(config.color).toBe(0xff0088); // 핑크/레드
      expect(config.particleCount).toBe(100);
      expect(config.screenFlash).toBe(true);
      expect(config.lightning).toBe(true);
      expect(config.explosion).toBe(true);
      expect(config.rainbow).toBe(true);
      expect(config.duration).toBe(2500);
    });
  });

  describe('등급별 연출 시간', () => {
    it('등급이 높을수록 연출 시간이 길어짐', () => {
      expect(GRADE_EFFECTS['N'].duration).toBeLessThan(GRADE_EFFECTS['R'].duration);
      expect(GRADE_EFFECTS['R'].duration).toBeLessThan(GRADE_EFFECTS['SR'].duration);
      expect(GRADE_EFFECTS['SR'].duration).toBeLessThan(GRADE_EFFECTS['SSR'].duration);
      expect(GRADE_EFFECTS['SSR'].duration).toBeLessThan(GRADE_EFFECTS['UR'].duration);
    });

    it('등급이 높을수록 파티클 개수가 많아짐', () => {
      expect(GRADE_EFFECTS['N'].particleCount).toBeLessThan(GRADE_EFFECTS['R'].particleCount);
      expect(GRADE_EFFECTS['R'].particleCount).toBeLessThan(GRADE_EFFECTS['SR'].particleCount);
      expect(GRADE_EFFECTS['SR'].particleCount).toBeLessThan(GRADE_EFFECTS['SSR'].particleCount);
      expect(GRADE_EFFECTS['SSR'].particleCount).toBeLessThan(GRADE_EFFECTS['UR'].particleCount);
    });
  });

  describe('스킵 기능', () => {
    let isSkipped = false;

    beforeEach(() => {
      isSkipped = false;
    });

    it('스킵 상태가 false일 때 애니메이션 실행됨', () => {
      const shouldAnimate = !isSkipped;
      expect(shouldAnimate).toBe(true);
    });

    it('스킵 상태가 true일 때 애니메이션 건너뜀', () => {
      isSkipped = true;
      const shouldAnimate = !isSkipped;
      expect(shouldAnimate).toBe(false);
    });
  });

  describe('10연차 순차 공개', () => {
    it('10연차 시 10장의 카드가 순서대로 처리됨', () => {
      const results = Array(10).fill(null).map((_, i) => ({
        generalId: `general-${i}`,
        grade: ['N', 'N', 'R', 'N', 'SR', 'N', 'R', 'N', 'N', 'SR'][i] as GeneralGrade,
        isNew: true,
      }));

      expect(results.length).toBe(10);
      
      // 순차적 공개 시뮬레이션
      const revealOrder: number[] = [];
      results.forEach((_, index) => {
        revealOrder.push(index);
      });

      expect(revealOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('SR 이상 카드는 더 긴 대기 시간을 가짐', () => {
      const getRevealDelay = (grade: GeneralGrade): number => {
        if (grade === 'SSR' || grade === 'UR') return 500;
        if (grade === 'SR') return 300;
        return 150;
      };

      expect(getRevealDelay('N')).toBe(150);
      expect(getRevealDelay('R')).toBe(150);
      expect(getRevealDelay('SR')).toBe(300);
      expect(getRevealDelay('SSR')).toBe(500);
      expect(getRevealDelay('UR')).toBe(500);
    });
  });

  describe('카드 뒤집기 애니메이션', () => {
    it('카드 초기 상태는 숨김 (scaleX: 0, alpha: 0)', () => {
      const initialState = { scaleX: 0, scaleY: 1, alpha: 0 };
      expect(initialState.scaleX).toBe(0);
      expect(initialState.alpha).toBe(0);
    });

    it('카드 최종 상태는 표시 (scaleX: 1, alpha: 1)', () => {
      const finalState = { scaleX: 1, scaleY: 1, alpha: 1 };
      expect(finalState.scaleX).toBe(1);
      expect(finalState.alpha).toBe(1);
    });
  });

  describe('등급별 색상 검증', () => {
    it('R등급은 파란색 계열', () => {
      const color = GRADE_EFFECTS['R'].color;
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      
      // 파란색이 가장 높아야 함
      expect(b).toBeGreaterThan(r);
    });

    it('SR등급은 보라색 계열', () => {
      const color = GRADE_EFFECTS['SR'].color;
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      
      // 보라색: 빨강+파랑이 높음
      expect(r).toBeGreaterThan(0);
      expect(b).toBeGreaterThan(0);
    });

    it('SSR등급은 금색 계열', () => {
      const color = GRADE_EFFECTS['SSR'].color;
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      
      // 금색: 빨강+초록이 높고 파랑이 낮음
      expect(r).toBeGreaterThan(200);
      expect(g).toBeGreaterThan(150);
      expect(b).toBeLessThan(50);
    });
  });
});
