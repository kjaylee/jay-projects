import { describe, it, expect, vi } from 'vitest';
import { Formation } from '../../src/entities/Formation';
import { BattleUnit, createBattleUnit } from '../../src/entities/BattleUnit';
import stagesData from '../../src/data/stages.json';
import generalsData from '../../src/data/generals.json';

// BattleManager의 핵심 로직을 분리하여 테스트 (Phaser 의존성 제거)

interface StageEnemy {
  generalId: string;
  level: number;
  position: { row: number; col: number };
}

interface Stage {
  id: string;
  chapter: number;
  chapterName: string;
  stageName: string;
  enemies: StageEnemy[];
  rewards: {
    gold: number;
    exp: number;
    items: Array<{ itemId: string; count: number }>;
  };
}

interface EnemyGeneral {
  id: string;
  name: string;
  baseStats: {
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
    hp: number;
  };
  skillIds?: string[];
}

interface General {
  id: string;
  name: string;
  grade: string;
  baseStats: {
    attack: number;
    defense: number;
    intelligence: number;
    speed: number;
  };
  skillIds?: string[];
}

// 테스트용 유틸 함수들 (BattleManager 내부 로직 복제)
function findStage(stageId: string): Stage | null {
  return (stagesData.stages as Stage[]).find((s) => s.id === stageId) ?? null;
}

function findGeneral(generalId: string): General | null {
  return (generalsData.generals as General[]).find((g) => g.id === generalId) ?? null;
}

function findEnemyGeneral(generalId: string): EnemyGeneral | null {
  return (stagesData.enemyGenerals as EnemyGeneral[]).find((g) => g.id === generalId) ?? null;
}

function calculateBaseHp(general: General): number {
  const gradeMultiplier: Record<string, number> = {
    N: 1.0,
    R: 1.2,
    SR: 1.5,
    SSR: 1.8,
    UR: 2.2,
  };
  const mult = gradeMultiplier[general.grade] ?? 1.0;
  return Math.floor(
    (general.baseStats.attack + general.baseStats.defense + general.baseStats.intelligence) *
      3 *
      mult
  );
}

function convertFormationToUnits(formation: Formation): BattleUnit[] {
  const units: BattleUnit[] = [];
  const formationJson = formation.toJSON();

  for (const pos of formationJson.positions) {
    const general = findGeneral(pos.generalId);
    if (!general) continue;

    const unit = createBattleUnit({
      id: `player_${pos.generalId}_${pos.row}_${pos.col}`,
      generalId: pos.generalId,
      name: general.name,
      team: 'player',
      position: { row: pos.row, col: pos.col },
      baseStats: {
        attack: general.baseStats.attack,
        defense: general.baseStats.defense,
        intelligence: general.baseStats.intelligence,
        speed: general.baseStats.speed,
        hp: calculateBaseHp(general),
      },
      level: 1,
      skills: general.skillIds ?? [],
    });

    units.push(unit);
  }

  return units;
}

function convertStageEnemies(stage: Stage): BattleUnit[] {
  const units: BattleUnit[] = [];

  for (const enemy of stage.enemies) {
    const enemyGeneral = findEnemyGeneral(enemy.generalId);
    if (!enemyGeneral) continue;

    const unit = createBattleUnit({
      id: `enemy_${enemy.generalId}_${enemy.position.row}_${enemy.position.col}`,
      generalId: enemy.generalId,
      name: enemyGeneral.name,
      team: 'enemy',
      position: enemy.position,
      baseStats: enemyGeneral.baseStats,
      level: enemy.level,
      skills: enemyGeneral.skillIds ?? [],
    });

    units.push(unit);
  }

  return units;
}

function getTargetsByRowPriority(units: BattleUnit[]): BattleUnit[] {
  return units.filter((u) => u.isAlive).sort((a, b) => a.position.row - b.position.row);
}

describe('BattleUnit', () => {
  describe('createBattleUnit', () => {
    it('레벨 1 유닛 생성', () => {
      const unit = createBattleUnit({
        id: 'test_1',
        generalId: 'guan_yu',
        name: '관우',
        team: 'player',
        position: { row: 0, col: 1 },
        baseStats: {
          attack: 100,
          defense: 80,
          intelligence: 70,
          speed: 75,
          hp: 500,
        },
        level: 1,
        skills: ['skill_green_dragon'],
      });

      expect(unit.id).toBe('test_1');
      expect(unit.generalId).toBe('guan_yu');
      expect(unit.name).toBe('관우');
      expect(unit.team).toBe('player');
      expect(unit.position).toEqual({ row: 0, col: 1 });
      expect(unit.stats.maxHp).toBe(500);
      expect(unit.stats.currentHp).toBe(500);
      expect(unit.stats.attack).toBe(100);
      expect(unit.stats.defense).toBe(80);
      expect(unit.stats.intelligence).toBe(70);
      expect(unit.stats.speed).toBe(75);
      expect(unit.skills).toEqual(['skill_green_dragon']);
      expect(unit.isAlive).toBe(true);
    });

    it('레벨 10 유닛 생성 (스탯 90% 증가)', () => {
      const unit = createBattleUnit({
        id: 'test_2',
        generalId: 'zhang_fei',
        name: '장비',
        team: 'player',
        position: { row: 0, col: 0 },
        baseStats: {
          attack: 100,
          defense: 100,
          intelligence: 100,
          speed: 100,
          hp: 1000,
        },
        level: 10,
      });

      // 레벨 10: 1 + (10-1) * 0.1 = 1.9 배
      expect(unit.stats.maxHp).toBe(1900);
      expect(unit.stats.attack).toBe(190);
      expect(unit.stats.defense).toBe(190);
      expect(unit.stats.intelligence).toBe(190);
      expect(unit.stats.speed).toBe(190);
    });

    it('스킬 없이 생성 시 빈 배열', () => {
      const unit = createBattleUnit({
        id: 'test_3',
        generalId: 'soldier',
        name: '병사',
        team: 'enemy',
        position: { row: 0, col: 0 },
        baseStats: { attack: 10, defense: 10, intelligence: 10, speed: 10, hp: 100 },
      });

      expect(unit.skills).toEqual([]);
    });
  });
});

describe('Formation → BattleUnit 변환', () => {
  it('Formation에서 BattleUnit으로 변환', () => {
    const formation = new Formation('test_user');
    formation.placeUnit('guan_yu', 0, 1);
    formation.placeUnit('zhang_fei', 0, 0);
    formation.placeUnit('zhao_yun', 1, 1);

    const playerUnits = convertFormationToUnits(formation);

    expect(playerUnits.length).toBe(3);

    const guanYu = playerUnits.find((u) => u.generalId === 'guan_yu');
    expect(guanYu).toBeDefined();
    expect(guanYu?.name).toBe('관우');
    expect(guanYu?.team).toBe('player');
    expect(guanYu?.position).toEqual({ row: 0, col: 1 });
  });

  it('존재하지 않는 장수 스킵', () => {
    const formation = new Formation('test_user');
    formation.placeUnit('invalid_general', 0, 0);
    formation.placeUnit('guan_yu', 0, 1);

    const playerUnits = convertFormationToUnits(formation);

    expect(playerUnits.length).toBe(1);
    expect(playerUnits[0].generalId).toBe('guan_yu');
  });

  it('등급별 HP 계산', () => {
    // N등급 (1.0배)
    const nGeneral = findGeneral('zhang_song');
    expect(nGeneral).toBeDefined();
    if (nGeneral) {
      const hp = calculateBaseHp(nGeneral);
      // (35 + 40 + 75) * 3 * 1.0 = 450
      expect(hp).toBe(450);
    }

    // SR등급 (1.5배)
    const srGeneral = findGeneral('guan_yu');
    expect(srGeneral).toBeDefined();
    if (srGeneral) {
      const hp = calculateBaseHp(srGeneral);
      // (97 + 85 + 75) * 3 * 1.5 = 257 * 3 * 1.5 = 1156.5 → floor → 1156
      expect(hp).toBe(1156);
    }

    // SSR등급 (1.8배)
    const ssrGeneral = findGeneral('zhuge_liang');
    expect(ssrGeneral).toBeDefined();
    if (ssrGeneral) {
      const hp = calculateBaseHp(ssrGeneral);
      // (45 + 70 + 100) * 3 * 1.8 = 1161
      expect(hp).toBe(1161);
    }
  });
});

describe('Stage → 적 유닛 변환', () => {
  it('Stage에서 적 유닛 생성', () => {
    const stage = findStage('1-1');
    expect(stage).toBeDefined();

    if (stage) {
      const enemyUnits = convertStageEnemies(stage);
      expect(enemyUnits.length).toBeGreaterThan(0);

      const enemy = enemyUnits[0];
      expect(enemy.team).toBe('enemy');
      expect(enemy.isAlive).toBe(true);
    }
  });

  it('스테이지 1-10 보스전 적군 확인', () => {
    const stage = findStage('1-10');
    expect(stage).toBeDefined();

    if (stage) {
      const enemyUnits = convertStageEnemies(stage);
      // 장각 보스전: 6명 (장각, 장보, 장량, 부장 3명)
      expect(enemyUnits.length).toBe(6);

      const zhangJiao = enemyUnits.find((u) => u.generalId === 'zhang_jiao');
      expect(zhangJiao).toBeDefined();
      expect(zhangJiao?.name).toBe('장각');
    }
  });

  it('적 레벨에 따른 스탯 증가', () => {
    const stage1 = findStage('1-1');
    const stage10 = findStage('1-10');
    expect(stage1).toBeDefined();
    expect(stage10).toBeDefined();

    if (stage1 && stage10) {
      const units1 = convertStageEnemies(stage1);
      const units10 = convertStageEnemies(stage10);

      // 같은 황건 병졸이지만 레벨 차이로 스탯이 다름
      const soldier1 = units1.find((u) => u.generalId === 'yellow_soldier_1');
      const soldier10 = units10.find((u) =>
        u.generalId.includes('yellow_captain_1')
      );

      expect(soldier1).toBeDefined();
      expect(soldier10).toBeDefined();

      // 레벨 10 유닛이 더 강함
      if (soldier1 && soldier10) {
        expect(soldier10.stats.attack).toBeGreaterThan(soldier1.stats.attack);
      }
    }
  });
});

describe('전열 우선 타겟팅', () => {
  it('row 0 → 1 → 2 순서로 타겟 선택', () => {
    const units: BattleUnit[] = [
      createBattleUnit({
        id: '1',
        generalId: 'a',
        name: '후열',
        team: 'enemy',
        position: { row: 2, col: 0 },
        baseStats: { attack: 10, defense: 10, intelligence: 10, speed: 10, hp: 100 },
      }),
      createBattleUnit({
        id: '2',
        generalId: 'b',
        name: '전열',
        team: 'enemy',
        position: { row: 0, col: 1 },
        baseStats: { attack: 10, defense: 10, intelligence: 10, speed: 10, hp: 100 },
      }),
      createBattleUnit({
        id: '3',
        generalId: 'c',
        name: '중열',
        team: 'enemy',
        position: { row: 1, col: 1 },
        baseStats: { attack: 10, defense: 10, intelligence: 10, speed: 10, hp: 100 },
      }),
    ];

    const sorted = getTargetsByRowPriority(units);

    expect(sorted[0].name).toBe('전열'); // row 0
    expect(sorted[1].name).toBe('중열'); // row 1
    expect(sorted[2].name).toBe('후열'); // row 2
  });

  it('사망한 유닛 제외', () => {
    const units: BattleUnit[] = [
      createBattleUnit({
        id: '1',
        generalId: 'a',
        name: '전열(사망)',
        team: 'enemy',
        position: { row: 0, col: 0 },
        baseStats: { attack: 10, defense: 10, intelligence: 10, speed: 10, hp: 100 },
      }),
      createBattleUnit({
        id: '2',
        generalId: 'b',
        name: '중열(생존)',
        team: 'enemy',
        position: { row: 1, col: 1 },
        baseStats: { attack: 10, defense: 10, intelligence: 10, speed: 10, hp: 100 },
      }),
    ];

    units[0].isAlive = false;

    const targets = getTargetsByRowPriority(units);

    expect(targets.length).toBe(1);
    expect(targets[0].name).toBe('중열(생존)');
  });
});

describe('스테이지 데이터 유효성', () => {
  it('모든 스테이지에 적군이 존재', () => {
    for (const stage of stagesData.stages) {
      expect(stage.enemies.length).toBeGreaterThan(0);
    }
  });

  it('모든 적군 장수가 enemyGenerals에 정의됨', () => {
    for (const stage of stagesData.stages) {
      for (const enemy of stage.enemies) {
        const general = findEnemyGeneral(enemy.generalId);
        expect(general).toBeDefined();
      }
    }
  });

  it('모든 스테이지에 보상 정보 존재', () => {
    for (const stage of stagesData.stages) {
      expect(stage.rewards).toBeDefined();
      expect(stage.rewards.gold).toBeGreaterThanOrEqual(0);
      expect(stage.rewards.exp).toBeGreaterThanOrEqual(0);
    }
  });
});
