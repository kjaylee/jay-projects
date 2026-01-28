import { describe, it, expect, beforeEach } from 'vitest';
import { VIPManager, VIPLevel, VIPConfig } from '../../src/managers/VIPManager';

describe('VIPManager', () => {
  let manager: VIPManager;
  const defaultConfig: VIPConfig = {
    maxLevel: 15,
    levelThresholds: [
      0,      // VIP 0
      100,    // VIP 1
      300,    // VIP 2
      600,    // VIP 3
      1000,   // VIP 4
      1500,   // VIP 5
      2500,   // VIP 6
      4000,   // VIP 7
      6000,   // VIP 8
      9000,   // VIP 9
      13000,  // VIP 10
      18000,  // VIP 11
      25000,  // VIP 12
      35000,  // VIP 13
      50000,  // VIP 14
      70000,  // VIP 15
    ],
    benefits: {
      idleRewardBonus: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 100], // %
      gachaRateBonus: [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 10], // SR+ 확률 추가 %
      dailyFreeGacha: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 7], // 일일 무료 가챠 횟수
      stamRefreshBonus: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160, 200], // 스태미나 추가
    },
  };

  beforeEach(() => {
    manager = new VIPManager(defaultConfig);
  });

  describe('기본 기능', () => {
    it('생성 시 기본 설정이 적용된다', () => {
      expect(manager.getConfig()).toEqual(defaultConfig);
    });

    it('초기 VIP 레벨은 0이다', () => {
      expect(manager.getCurrentLevel()).toBe(0);
    });

    it('초기 VIP 포인트는 0이다', () => {
      expect(manager.getCurrentPoints()).toBe(0);
    });
  });

  describe('VIP 포인트 적립', () => {
    it('포인트 적립이 가능하다', () => {
      manager.addPoints(50);
      expect(manager.getCurrentPoints()).toBe(50);
    });

    it('포인트 적립으로 레벨업이 된다', () => {
      manager.addPoints(100);
      expect(manager.getCurrentLevel()).toBe(1);
    });

    it('대량 포인트 적립 시 다단계 레벨업', () => {
      manager.addPoints(1000);
      expect(manager.getCurrentLevel()).toBe(4);
    });

    it('최대 레벨 이상으로 레벨업하지 않는다', () => {
      manager.addPoints(100000);
      expect(manager.getCurrentLevel()).toBe(15);
    });
  });

  describe('다음 레벨까지 필요 포인트', () => {
    it('VIP 0에서 VIP 1까지 100포인트 필요', () => {
      expect(manager.getPointsToNextLevel()).toBe(100);
    });

    it('50포인트 보유 시 VIP 1까지 50포인트 필요', () => {
      manager.addPoints(50);
      expect(manager.getPointsToNextLevel()).toBe(50);
    });

    it('최대 레벨에서는 0 반환', () => {
      manager.addPoints(100000);
      expect(manager.getPointsToNextLevel()).toBe(0);
    });
  });

  describe('방치 보상 보너스', () => {
    it('VIP 0에서 보너스는 0%', () => {
      expect(manager.getIdleRewardBonus()).toBe(0);
    });

    it('VIP 5에서 보너스는 25%', () => {
      manager.addPoints(1500);
      expect(manager.getIdleRewardBonus()).toBe(25);
    });

    it('VIP 15에서 보너스는 100%', () => {
      manager.addPoints(100000);
      expect(manager.getIdleRewardBonus()).toBe(100);
    });

    it('방치 보상에 보너스 배율 적용', () => {
      manager.addPoints(1500); // VIP 5 (25% 보너스)
      const baseReward = 1000;
      const bonusReward = manager.applyIdleRewardBonus(baseReward);
      expect(bonusReward).toBe(1250); // 1000 * 1.25
    });
  });

  describe('가챠 확률 보너스', () => {
    it('VIP 0에서 가챠 보너스는 0%', () => {
      expect(manager.getGachaRateBonus()).toBe(0);
    });

    it('VIP 6에서 가챠 보너스는 2%', () => {
      manager.addPoints(2500);
      expect(manager.getGachaRateBonus()).toBe(2);
    });

    it('VIP 15에서 가챠 보너스는 10%', () => {
      manager.addPoints(100000);
      expect(manager.getGachaRateBonus()).toBe(10);
    });
  });

  describe('일일 무료 가챠', () => {
    it('VIP 0에서 일일 무료 가챠 1회', () => {
      expect(manager.getDailyFreeGachaCount()).toBe(1);
    });

    it('VIP 6에서 일일 무료 가챠 3회', () => {
      manager.addPoints(2500);
      expect(manager.getDailyFreeGachaCount()).toBe(3);
    });

    it('VIP 15에서 일일 무료 가챠 7회', () => {
      manager.addPoints(100000);
      expect(manager.getDailyFreeGachaCount()).toBe(7);
    });
  });

  describe('스태미나 보너스', () => {
    it('VIP 0에서 스태미나 보너스 0', () => {
      expect(manager.getStaminaRefreshBonus()).toBe(0);
    });

    it('VIP 10에서 스태미나 보너스 100', () => {
      manager.addPoints(13000);
      expect(manager.getStaminaRefreshBonus()).toBe(100);
    });
  });

  describe('VIP 레벨 직접 설정', () => {
    it('레벨을 직접 설정할 수 있다', () => {
      manager.setLevel(5);
      expect(manager.getCurrentLevel()).toBe(5);
    });

    it('레벨 설정 시 포인트도 해당 레벨 최소치로 설정', () => {
      manager.setLevel(5);
      expect(manager.getCurrentPoints()).toBe(1500);
    });

    it('최대 레벨 초과 설정 시 최대 레벨로 제한', () => {
      manager.setLevel(20);
      expect(manager.getCurrentLevel()).toBe(15);
    });
  });

  describe('저장/로드', () => {
    it('현재 상태를 JSON으로 내보낼 수 있다', () => {
      manager.addPoints(1500);
      const data = manager.toJSON();
      expect(data).toEqual({
        points: 1500,
        level: 5,
      });
    });

    it('JSON에서 상태를 복원할 수 있다', () => {
      manager.fromJSON({ points: 2500, level: 6 });
      expect(manager.getCurrentPoints()).toBe(2500);
      expect(manager.getCurrentLevel()).toBe(6);
    });
  });

  describe('VIP 정보 조회', () => {
    it('현재 VIP 레벨 정보를 조회할 수 있다', () => {
      manager.addPoints(1500);
      const info = manager.getLevelInfo();
      
      expect(info.level).toBe(5);
      expect(info.points).toBe(1500);
      expect(info.pointsToNext).toBe(1000); // 2500 - 1500
      expect(info.benefits.idleRewardBonus).toBe(25);
      expect(info.benefits.gachaRateBonus).toBe(2);
      expect(info.benefits.dailyFreeGacha).toBe(2);
      expect(info.benefits.stamRefreshBonus).toBe(50);
    });
  });

  describe('결제 연동', () => {
    it('결제 금액에 따라 VIP 포인트 적립 (1원 = 1포인트)', () => {
      manager.onPurchase(5000); // 5000원 결제
      expect(manager.getCurrentPoints()).toBe(5000);
      expect(manager.getCurrentLevel()).toBe(7); // 4000 이상
    });

    it('커스텀 포인트 비율 설정', () => {
      const customManager = new VIPManager({
        ...defaultConfig,
        pointsPerCurrency: 2, // 1원 = 2포인트
      });
      customManager.onPurchase(500);
      expect(customManager.getCurrentPoints()).toBe(1000);
    });
  });

  describe('혜택 미리보기', () => {
    it('특정 레벨의 혜택을 미리볼 수 있다', () => {
      const benefits = manager.getBenefitsAtLevel(10);
      expect(benefits.idleRewardBonus).toBe(50);
      expect(benefits.gachaRateBonus).toBe(4);
      expect(benefits.dailyFreeGacha).toBe(4);
      expect(benefits.stamRefreshBonus).toBe(100);
    });

    it('범위 밖 레벨 조회 시 최대/최소로 제한', () => {
      const benefitsNeg = manager.getBenefitsAtLevel(-1);
      expect(benefitsNeg.idleRewardBonus).toBe(0); // VIP 0

      const benefitsOver = manager.getBenefitsAtLevel(20);
      expect(benefitsOver.idleRewardBonus).toBe(100); // VIP 15
    });
  });
});
