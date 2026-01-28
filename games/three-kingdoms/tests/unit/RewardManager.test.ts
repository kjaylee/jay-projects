import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RewardManager, BattleReward, GeneralForExp } from '../../src/managers/RewardManager';
import { GameManager } from '../../src/managers/GameManager';

describe('RewardManager', () => {
  describe('calculateReward', () => {
    it('존재하는 스테이지에서 기본 보상 계산', () => {
      const reward = RewardManager.calculateReward('1-1', false);
      
      expect(reward.gold).toBe(100);
      expect(reward.exp).toBe(50);
      expect(reward.items).toEqual([]);
      expect(reward.firstClearBonus).toBeUndefined();
    });

    it('첫 클리어 시 보너스 포함', () => {
      const reward = RewardManager.calculateReward('1-1', true);
      
      expect(reward.gold).toBe(100);
      expect(reward.exp).toBe(50);
      expect(reward.firstClearBonus).toBeDefined();
      expect(reward.firstClearBonus?.gold).toBe(50); // 100 * 0.5
      expect(reward.firstClearBonus?.gems).toBe(20); // 일반 스테이지 기본
    });

    it('보스 스테이지 첫 클리어 시 추가 보석', () => {
      const reward = RewardManager.calculateReward('1-5', true);
      
      expect(reward.firstClearBonus?.gems).toBeGreaterThan(20);
    });

    it('존재하지 않는 스테이지 → 기본 보상 0', () => {
      const reward = RewardManager.calculateReward('99-99', false);
      
      expect(reward.gold).toBe(0);
      expect(reward.exp).toBe(0);
      expect(reward.items).toEqual([]);
    });

    it('아이템 보상이 있는 스테이지', () => {
      const reward = RewardManager.calculateReward('1-5', false);
      
      expect(reward.items.length).toBeGreaterThan(0);
      expect(reward.items[0].itemId).toBe('iron_sword');
      expect(reward.items[0].quantity).toBe(1);
    });

    it('최종 보스 스테이지 보상', () => {
      const reward = RewardManager.calculateReward('1-10', true);
      
      expect(reward.gold).toBe(1000);
      expect(reward.exp).toBe(500);
      expect(reward.items.length).toBe(2);
      // 보스 스테이지 첫 클리어 보너스 (boss difficulty = 2.0 배율)
      expect(reward.firstClearBonus?.gems).toBe(100); // 50 * 2.0
    });
  });

  describe('distributeExp', () => {
    it('경험치를 장수들에게 균등 분배', () => {
      const generals: GeneralForExp[] = [
        { id: 'g1', name: '관우', level: 10, exp: 0, addExp: vi.fn() },
        { id: 'g2', name: '장비', level: 8, exp: 0, addExp: vi.fn() },
        { id: 'g3', name: '조운', level: 12, exp: 0, addExp: vi.fn() },
      ];
      
      const distribution = RewardManager.distributeExp(300, generals);
      
      expect(distribution.get('g1')).toBe(100);
      expect(distribution.get('g2')).toBe(100);
      expect(distribution.get('g3')).toBe(100);
      
      expect(generals[0].addExp).toHaveBeenCalledWith(100);
      expect(generals[1].addExp).toHaveBeenCalledWith(100);
      expect(generals[2].addExp).toHaveBeenCalledWith(100);
    });

    it('장수가 없으면 빈 Map 반환', () => {
      const distribution = RewardManager.distributeExp(100, []);
      expect(distribution.size).toBe(0);
    });

    it('경험치 0이면 분배 안 함', () => {
      const generals: GeneralForExp[] = [
        { id: 'g1', name: '관우', level: 10, exp: 0, addExp: vi.fn() },
      ];
      
      const distribution = RewardManager.distributeExp(0, generals);
      expect(distribution.size).toBe(0);
      expect(generals[0].addExp).not.toHaveBeenCalled();
    });

    it('내림 처리로 분배 (7을 3명에게)', () => {
      const generals: GeneralForExp[] = [
        { id: 'g1', name: '관우', level: 10, exp: 0, addExp: vi.fn() },
        { id: 'g2', name: '장비', level: 8, exp: 0, addExp: vi.fn() },
        { id: 'g3', name: '조운', level: 12, exp: 0, addExp: vi.fn() },
      ];
      
      const distribution = RewardManager.distributeExp(7, generals);
      
      // 7 / 3 = 2.33... → 내림 2
      expect(distribution.get('g1')).toBe(2);
      expect(distribution.get('g2')).toBe(2);
      expect(distribution.get('g3')).toBe(2);
    });
  });

  describe('getRewardSummary', () => {
    it('기본 보상 요약', () => {
      const reward: BattleReward = {
        gold: 100,
        exp: 50,
        items: [],
      };
      
      const summary = RewardManager.getRewardSummary(reward);
      
      expect(summary).toContain('골드 100');
      expect(summary).toContain('경험치 50');
    });

    it('첫 클리어 보너스 포함', () => {
      const reward: BattleReward = {
        gold: 100,
        exp: 50,
        items: [],
        firstClearBonus: {
          gold: 50,
          gems: 20,
          items: [],
        },
      };
      
      const summary = RewardManager.getRewardSummary(reward);
      
      expect(summary).toContain('첫 클리어 보너스');
      expect(summary).toContain('보석 20');
    });

    it('아이템 포함', () => {
      const reward: BattleReward = {
        gold: 100,
        exp: 50,
        items: [
          { itemId: 'iron_sword', quantity: 1 },
          { itemId: 'health_potion', quantity: 3 },
        ],
      };
      
      const summary = RewardManager.getRewardSummary(reward);
      
      expect(summary).toContain('아이템 2종');
    });
  });

  describe('난이도별 첫 클리어 보너스', () => {
    it('normal 난이도 배율 1.0', () => {
      const reward = RewardManager.calculateReward('1-1', true);
      // normal: baseGems 20 * 1.0 = 20
      expect(reward.firstClearBonus?.gems).toBe(20);
    });

    it('hard 난이도 배율 1.5', () => {
      const reward = RewardManager.calculateReward('1-5', true);
      // hard + boss: baseGems 50 * 1.5 = 75
      expect(reward.firstClearBonus?.gems).toBe(75);
    });

    it('boss 난이도 배율 2.0', () => {
      const reward = RewardManager.calculateReward('1-10', true);
      // boss: baseGems 50 * 2.0 = 100
      expect(reward.firstClearBonus?.gems).toBe(100);
    });
  });
});
