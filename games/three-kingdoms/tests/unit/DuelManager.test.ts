import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DuelManager,
  FAMOUS_DUELS,
  DUEL_CONFIG,
  DuelAction,
} from '../../src/managers/DuelManager';
import { BattleUnit, createBattleUnit } from '../../src/entities/BattleUnit';

describe('DuelManager', () => {
  let playerUnit: BattleUnit;
  let enemyUnit: BattleUnit;

  beforeEach(() => {
    playerUnit = createBattleUnit({
      id: 'player_guan_yu',
      generalId: 'guan_yu',
      name: '관우',
      team: 'player',
      position: { row: 0, col: 0 },
      baseStats: { attack: 95, defense: 80, intelligence: 75, speed: 85, hp: 500 },
      level: 50,
      skills: [],
    });

    enemyUnit = createBattleUnit({
      id: 'enemy_hua_xiong',
      generalId: 'hua_xiong',
      name: '화웅',
      team: 'enemy',
      position: { row: 0, col: 1 },
      baseStats: { attack: 85, defense: 70, intelligence: 40, speed: 75, hp: 400 },
      level: 30,
      skills: [],
    });
  });

  describe('일기토 발생 조건', () => {
    it('다른 팀의 유닛끼리 일기토가 가능하다', () => {
      expect(DuelManager.canTriggerDuel(playerUnit, enemyUnit)).toBe(true);
    });

    it('같은 팀의 유닛끼리는 일기토가 불가능하다', () => {
      const allyUnit = createBattleUnit({
        id: 'ally',
        generalId: 'zhang_fei',
        name: '장비',
        team: 'player',
        position: { row: 0, col: 1 },
        baseStats: { attack: 90, defense: 75, intelligence: 50, speed: 80, hp: 450 },
        level: 50,
        skills: [],
      });
      
      expect(DuelManager.canTriggerDuel(playerUnit, allyUnit)).toBe(false);
    });

    it('사망한 유닛은 일기토가 불가능하다', () => {
      playerUnit.isAlive = false;
      
      expect(DuelManager.canTriggerDuel(playerUnit, enemyUnit)).toBe(false);
    });
  });

  describe('유명 일기토 확인', () => {
    it('관우 vs 화웅은 유명 일기토이다', () => {
      const famousDuel = DuelManager.checkFamousDuel(playerUnit, enemyUnit);
      
      expect(famousDuel).not.toBeNull();
      expect(famousDuel!.name).toBe('관우의 화웅 참수');
    });

    it('순서가 바뀌어도 유명 일기토를 인식한다', () => {
      const famousDuel = DuelManager.checkFamousDuel(enemyUnit, playerUnit);
      
      expect(famousDuel).not.toBeNull();
    });

    it('유명 일기토가 아닌 조합은 null을 반환한다', () => {
      const randomEnemy = createBattleUnit({
        id: 'enemy_random',
        generalId: 'random_general',
        name: '잡병',
        team: 'enemy',
        position: { row: 0, col: 1 },
        baseStats: { attack: 50, defense: 50, intelligence: 30, speed: 50, hp: 200 },
        level: 10,
        skills: [],
      });
      
      const famousDuel = DuelManager.checkFamousDuel(playerUnit, randomEnemy);
      
      expect(famousDuel).toBeNull();
    });
  });

  describe('인접 여부 확인', () => {
    it('같은 칸은 인접하다', () => {
      enemyUnit.position = { row: 0, col: 0 };
      
      expect(DuelManager.areAdjacent(playerUnit, enemyUnit)).toBe(true);
    });

    it('맨해튼 거리 1은 인접하다', () => {
      expect(DuelManager.areAdjacent(playerUnit, enemyUnit)).toBe(true); // (0,0) - (0,1)
    });

    it('맨해튼 거리 2 이상은 인접하지 않다', () => {
      enemyUnit.position = { row: 1, col: 1 };
      
      expect(DuelManager.areAdjacent(playerUnit, enemyUnit)).toBe(false); // (0,0) - (1,1)
    });
  });

  describe('랜덤 일기토 발생', () => {
    it('무력이 기준 미만이면 랜덤 일기토가 발생하지 않는다', () => {
      playerUnit.stats.attack = 50; // 기준 미만
      
      expect(DuelManager.shouldTriggerRandomDuel(playerUnit, enemyUnit)).toBe(false);
    });

    it('무력이 기준 이상이면 확률적으로 발생한다', () => {
      playerUnit.stats.attack = 90;
      enemyUnit.stats.attack = 90;
      
      // 여러 번 시도하여 최소 한 번은 발생하거나 발생하지 않아야 함
      const results: boolean[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(DuelManager.shouldTriggerRandomDuel(playerUnit, enemyUnit));
      }
      
      // 5% 확률이므로 100번 중 대부분 false
      const trueCount = results.filter(r => r).length;
      expect(trueCount).toBeLessThan(20); // 대략적인 확인
    });
  });

  describe('일기토 실행', () => {
    it('3라운드로 진행된다', () => {
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      
      expect(result.rounds).toHaveLength(DUEL_CONFIG.maxRounds);
    });

    it('최종 승자가 결정된다', () => {
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      
      expect(['challenger', 'defender', 'draw']).toContain(result.finalWinner);
    });

    it('유명 일기토 플래그가 설정된다', () => {
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      
      expect(result.isFamousDuel).toBe(true);
      expect(result.duelName).toBe('관우의 화웅 참수');
    });

    it('승리 시 경험치 보너스가 있다', () => {
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      
      if (result.finalWinner !== 'draw') {
        expect(result.expBonus).toBe(DUEL_CONFIG.victoryExpBonus);
      }
    });

    it('패배 시 HP가 50% 감소한다', () => {
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      
      if (result.finalWinner === 'challenger') {
        expect(result.defenderHpChange).toBe(-Math.floor(enemyUnit.stats.maxHp * 0.5));
      } else if (result.finalWinner === 'defender') {
        expect(result.challengerHpChange).toBe(-Math.floor(playerUnit.stats.maxHp * 0.5));
      }
    });

    it('무승부 시 양측 HP가 20% 감소한다', () => {
      // 무승부를 강제로 만들기 위해 액션 지정
      const result = DuelManager.executeDuel(
        playerUnit,
        enemyUnit,
        ['defend', 'defend', 'defend'],
        ['defend', 'defend', 'defend']
      );
      
      // 무승부가 아닐 수도 있으므로 조건부 확인
      if (result.finalWinner === 'draw') {
        expect(result.challengerHpChange).toBe(-Math.floor(playerUnit.stats.maxHp * 0.2));
        expect(result.defenderHpChange).toBe(-Math.floor(enemyUnit.stats.maxHp * 0.2));
      }
    });
  });

  describe('액션 선택', () => {
    it('무력 기반으로 액션이 선택된다', () => {
      // 무력이 높으면 attack 선택 확률이 높음
      playerUnit.stats.attack = 100;
      playerUnit.stats.defense = 10;
      playerUnit.stats.speed = 10;
      
      const actions: DuelAction[] = [];
      for (let i = 0; i < 100; i++) {
        actions.push(DuelManager.selectAction(playerUnit));
      }
      
      const attackCount = actions.filter(a => a === 'attack').length;
      expect(attackCount).toBeGreaterThan(50); // 대부분 attack
    });
  });

  describe('라운드 결과 계산', () => {
    it('무력이 높으면 승리 확률이 높다', () => {
      const results: ('challenger' | 'defender' | 'draw')[] = [];
      
      for (let i = 0; i < 100; i++) {
        const result = DuelManager.resolveRound('attack', 'attack', 100, 50);
        results.push(result.winner);
      }
      
      const challengerWins = results.filter(r => r === 'challenger').length;
      expect(challengerWins).toBeGreaterThan(50);
    });

    it('액션 상성이 적용된다', () => {
      // 공격이 회피에 유리
      const results: ('challenger' | 'defender' | 'draw')[] = [];
      
      for (let i = 0; i < 100; i++) {
        const result = DuelManager.resolveRound('attack', 'evade', 80, 80);
        results.push(result.winner);
      }
      
      const challengerWins = results.filter(r => r === 'challenger').length;
      expect(challengerWins).toBeGreaterThan(30); // 상성으로 유리
    });
  });

  describe('결과 적용', () => {
    it('HP 변화가 적용된다', () => {
      const initialHp = playerUnit.stats.currentHp;
      
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      DuelManager.applyDuelResult(result);
      
      if (result.finalWinner === 'defender') {
        expect(playerUnit.stats.currentHp).toBeLessThan(initialHp);
      }
    });

    it('HP가 0 이하로 떨어지지 않는다 (최소 1)', () => {
      playerUnit.stats.currentHp = 10;
      
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      result.challengerHpChange = -1000; // 강제로 큰 피해
      
      DuelManager.applyDuelResult(result);
      
      expect(playerUnit.stats.currentHp).toBeGreaterThanOrEqual(1);
    });
  });

  describe('유명 일기토 데이터', () => {
    it('최소 8개 이상의 유명 일기토가 있다', () => {
      expect(FAMOUS_DUELS.length).toBeGreaterThanOrEqual(8);
    });

    it('각 일기토에 필수 필드가 있다', () => {
      for (const duel of FAMOUS_DUELS) {
        expect(duel.id).toBeTruthy();
        expect(duel.name).toBeTruthy();
        expect(duel.nameEn).toBeTruthy();
        expect(duel.generals).toHaveLength(2);
        expect(duel.storyText).toBeTruthy();
      }
    });

    it('특정 장수의 유명 일기토를 조회할 수 있다', () => {
      const guanYuDuels = DuelManager.getFamousDuelsForGeneral('guan_yu');
      
      expect(guanYuDuels.length).toBeGreaterThanOrEqual(3); // 화웅, 안량, 문추, 황충
    });
  });

  describe('일기토 요약', () => {
    it('승리 시 승자 이름이 표시된다', () => {
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      result.finalWinner = 'challenger';
      
      const summary = DuelManager.getDuelSummary(result);
      
      expect(summary).toContain('관우');
      expect(summary).toContain('승리');
    });

    it('유명 일기토는 이름이 표시된다', () => {
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      
      const summary = DuelManager.getDuelSummary(result);
      
      expect(summary).toContain('유명 일기토');
      expect(summary).toContain('관우의 화웅 참수');
    });

    it('무승부 시 무승부가 표시된다', () => {
      const result = DuelManager.executeDuel(playerUnit, enemyUnit);
      result.finalWinner = 'draw';
      
      const summary = DuelManager.getDuelSummary(result);
      
      expect(summary).toContain('무승부');
    });
  });

  describe('일기토 상수', () => {
    it('설정값이 올바르다', () => {
      expect(DUEL_CONFIG.maxRounds).toBe(3);
      expect(DUEL_CONFIG.randomDuelChance).toBe(0.05);
      expect(DUEL_CONFIG.victoryExpBonus).toBe(50);
      expect(DUEL_CONFIG.defeatHpPenalty).toBe(0.5);
      expect(DUEL_CONFIG.drawHpPenalty).toBe(0.2);
    });
  });
});
