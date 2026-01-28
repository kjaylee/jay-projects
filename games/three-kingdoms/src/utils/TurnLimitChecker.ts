/**
 * 턴 제한 시스템 유틸리티
 * N턴 초과 시 승패 판정
 */

/** 기본 스테이지 턴 제한 */
export const DEFAULT_TURN_LIMIT = 30;

/** 보스 스테이지 턴 제한 */
export const BOSS_TURN_LIMIT = 50;

export interface TurnLimitConfig {
  defaultLimit: number;
  bossLimit: number;
}

/** 턴 체크 결과 */
export type TurnLimitResult = 'continue' | 'timeout_defeat' | 'timeout_draw';

/**
 * 턴 제한 체커 인터페이스
 */
export interface TurnLimitChecker {
  checkLimit(currentTurn: number, isBoss: boolean, playerAdvantage?: boolean): TurnLimitResult;
  getTurnLimit(isBoss: boolean): number;
}

/**
 * 턴 제한 체커 생성
 */
export function createTurnLimitChecker(config?: Partial<TurnLimitConfig>): TurnLimitChecker {
  const defaultLimit = config?.defaultLimit ?? DEFAULT_TURN_LIMIT;
  const bossLimit = config?.bossLimit ?? BOSS_TURN_LIMIT;

  return {
    getTurnLimit(isBoss: boolean): number {
      return isBoss ? bossLimit : defaultLimit;
    },
    
    checkLimit(currentTurn: number, isBoss: boolean, playerAdvantage?: boolean): TurnLimitResult {
      const limit = this.getTurnLimit(isBoss);
      
      if (currentTurn < limit) {
        return 'continue';
      }
      
      // 턴 초과: 플레이어 우세면 무승부, 아니면 패배
      if (playerAdvantage) {
        return 'timeout_draw';
      }
      return 'timeout_defeat';
    },
  };
}

/**
 * HP 비율로 우세 판정
 */
export function checkPlayerAdvantage(
  playerHpPercent: number,
  enemyHpPercent: number
): boolean {
  return playerHpPercent > enemyHpPercent;
}

/**
 * HP 비율 계산
 */
export function calculateHpPercent(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return (currentHp / maxHp) * 100;
}

/**
 * 전체 팀 HP 비율 계산
 */
export function calculateTeamHpPercent(
  units: Array<{ stats: { currentHp: number; maxHp: number }; isAlive: boolean }>
): number {
  const alive = units.filter(u => u.isAlive);
  if (alive.length === 0) return 0;

  const totalCurrent = alive.reduce((sum, u) => sum + u.stats.currentHp, 0);
  const totalMax = alive.reduce((sum, u) => sum + u.stats.maxHp, 0);

  return calculateHpPercent(totalCurrent, totalMax);
}
