import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdleManager, IdleReward, IdleConfig } from '../../src/managers/IdleManager';

describe('IdleManager', () => {
  let manager: IdleManager;
  
  const baseConfig: IdleConfig = {
    goldPerMinute: 100, // 정치 합계 기반
    expPerMinute: 20,   // 클리어 스테이지 기반
    maxHours: 12,
  };

  beforeEach(() => {
    manager = new IdleManager(baseConfig);
  });

  describe('calculateReward', () => {
    it('1시간 방치 보상 계산', () => {
      const lastClaim = new Date('2026-01-28T10:00:00');
      const now = new Date('2026-01-28T11:00:00');
      
      const reward = manager.calculateReward(lastClaim, now);
      
      expect(reward.minutes).toBe(60);
      expect(reward.gold).toBe(6000);  // 60 * 100
      expect(reward.exp).toBe(1200);   // 60 * 20
    });

    it('12시간 최대 보상', () => {
      const lastClaim = new Date('2026-01-28T00:00:00');
      const now = new Date('2026-01-28T12:00:00');
      
      const reward = manager.calculateReward(lastClaim, now);
      
      expect(reward.minutes).toBe(720); // 12 * 60
      expect(reward.gold).toBe(72000);
      expect(reward.exp).toBe(14400);
    });

    it('24시간 방치해도 12시간 캡', () => {
      const lastClaim = new Date('2026-01-27T00:00:00');
      const now = new Date('2026-01-28T00:00:00');
      
      const reward = manager.calculateReward(lastClaim, now);
      
      expect(reward.minutes).toBe(720); // 최대 12시간
      expect(reward.gold).toBe(72000);
    });

    it('0분 방치 → 보상 0', () => {
      const now = new Date();
      const reward = manager.calculateReward(now, now);
      
      expect(reward.gold).toBe(0);
      expect(reward.exp).toBe(0);
      expect(reward.minutes).toBe(0);
    });

    it('30분 방치 보상', () => {
      const lastClaim = new Date('2026-01-28T10:00:00');
      const now = new Date('2026-01-28T10:30:00');
      
      const reward = manager.calculateReward(lastClaim, now);
      
      expect(reward.minutes).toBe(30);
      expect(reward.gold).toBe(3000);
      expect(reward.exp).toBe(600);
    });
  });

  describe('updateConfig', () => {
    it('정치 스탯 기반 goldPerMinute 업데이트', () => {
      manager.updateConfig({ goldPerMinute: 200 });
      
      const lastClaim = new Date('2026-01-28T10:00:00');
      const now = new Date('2026-01-28T11:00:00');
      
      const reward = manager.calculateReward(lastClaim, now);
      
      expect(reward.gold).toBe(12000); // 60 * 200
    });

    it('maxHours 변경', () => {
      manager.updateConfig({ maxHours: 6 });
      
      const lastClaim = new Date('2026-01-28T00:00:00');
      const now = new Date('2026-01-28T12:00:00');
      
      const reward = manager.calculateReward(lastClaim, now);
      
      expect(reward.minutes).toBe(360); // 6시간 캡
    });
  });

  describe('calculatePoliticsBonus', () => {
    it('진형 정치 스탯 합계로 goldPerMinute 계산', () => {
      // 정치 스탯 합계 * 0.5 = goldPerMinute
      const politicsSum = 400;
      const goldPerMinute = IdleManager.calculateGoldPerMinute(politicsSum);
      
      expect(goldPerMinute).toBe(200); // 400 * 0.5
    });

    it('정치 0이면 최소 보상', () => {
      const goldPerMinute = IdleManager.calculateGoldPerMinute(0);
      expect(goldPerMinute).toBe(10); // 최소 10
    });
  });

  describe('calculateExpPerMinute', () => {
    it('클리어 스테이지 기반 expPerMinute 계산', () => {
      // 스테이지 번호 * 2 = expPerMinute
      const stageNumber = 10; // 1-10 스테이지
      const expPerMinute = IdleManager.calculateExpPerMinute(stageNumber);
      
      expect(expPerMinute).toBe(20); // 10 * 2
    });

    it('스테이지 0이면 최소 경험치', () => {
      const expPerMinute = IdleManager.calculateExpPerMinute(0);
      expect(expPerMinute).toBe(1); // 최소 1
    });

    it('고레벨 스테이지 (50스테이지)', () => {
      const expPerMinute = IdleManager.calculateExpPerMinute(50);
      expect(expPerMinute).toBe(100); // 50 * 2
    });
  });

  describe('VIP 보너스', () => {
    it('VIP 레벨별 보너스 적용', () => {
      const vipBonus = IdleManager.getVipBonus(5);
      expect(vipBonus).toBeGreaterThan(1.0); // 5레벨이면 보너스 있음
    });

    it('VIP 0레벨 보너스 1.0', () => {
      const vipBonus = IdleManager.getVipBonus(0);
      expect(vipBonus).toBe(1.0);
    });

    it('VIP 보너스 적용된 보상 계산', () => {
      const configWithVip: IdleConfig = {
        ...baseConfig,
        vipBonus: 1.5, // VIP 50% 보너스
      };
      
      const vipManager = new IdleManager(configWithVip);
      
      const lastClaim = new Date('2026-01-28T10:00:00');
      const now = new Date('2026-01-28T11:00:00');
      
      const reward = vipManager.calculateReward(lastClaim, now);
      
      // 60분 * 100 * 1.5 = 9000
      expect(reward.gold).toBe(9000);
    });
  });

  describe('getRewardSummary', () => {
    it('보상 요약 문자열 생성', () => {
      const reward: IdleReward = {
        gold: 6000,
        exp: 1200,
        minutes: 60,
      };
      
      const summary = IdleManager.getRewardSummary(reward);
      
      expect(summary).toContain('1시간');
      expect(summary).toContain('6,000');
      expect(summary).toContain('1,200');
    });

    it('12시간 이상 표시', () => {
      const reward: IdleReward = {
        gold: 72000,
        exp: 14400,
        minutes: 720,
      };
      
      const summary = IdleManager.getRewardSummary(reward);
      
      expect(summary).toContain('12시간');
    });
  });

  describe('parseMaxClearedStage', () => {
    it('스테이지 ID에서 숫자 추출 (1-10)', () => {
      const stageNum = IdleManager.parseStageNumber('1-10');
      expect(stageNum).toBe(10);
    });

    it('스테이지 ID에서 숫자 추출 (2-5)', () => {
      const stageNum = IdleManager.parseStageNumber('2-5');
      expect(stageNum).toBe(15); // 챕터1 10개 + 5
    });

    it('null 스테이지 → 0', () => {
      const stageNum = IdleManager.parseStageNumber(null);
      expect(stageNum).toBe(0);
    });
  });
});
