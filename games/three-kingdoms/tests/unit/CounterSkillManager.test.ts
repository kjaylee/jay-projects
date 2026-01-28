import { describe, it, expect, beforeEach } from 'vitest';
import { 
  CounterSkillManager, 
  COUNTER_SKILLS, 
  SKILL_CATEGORY_MAP,
  CounterSkillType 
} from '../../src/managers/CounterSkillManager';
import { BattleUnit, createBattleUnit } from '../../src/entities/BattleUnit';

describe('CounterSkillManager', () => {
  let manager: CounterSkillManager;
  let defender: BattleUnit;

  beforeEach(() => {
    manager = new CounterSkillManager();

    defender = createBattleUnit({
      id: 'defender_1',
      generalId: 'zhuge_liang',
      name: '제갈량',
      team: 'player',
      position: { row: 1, col: 1 },
      baseStats: { attack: 45, defense: 70, intelligence: 100, speed: 80, hp: 800 },
      level: 1,
      skills: [],
    });
  });

  describe('계략 간파 등록 및 조회', () => {
    it('유닛에 계략 간파를 등록할 수 있다', () => {
      manager.registerCounter(defender.id, 'fire_counter');

      expect(manager.hasCounter(defender.id, 'fire_counter')).toBe(true);
      expect(manager.getCounters(defender.id)).toContain('fire_counter');
    });

    it('같은 계략 간파를 중복 등록해도 하나만 유지된다', () => {
      manager.registerCounter(defender.id, 'fire_counter');
      manager.registerCounter(defender.id, 'fire_counter');

      expect(manager.getCounters(defender.id).filter(c => c === 'fire_counter').length).toBe(1);
    });

    it('여러 계략 간파를 등록할 수 있다', () => {
      manager.registerCounter(defender.id, 'fire_counter');
      manager.registerCounter(defender.id, 'water_counter');

      expect(manager.getCounters(defender.id)).toHaveLength(2);
    });

    it('등록되지 않은 유닛은 빈 배열을 반환한다', () => {
      expect(manager.getCounters('unknown_unit')).toEqual([]);
    });
  });

  describe('스킬 카테고리', () => {
    it('화계류 스킬을 fire로 분류한다', () => {
      expect(manager.getSkillCategory('fire_attack')).toBe('fire');
      expect(manager.getSkillCategory('skill_fire_attack')).toBe('fire');
      expect(manager.getSkillCategory('skill_yiling_fire')).toBe('fire');
      expect(manager.getSkillCategory('skill_red_cliff')).toBe('fire');
    });

    it('수계류 스킬을 water로 분류한다', () => {
      expect(manager.getSkillCategory('water_attack')).toBe('water');
      expect(manager.getSkillCategory('skill_water_attack')).toBe('water');
    });

    it('낙석/함정류 스킬을 trap으로 분류한다', () => {
      expect(manager.getSkillCategory('rockfall')).toBe('trap');
      expect(manager.getSkillCategory('skill_ambush')).toBe('trap');
    });

    it('혼란류 스킬을 confusion으로 분류한다', () => {
      expect(manager.getSkillCategory('confusion')).toBe('confusion');
      expect(manager.getSkillCategory('skill_poison_plot')).toBe('confusion');
    });

    it('분류되지 않은 스킬은 null을 반환한다', () => {
      expect(manager.getSkillCategory('unknown_skill')).toBeNull();
    });

    it('isCounterable로 무효화 가능 여부를 확인한다', () => {
      expect(manager.isCounterable('fire_attack')).toBe(true);
      expect(manager.isCounterable('unknown_skill')).toBe(false);
    });
  });

  describe('화심계 (Fire Counter)', () => {
    beforeEach(() => {
      manager.registerCounter(defender.id, 'fire_counter');
    });

    it('화계 스킬을 45% 확률로 무효화한다', () => {
      // 확률 통과 설정
      manager.setRandomFn(() => 0.3);

      const result = manager.tryCounter(defender, 'fire_attack', '화계');

      expect(result.countered).toBe(true);
      expect(result.counterType).toBe('fire_counter');
      expect(result.counterName).toBe('화심계');
      expect(result.message).toContain('무효화');
    });

    it('확률 실패 시 무효화하지 않는다', () => {
      manager.setRandomFn(() => 0.6); // 45% 초과

      const result = manager.tryCounter(defender, 'fire_attack', '화계');

      expect(result.countered).toBe(false);
      expect(result.message).toContain('실패');
    });

    it('화계가 아닌 스킬은 무효화하지 않는다', () => {
      manager.setRandomFn(() => 0.1);

      const result = manager.tryCounter(defender, 'water_attack', '수계');

      expect(result.countered).toBe(false);
    });
  });

  describe('수심계 (Water Counter)', () => {
    beforeEach(() => {
      manager.registerCounter(defender.id, 'water_counter');
    });

    it('수계 스킬을 45% 확률로 무효화한다', () => {
      manager.setRandomFn(() => 0.3);

      const result = manager.tryCounter(defender, 'water_attack', '수계');

      expect(result.countered).toBe(true);
      expect(result.counterType).toBe('water_counter');
      expect(result.counterName).toBe('수심계');
    });

    it('확률 실패 시 무효화하지 않는다', () => {
      manager.setRandomFn(() => 0.6);

      const result = manager.tryCounter(defender, 'water_attack', '수계');

      expect(result.countered).toBe(false);
    });
  });

  describe('공심계 (Trap Counter)', () => {
    beforeEach(() => {
      manager.registerCounter(defender.id, 'trap_counter');
    });

    it('낙석/함정 스킬을 45% 확률로 무효화한다', () => {
      manager.setRandomFn(() => 0.3);

      const result = manager.tryCounter(defender, 'rockfall', '낙석');

      expect(result.countered).toBe(true);
      expect(result.counterType).toBe('trap_counter');
      expect(result.counterName).toBe('공심계');
    });

    it('매복도 무효화할 수 있다', () => {
      manager.setRandomFn(() => 0.3);

      const result = manager.tryCounter(defender, 'skill_ambush', '매복');

      expect(result.countered).toBe(true);
    });
  });

  describe('심묘계 (Confusion Counter)', () => {
    beforeEach(() => {
      manager.registerCounter(defender.id, 'confusion_counter');
    });

    it('혼란 스킬을 45% 확률로 무효화한다', () => {
      manager.setRandomFn(() => 0.3);

      const result = manager.tryCounter(defender, 'confusion', '혼란');

      expect(result.countered).toBe(true);
      expect(result.counterType).toBe('confusion_counter');
      expect(result.counterName).toBe('심묘계');
    });

    it('독계도 무효화할 수 있다', () => {
      manager.setRandomFn(() => 0.3);

      const result = manager.tryCounter(defender, 'skill_poison_plot', '독계');

      expect(result.countered).toBe(true);
    });
  });

  describe('여러 방어자 중 무효화', () => {
    it('여러 방어자 중 성공한 첫 번째를 반환한다', () => {
      const defender2 = createBattleUnit({
        id: 'defender_2',
        generalId: 'sima_yi',
        name: '사마의',
        team: 'player',
        position: { row: 1, col: 2 },
        baseStats: { attack: 55, defense: 75, intelligence: 98, speed: 72, hp: 850 },
        level: 1,
        skills: [],
      });

      manager.registerCounter(defender.id, 'fire_counter');
      manager.registerCounter(defender2.id, 'fire_counter');

      // 첫 번째 실패, 두 번째 성공
      let callCount = 0;
      manager.setRandomFn(() => {
        callCount++;
        return callCount === 1 ? 0.6 : 0.3;
      });

      const result = manager.tryCounterForAny([defender, defender2], 'fire_attack', '화계');

      expect(result.countered).toBe(true);
      expect(result.defender?.id).toBe(defender2.id);
    });

    it('모두 실패하면 countered: false를 반환한다', () => {
      manager.registerCounter(defender.id, 'fire_counter');
      manager.setRandomFn(() => 0.6);

      const result = manager.tryCounterForAny([defender], 'fire_attack', '화계');

      expect(result.countered).toBe(false);
    });
  });

  describe('통계', () => {
    it('간파 시도 통계를 기록한다', () => {
      manager.registerCounter(defender.id, 'fire_counter');
      manager.registerCounter(defender.id, 'water_counter');

      let callCount = 0;
      manager.setRandomFn(() => {
        callCount++;
        return callCount <= 2 ? 0.3 : 0.6; // 처음 두 번 성공, 나머지 실패
      });

      manager.tryCounter(defender, 'fire_attack', '화계');
      manager.tryCounter(defender, 'fire_attack', '화계');
      manager.tryCounter(defender, 'water_attack', '수계');

      const stats = manager.getCounterStats();

      expect(stats.total).toBe(3);
      expect(stats.success).toBe(2);
      expect(stats.byType.fire_counter.attempts).toBe(2);
      expect(stats.byType.fire_counter.successes).toBe(2);
      expect(stats.byType.water_counter.attempts).toBe(1);
      expect(stats.byType.water_counter.successes).toBe(0);
    });

    it('clearHistory로 기록을 초기화한다', () => {
      manager.registerCounter(defender.id, 'fire_counter');
      manager.setRandomFn(() => 0.3);
      manager.tryCounter(defender, 'fire_attack', '화계');

      manager.clearHistory();

      const stats = manager.getCounterStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('유틸리티 메서드', () => {
    it('reset()으로 모든 상태가 초기화된다', () => {
      manager.registerCounter(defender.id, 'fire_counter');
      manager.setRandomFn(() => 0.3);
      manager.tryCounter(defender, 'fire_attack', '화계');

      manager.reset();

      expect(manager.getCounters(defender.id)).toEqual([]);
      expect(manager.getCounterStats().total).toBe(0);
    });

    it('정적 메서드로 카운터 설정을 조회할 수 있다', () => {
      const config = CounterSkillManager.getCounterConfig('fire_counter');

      expect(config.name).toBe('화심계');
      expect(config.nameEn).toBe('Fire Heart Strategy');
      expect(config.counterChance).toBe(0.45);
    });

    it('모든 계략 간파 목록을 조회할 수 있다', () => {
      const counters = CounterSkillManager.getAllCounters();

      expect(counters).toHaveLength(4);
      expect(counters.map(c => c.type)).toContain('fire_counter');
      expect(counters.map(c => c.type)).toContain('water_counter');
      expect(counters.map(c => c.type)).toContain('trap_counter');
      expect(counters.map(c => c.type)).toContain('confusion_counter');
    });

    it('카테고리별 스킬 목록을 조회할 수 있다', () => {
      const fireSkills = CounterSkillManager.getSkillsByCategory('fire');

      expect(fireSkills.length).toBeGreaterThan(0);
      expect(fireSkills).toContain('fire_attack');
    });

    it('새 스킬을 카테고리에 등록할 수 있다', () => {
      CounterSkillManager.registerSkillCategory('new_fire_skill', 'fire');

      expect(manager.getSkillCategory('new_fire_skill')).toBe('fire');
    });
  });

  describe('COUNTER_SKILLS 상수', () => {
    it('모든 카운터가 올바른 구조를 가진다', () => {
      const types: CounterSkillType[] = ['fire_counter', 'water_counter', 'trap_counter', 'confusion_counter'];

      for (const type of types) {
        const config = COUNTER_SKILLS[type];
        expect(config).toBeDefined();
        expect(config.id).toBeTruthy();
        expect(config.name).toBeTruthy();
        expect(config.nameEn).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.counterChance).toBe(0.45);
      }
    });
  });

  describe('SKILL_CATEGORY_MAP', () => {
    it('충분한 수의 스킬이 매핑되어 있다', () => {
      const skillCount = Object.keys(SKILL_CATEGORY_MAP).length;
      expect(skillCount).toBeGreaterThanOrEqual(15);
    });

    it('모든 카테고리가 최소 하나의 스킬을 가진다', () => {
      const categories = ['fire', 'water', 'trap', 'confusion'] as const;
      
      for (const category of categories) {
        const skills = Object.entries(SKILL_CATEGORY_MAP)
          .filter(([_, cat]) => cat === category);
        expect(skills.length).toBeGreaterThan(0);
      }
    });
  });
});
