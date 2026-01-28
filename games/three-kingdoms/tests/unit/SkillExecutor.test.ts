import { describe, it, expect, beforeEach } from 'vitest';
import { SkillExecutor } from '../../src/managers/SkillExecutor';
import { BattleUnit, createBattleUnit } from '../../src/entities/BattleUnit';
import { Skill } from '../../src/entities/Skill';

describe('SkillExecutor', () => {
  let playerUnit: BattleUnit;
  let enemyUnit: BattleUnit;
  let allUnits: BattleUnit[];

  beforeEach(() => {
    playerUnit = createBattleUnit({
      id: 'player_1',
      generalId: 'zhuge_liang',
      name: '제갈량',
      team: 'player',
      position: { row: 1, col: 1 },
      baseStats: {
        attack: 80,
        defense: 70,
        intelligence: 150,
        speed: 100,
        hp: 500,
      },
      level: 1,
      skills: ['fire_attack', 'heal'],
    });

    enemyUnit = createBattleUnit({
      id: 'enemy_1',
      generalId: 'enemy_soldier',
      name: '적병',
      team: 'enemy',
      position: { row: 0, col: 1 },
      baseStats: {
        attack: 60,
        defense: 50,
        intelligence: 30,
        speed: 80,
        hp: 300,
      },
      level: 1,
      skills: [],
    });

    allUnits = [playerUnit, enemyUnit];
  });

  describe('canUseSkill', () => {
    it('스킬 보유 시 사용 가능', () => {
      expect(SkillExecutor.canUseSkill(playerUnit, 'fire_attack')).toBe(true);
    });

    it('스킬 미보유 시 사용 불가', () => {
      expect(SkillExecutor.canUseSkill(playerUnit, 'water_attack')).toBe(false);
    });

    it('쿨다운 중 사용 불가', () => {
      playerUnit.skillCooldowns.set('fire_attack', 3);
      expect(SkillExecutor.canUseSkill(playerUnit, 'fire_attack')).toBe(false);
    });

    it('사망 시 사용 불가', () => {
      playerUnit.isAlive = false;
      expect(SkillExecutor.canUseSkill(playerUnit, 'fire_attack')).toBe(false);
    });
  });

  describe('getReadySkill', () => {
    it('쿨다운 0인 스킬 반환', () => {
      const skill = SkillExecutor.getReadySkill(playerUnit);
      expect(skill).toBe('fire_attack');
    });

    it('모든 스킬 쿨다운 중이면 null', () => {
      playerUnit.skillCooldowns.set('fire_attack', 3);
      playerUnit.skillCooldowns.set('heal', 2);
      const skill = SkillExecutor.getReadySkill(playerUnit);
      expect(skill).toBeNull();
    });

    it('스킬 없으면 null', () => {
      const skill = SkillExecutor.getReadySkill(enemyUnit);
      expect(skill).toBeNull();
    });
  });

  describe('reduceCooldowns', () => {
    it('쿨다운 1 감소', () => {
      playerUnit.skillCooldowns.set('fire_attack', 3);
      playerUnit.skillCooldowns.set('heal', 1);

      SkillExecutor.reduceCooldowns([playerUnit]);

      expect(playerUnit.skillCooldowns.get('fire_attack')).toBe(2);
      expect(playerUnit.skillCooldowns.get('heal')).toBe(0);
    });

    it('쿨다운 0 이하로 감소하지 않음', () => {
      playerUnit.skillCooldowns.set('fire_attack', 0);

      SkillExecutor.reduceCooldowns([playerUnit]);

      expect(playerUnit.skillCooldowns.get('fire_attack')).toBe(0);
    });

    it('사망 유닛은 쿨다운 감소 안함', () => {
      playerUnit.skillCooldowns.set('fire_attack', 3);
      playerUnit.isAlive = false;

      SkillExecutor.reduceCooldowns([playerUnit]);

      expect(playerUnit.skillCooldowns.get('fire_attack')).toBe(3);
    });
  });

  describe('executeSkill', () => {
    it('데미지 스킬 적용', () => {
      const initialHp = enemyUnit.stats.currentHp;
      const result = SkillExecutor.executeSkill(playerUnit, 'fire_attack', allUnits);

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.skillName).toBe('화계');
      expect(result!.totalDamage).toBeGreaterThan(0);
      expect(enemyUnit.stats.currentHp).toBeLessThan(initialHp);
    });

    it('회복 스킬 적용', () => {
      // 체력 감소
      playerUnit.stats.currentHp = 200;
      const initialHp = playerUnit.stats.currentHp;

      const result = SkillExecutor.executeSkill(playerUnit, 'heal', allUnits);

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.totalHeal).toBeGreaterThan(0);
      expect(playerUnit.stats.currentHp).toBeGreaterThan(initialHp);
    });

    it('스킬 사용 후 쿨다운 설정', () => {
      expect(playerUnit.skillCooldowns.get('fire_attack')).toBe(0);

      SkillExecutor.executeSkill(playerUnit, 'fire_attack', allUnits);

      expect(playerUnit.skillCooldowns.get('fire_attack')).toBeGreaterThan(0);
    });

    it('존재하지 않는 스킬 실행 시 null', () => {
      const result = SkillExecutor.executeSkill(playerUnit, 'nonexistent_skill', allUnits);
      expect(result).toBeNull();
    });
  });

  describe('selectTargets', () => {
    let allies: BattleUnit[];
    let enemies: BattleUnit[];

    beforeEach(() => {
      allies = [
        createBattleUnit({
          id: 'ally_1',
          generalId: 'ally1',
          name: '아군1',
          team: 'player',
          position: { row: 0, col: 0 },
          baseStats: { attack: 100, defense: 80, intelligence: 60, speed: 90, hp: 400 },
          skills: [],
        }),
        createBattleUnit({
          id: 'ally_2',
          generalId: 'ally2',
          name: '아군2',
          team: 'player',
          position: { row: 1, col: 1 },
          baseStats: { attack: 100, defense: 80, intelligence: 60, speed: 90, hp: 400 },
          skills: [],
        }),
      ];

      enemies = [
        createBattleUnit({
          id: 'enemy_1',
          generalId: 'enemy1',
          name: '적1',
          team: 'enemy',
          position: { row: 0, col: 0 },
          baseStats: { attack: 80, defense: 60, intelligence: 40, speed: 70, hp: 300 },
          skills: [],
        }),
        createBattleUnit({
          id: 'enemy_2',
          generalId: 'enemy2',
          name: '적2',
          team: 'enemy',
          position: { row: 0, col: 1 },
          baseStats: { attack: 80, defense: 60, intelligence: 40, speed: 70, hp: 300 },
          skills: [],
        }),
        createBattleUnit({
          id: 'enemy_3',
          generalId: 'enemy3',
          name: '적3',
          team: 'enemy',
          position: { row: 1, col: 0 },
          baseStats: { attack: 80, defense: 60, intelligence: 40, speed: 70, hp: 300 },
          skills: [],
        }),
      ];

      allUnits = [...allies, ...enemies];
    });

    it('self 타겟', () => {
      const skill = new Skill({
        id: 'self-buff',
        name: '자가버프',
        type: 'active',
        target: 'self',
        effects: [{ type: 'buff', value: 30, attribute: 'attack' }],
      });

      const targets = SkillExecutor.selectTargets(allies[0], skill, allUnits);
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('ally_1');
    });

    it('enemy_all 타겟', () => {
      const skill = new Skill({
        id: 'aoe',
        name: '광역기',
        type: 'active',
        target: 'enemy_all',
        effects: [{ type: 'damage', value: 100 }],
      });

      const targets = SkillExecutor.selectTargets(allies[0], skill, allUnits);
      expect(targets).toHaveLength(3);
      expect(targets.every(t => t.team === 'enemy')).toBe(true);
    });

    it('enemy_single 타겟 (전열 우선)', () => {
      const skill = new Skill({
        id: 'single',
        name: '단일기',
        type: 'active',
        target: 'enemy_single',
        effects: [{ type: 'damage', value: 150 }],
      });

      const targets = SkillExecutor.selectTargets(allies[0], skill, allUnits);
      expect(targets).toHaveLength(1);
      expect(targets[0].position.row).toBe(0);
    });

    it('enemy_row 타겟', () => {
      const skill = new Skill({
        id: 'row',
        name: '횡렬기',
        type: 'active',
        target: 'enemy_row',
        effects: [{ type: 'damage', value: 120 }],
      });

      const targets = SkillExecutor.selectTargets(allies[0], skill, allUnits);
      expect(targets.every(t => t.position.row === 0)).toBe(true);
      expect(targets).toHaveLength(2); // row 0에 적 2명
    });

    it('ally_all 타겟', () => {
      const skill = new Skill({
        id: 'heal-all',
        name: '전체회복',
        type: 'active',
        target: 'ally_all',
        effects: [{ type: 'heal', value: 30 }],
      });

      const targets = SkillExecutor.selectTargets(allies[0], skill, allUnits);
      expect(targets).toHaveLength(2);
      expect(targets.every(t => t.team === 'player')).toBe(true);
    });
  });

  describe('스킬 쿨다운 통합 테스트', () => {
    it('전투 중 스킬 자동 발동 시뮬레이션', () => {
      // 턴 1: 스킬 발동 (쿨다운 0)
      expect(SkillExecutor.canUseSkill(playerUnit, 'fire_attack')).toBe(true);
      SkillExecutor.executeSkill(playerUnit, 'fire_attack', allUnits);
      
      // 스킬 사용 후 쿨다운 설정됨
      const cooldown = playerUnit.skillCooldowns.get('fire_attack')!;
      expect(cooldown).toBeGreaterThan(0);
      expect(SkillExecutor.canUseSkill(playerUnit, 'fire_attack')).toBe(false);

      // 턴 2-N: 쿨다운 감소
      for (let i = 0; i < cooldown; i++) {
        SkillExecutor.reduceCooldowns([playerUnit]);
      }

      // 쿨다운 완료 → 다시 사용 가능
      expect(playerUnit.skillCooldowns.get('fire_attack')).toBe(0);
      expect(SkillExecutor.canUseSkill(playerUnit, 'fire_attack')).toBe(true);
    });
  });
});
