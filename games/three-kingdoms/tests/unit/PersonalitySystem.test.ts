import { describe, it, expect, beforeEach } from 'vitest';
import {
  PersonalityManager,
  getPersonalityManager,
  Personality,
  PersonalityTriggerContext,
} from '../../src/managers/PersonalityManager';
import { BattleUnit, createBattleUnit } from '../../src/entities/BattleUnit';

describe('PersonalityManager', () => {
  let manager: PersonalityManager;
  let testUnit: BattleUnit;

  beforeEach(() => {
    manager = new PersonalityManager();
    
    testUnit = createBattleUnit({
      id: 'test_unit',
      generalId: 'guan_yu',
      name: '관우',
      team: 'player',
      position: { row: 0, col: 0 },
      baseStats: { attack: 95, defense: 80, intelligence: 75, speed: 85, hp: 500 },
      level: 50,
      skills: [],
    });
  });

  describe('개성 로드', () => {
    it('개성 데이터가 로드된다', () => {
      const allPersonalities = manager.getAllPersonalities();
      
      expect(allPersonalities.length).toBeGreaterThanOrEqual(40);
    });

    it('장수별 개성이 로드된다', () => {
      const guanYuPersonalities = manager.getGeneralPersonalities('guan_yu');
      
      expect(guanYuPersonalities.length).toBeGreaterThan(0);
    });
  });

  describe('개성 조회', () => {
    it('ID로 개성을 조회할 수 있다', () => {
      const personality = manager.getPersonality('charge');
      
      expect(personality).not.toBeNull();
      expect(personality!.name).toBe('돌격');
    });

    it('존재하지 않는 개성은 null을 반환한다', () => {
      const personality = manager.getPersonality('nonexistent');
      
      expect(personality).toBeNull();
    });

    it('장수의 개성 목록을 조회할 수 있다', () => {
      const personalities = manager.getGeneralPersonalities('guan_yu');
      
      expect(personalities.some(p => p.id === 'loyalty')).toBe(true);
      expect(personalities.some(p => p.id === 'war_god')).toBe(true);
    });
  });

  describe('개성 할당', () => {
    it('장수에게 개성을 할당할 수 있다', () => {
      const result = manager.assignPersonality('test_general', 'charge');
      
      expect(result).toBe(true);
      
      const personalities = manager.getGeneralPersonalities('test_general');
      expect(personalities.some(p => p.id === 'charge')).toBe(true);
    });

    it('존재하지 않는 개성은 할당할 수 없다', () => {
      const result = manager.assignPersonality('test_general', 'nonexistent');
      
      expect(result).toBe(false);
    });

    it('중복 할당은 무시된다', () => {
      manager.assignPersonality('test_general', 'charge');
      manager.assignPersonality('test_general', 'charge');
      
      const personalities = manager.getGeneralPersonalities('test_general');
      const chargeCount = personalities.filter(p => p.id === 'charge').length;
      
      expect(chargeCount).toBe(1);
    });
  });

  describe('개성 제거', () => {
    it('장수의 개성을 제거할 수 있다', () => {
      manager.assignPersonality('test_general', 'charge');
      const result = manager.removePersonality('test_general', 'charge');
      
      expect(result).toBe(true);
      
      const personalities = manager.getGeneralPersonalities('test_general');
      expect(personalities.some(p => p.id === 'charge')).toBe(false);
    });

    it('없는 개성 제거는 false를 반환한다', () => {
      const result = manager.removePersonality('test_general', 'nonexistent');
      
      expect(result).toBe(false);
    });
  });

  describe('스탯 보정치 계산', () => {
    it('기본 보정치는 1.0이다', () => {
      const context: PersonalityTriggerContext = {
        unit: testUnit,
        allies: [],
        enemies: [],
      };
      
      const modifiers = manager.calculateStatModifiers('no_personality_general', context);
      
      expect(modifiers.attack).toBe(1.0);
      expect(modifiers.defense).toBe(1.0);
    });

    it('질풍(swift) 개성은 속도 +20%이다', () => {
      manager.assignPersonality('test_general', 'swift');
      
      const context: PersonalityTriggerContext = {
        unit: testUnit,
        allies: [],
        enemies: [],
      };
      
      const modifiers = manager.calculateStatModifiers('test_general', context);
      
      expect(modifiers.speed).toBeCloseTo(1.2);
    });

    it('불굴(unyielding)은 HP 30% 이하 시 공격력 +40%이다', () => {
      manager.assignPersonality('test_general', 'unyielding');
      
      const context: PersonalityTriggerContext = {
        unit: testUnit,
        allies: [],
        enemies: [],
        currentHpPercent: 0.25, // 25%
      };
      
      const modifiers = manager.calculateStatModifiers('test_general', context);
      
      expect(modifiers.attack).toBeCloseTo(1.4);
    });

    it('불굴은 HP가 높으면 발동하지 않는다', () => {
      manager.assignPersonality('test_general', 'unyielding');
      
      const context: PersonalityTriggerContext = {
        unit: testUnit,
        allies: [],
        enemies: [],
        currentHpPercent: 0.5, // 50%
      };
      
      const modifiers = manager.calculateStatModifiers('test_general', context);
      
      expect(modifiers.attack).toBe(1.0);
    });

    it('첫 공격 보너스가 적용된다', () => {
      manager.assignPersonality('test_general', 'charge');
      
      const context: PersonalityTriggerContext = {
        unit: testUnit,
        allies: [],
        enemies: [],
        isFirstAttack: true,
      };
      
      const modifiers = manager.calculateStatModifiers('test_general', context);
      
      expect(modifiers.attack).toBeCloseTo(1.3);
    });
  });

  describe('턴 시작 효과', () => {
    it('회복(regeneration) 개성은 HP를 회복한다', () => {
      testUnit.generalId = 'regen_test';
      manager.assignPersonality('regen_test', 'regeneration');
      
      const result = manager.processTurnStart(testUnit);
      
      expect(result.healAmount).toBeGreaterThan(0);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('회복 개성이 없으면 회복하지 않는다', () => {
      testUnit.generalId = 'no_regen';
      
      const result = manager.processTurnStart(testUnit);
      
      expect(result.healAmount).toBeUndefined();
    });
  });

  describe('처치 효과', () => {
    it('피의 갈증(bloodlust)은 적 처치 시 HP를 회복한다', () => {
      testUnit.generalId = 'bloodlust_test';
      manager.assignPersonality('bloodlust_test', 'bloodlust');
      
      const result = manager.processKill(testUnit);
      
      expect(result.healAmount).toBeGreaterThan(0);
    });
  });

  describe('반격 확률', () => {
    it('반격(counter) 개성은 반격 확률을 부여한다', () => {
      manager.assignPersonality('test_general', 'counter');
      
      const chance = manager.getCounterAttackChance('test_general');
      
      expect(chance).toBe(0.30);
    });

    it('반격 개성이 없으면 확률 0이다', () => {
      const chance = manager.getCounterAttackChance('no_counter');
      
      expect(chance).toBe(0);
    });

    it('반격 확률은 최대 100%이다', () => {
      manager.assignPersonality('test_general', 'counter');
      manager.assignPersonality('test_general', 'counter'); // 중복 방지되지만 테스트
      
      // 여러 반격 개성이 있다고 가정해도 100% 초과 안됨
      const chance = manager.getCounterAttackChance('test_general');
      
      expect(chance).toBeLessThanOrEqual(1.0);
    });
  });

  describe('일기토 보너스', () => {
    it('무신(war_god)은 일기토 보너스를 준다', () => {
      manager.assignPersonality('test_general', 'war_god');
      
      const bonus = manager.getDuelBonus('test_general');
      
      expect(bonus).toBeGreaterThan(0);
    });

    it('무쌍(unmatched)은 추가 일기토 보너스를 준다', () => {
      manager.assignPersonality('test_general', 'unmatched');
      
      const bonus = manager.getDuelBonus('test_general');
      
      expect(bonus).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('이동력 보너스', () => {
    it('기동(mobility)은 이동력 +1이다', () => {
      manager.assignPersonality('test_general', 'mobility');
      
      const bonus = manager.getMovementBonus('test_general', false);
      
      expect(bonus).toBe(1);
    });

    it('선봉(vanguard)은 첫 턴에 이동력 +2이다', () => {
      manager.assignPersonality('test_general', 'vanguard');
      
      const bonusFirstTurn = manager.getMovementBonus('test_general', true);
      const bonusLater = manager.getMovementBonus('test_general', false);
      
      expect(bonusFirstTurn).toBe(2);
      expect(bonusLater).toBe(0);
    });
  });

  describe('원소 보너스', () => {
    it('화공(fire_attack)은 화계 +35%이다', () => {
      manager.assignPersonality('test_general', 'fire_attack');
      
      const bonus = manager.getElementBonus('test_general', 'fire');
      
      expect(bonus).toBe(0.35);
    });

    it('수공(water_attack)은 수계 +35%이다', () => {
      manager.assignPersonality('test_general', 'water_attack');
      
      const bonus = manager.getElementBonus('test_general', 'water');
      
      expect(bonus).toBe(0.35);
    });
  });

  describe('상태이상 면역', () => {
    it('침착(calm)은 혼란과 공포에 면역이다', () => {
      manager.assignPersonality('test_general', 'calm');
      
      expect(manager.isImmuneToStatus('test_general', 'confusion')).toBe(true);
      expect(manager.isImmuneToStatus('test_general', 'fear')).toBe(true);
    });

    it('면역이 없는 상태이상은 영향받는다', () => {
      expect(manager.isImmuneToStatus('test_general', 'stun')).toBe(false);
    });
  });

  describe('치명상 면역', () => {
    it('결사(last_stand)는 치명상을 막는다', () => {
      manager.assignPersonality('test_general', 'last_stand');
      
      expect(manager.hasDeathSave('test_general')).toBe(true);
    });

    it('결사가 없으면 치명상을 막지 못한다', () => {
      expect(manager.hasDeathSave('no_last_stand')).toBe(false);
    });
  });

  describe('카테고리별 조회', () => {
    it('전투 개성만 조회한다', () => {
      const combatPersonalities = manager.getPersonalitiesByCategory('combat');
      
      expect(combatPersonalities.length).toBeGreaterThan(0);
      expect(combatPersonalities.every(p => p.category === 'combat')).toBe(true);
    });

    it('계략 개성만 조회한다', () => {
      const strategyPersonalities = manager.getPersonalitiesByCategory('strategy');
      
      expect(strategyPersonalities.length).toBeGreaterThan(0);
      expect(strategyPersonalities.every(p => p.category === 'strategy')).toBe(true);
    });
  });

  describe('개성 검색', () => {
    it('한글 이름으로 검색한다', () => {
      const results = manager.searchPersonalities('돌격');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(p => p.name === '돌격')).toBe(true);
    });

    it('영어 이름으로 검색한다', () => {
      const results = manager.searchPersonalities('charge');
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('설명으로 검색한다', () => {
      const results = manager.searchPersonalities('공격력');
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('개성 요약', () => {
    it('개성 요약 텍스트를 반환한다', () => {
      const summary = manager.getPersonalitySummary('charge');
      
      expect(summary).toContain('돌격');
      expect(summary).toContain('Charge');
      expect(summary).toContain('+30%');
    });

    it('장수의 모든 개성 요약을 반환한다', () => {
      const summaries = manager.getGeneralPersonalitySummary('guan_yu');
      
      expect(summaries.length).toBeGreaterThan(0);
    });
  });

  describe('유명 장수 개성', () => {
    it('관우는 충의, 무신, 위압 개성을 가진다', () => {
      const personalities = manager.getGeneralPersonalities('guan_yu');
      const personalityIds = personalities.map(p => p.id);
      
      expect(personalityIds).toContain('loyalty');
      expect(personalityIds).toContain('war_god');
      expect(personalityIds).toContain('intimidation');
    });

    it('장비는 맹장, 돌격, 불굴 개성을 가진다', () => {
      const personalities = manager.getGeneralPersonalities('zhang_fei');
      const personalityIds = personalities.map(p => p.id);
      
      expect(personalityIds).toContain('fierce');
      expect(personalityIds).toContain('charge');
      expect(personalityIds).toContain('unyielding');
    });

    it('제갈량은 신산, 기문, 천기 개성을 가진다', () => {
      const personalities = manager.getGeneralPersonalities('zhuge_liang');
      const personalityIds = personalities.map(p => p.id);
      
      expect(personalityIds).toContain('divine_calculation');
      expect(personalityIds).toContain('qimen');
      expect(personalityIds).toContain('celestial');
    });

    it('여포는 무쌍, 돌격, 질풍 개성을 가진다', () => {
      const personalities = manager.getGeneralPersonalities('lu_bu');
      const personalityIds = personalities.map(p => p.id);
      
      expect(personalityIds).toContain('unmatched');
      expect(personalityIds).toContain('charge');
      expect(personalityIds).toContain('swift');
    });

    it('조운은 상산의 용, 충의, 구출 개성을 가진다', () => {
      const personalities = manager.getGeneralPersonalities('zhao_yun');
      const personalityIds = personalities.map(p => p.id);
      
      expect(personalityIds).toContain('changshan_dragon');
      expect(personalityIds).toContain('loyalty');
      expect(personalityIds).toContain('rescue');
    });
  });

  describe('싱글톤', () => {
    it('싱글톤 인스턴스를 반환한다', () => {
      const instance1 = getPersonalityManager();
      const instance2 = getPersonalityManager();
      
      expect(instance1).toBe(instance2);
    });
  });
});
