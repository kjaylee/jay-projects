/**
 * 턴 제한 시스템 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTurnLimitChecker,
  DEFAULT_TURN_LIMIT,
  BOSS_TURN_LIMIT,
  TurnLimitChecker,
} from '../../src/utils/TurnLimitChecker';

describe('TurnLimit', () => {
  describe('턴 제한 설정', () => {
    it('기본 스테이지 턴 제한: 30턴', () => {
      const checker = createTurnLimitChecker();
      expect(checker.getTurnLimit(false)).toBe(30);
    });

    it('보스 스테이지 턴 제한: 50턴', () => {
      const checker = createTurnLimitChecker();
      expect(checker.getTurnLimit(true)).toBe(50);
    });

    it('커스텀 턴 제한 설정 가능', () => {
      const checker = createTurnLimitChecker({ defaultLimit: 20, bossLimit: 40 });
      expect(checker.getTurnLimit(false)).toBe(20);
      expect(checker.getTurnLimit(true)).toBe(40);
    });
  });

  describe('턴 체크 결과', () => {
    let checker: TurnLimitChecker;

    beforeEach(() => {
      checker = createTurnLimitChecker();
    });

    it('턴 제한 미달 시 continue', () => {
      expect(checker.checkLimit(15, false)).toBe('continue');
      expect(checker.checkLimit(29, false)).toBe('continue');
    });

    it('일반 스테이지 30턴 초과 시 timeout_defeat', () => {
      expect(checker.checkLimit(30, false)).toBe('timeout_defeat');
      expect(checker.checkLimit(31, false)).toBe('timeout_defeat');
    });

    it('보스 스테이지 50턴 초과 시 timeout_defeat', () => {
      expect(checker.checkLimit(49, true)).toBe('continue');
      expect(checker.checkLimit(50, true)).toBe('timeout_defeat');
    });

    it('턴 초과 + 플레이어 우세 시 timeout_draw', () => {
      expect(checker.checkLimit(30, false, true)).toBe('timeout_draw');
    });

    it('턴 초과 + 플레이어 열세 시 timeout_defeat', () => {
      expect(checker.checkLimit(30, false, false)).toBe('timeout_defeat');
    });
  });
});

// BattleManager 통합 테스트를 위한 mock
describe('BattleManager TurnLimit Integration', () => {
  interface MockBattleState {
    turnsElapsed: number;
    isBossStage: boolean;
    playerHpPercent: number;
    enemyHpPercent: number;
    state: 'fighting' | 'victory' | 'defeat' | 'timeout_defeat' | 'timeout_draw';
  }

  const checkBattleTimeout = (battle: MockBattleState): MockBattleState => {
    const checker = createTurnLimitChecker();
    const limit = checker.getTurnLimit(battle.isBossStage);
    
    if (battle.turnsElapsed >= limit && battle.state === 'fighting') {
      // HP 우세 판정
      const playerAdvantage = battle.playerHpPercent > battle.enemyHpPercent;
      const result = checker.checkLimit(battle.turnsElapsed, battle.isBossStage, playerAdvantage);
      
      return {
        ...battle,
        state: result === 'continue' ? 'fighting' : result,
      };
    }
    
    return battle;
  };

  it('30턴 전투 중 턴 제한 체크 후 timeout_defeat', () => {
    const battle: MockBattleState = {
      turnsElapsed: 30,
      isBossStage: false,
      playerHpPercent: 30,
      enemyHpPercent: 50,
      state: 'fighting',
    };

    const result = checkBattleTimeout(battle);
    expect(result.state).toBe('timeout_defeat');
  });

  it('30턴 플레이어 HP 우세 시 timeout_draw', () => {
    const battle: MockBattleState = {
      turnsElapsed: 30,
      isBossStage: false,
      playerHpPercent: 70,
      enemyHpPercent: 30,
      state: 'fighting',
    };

    const result = checkBattleTimeout(battle);
    expect(result.state).toBe('timeout_draw');
  });

  it('보스전 49턴은 계속 진행', () => {
    const battle: MockBattleState = {
      turnsElapsed: 49,
      isBossStage: true,
      playerHpPercent: 50,
      enemyHpPercent: 50,
      state: 'fighting',
    };

    const result = checkBattleTimeout(battle);
    expect(result.state).toBe('fighting');
  });
});
