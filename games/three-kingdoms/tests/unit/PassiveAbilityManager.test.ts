import { describe, it, expect, beforeEach } from 'vitest';
import { PassiveAbilityManager, PASSIVE_ABILITIES, PassiveAbilityType } from '../../src/managers/PassiveAbilityManager';
import { BattleUnit, createBattleUnit } from '../../src/entities/BattleUnit';

describe('PassiveAbilityManager', () => {
  let manager: PassiveAbilityManager;
  let attacker: BattleUnit;
  let defender: BattleUnit;

  beforeEach(() => {
    manager = new PassiveAbilityManager();

    attacker = createBattleUnit({
      id: 'attacker_1',
      generalId: 'guan_yu',
      name: '관우',
      team: 'player',
      position: { row: 0, col: 0 },
      baseStats: { attack: 97, defense: 85, intelligence: 75, speed: 80, hp: 1000 },
      level: 1,
      skills: [],
    });

    defender = createBattleUnit({
      id: 'defender_1',
      generalId: 'enemy_soldier',
      name: '적병',
      team: 'enemy',
      position: { row: 0, col: 0 },
      baseStats: { attack: 50, defense: 50, intelligence: 50, speed: 50, hp: 800 },
      level: 1,
      skills: [],
    });
  });

  describe('능력 등록 및 조회', () => {
    it('유닛에 패시브 능력을 등록할 수 있다', () => {
      manager.registerAbility(attacker.id, 'underdog');

      expect(manager.hasAbility(attacker.id, 'underdog')).toBe(true);
      expect(manager.getAbilities(attacker.id)).toContain('underdog');
    });

    it('같은 능력을 중복 등록해도 하나만 유지된다', () => {
      manager.registerAbility(attacker.id, 'underdog');
      manager.registerAbility(attacker.id, 'underdog');

      expect(manager.getAbilities(attacker.id).filter(a => a === 'underdog').length).toBe(1);
    });

    it('여러 능력을 등록할 수 있다', () => {
      manager.registerAbility(attacker.id, 'underdog');
      manager.registerAbility(attacker.id, 'lifesteal');

      expect(manager.getAbilities(attacker.id)).toHaveLength(2);
    });

    it('등록되지 않은 유닛은 빈 배열을 반환한다', () => {
      expect(manager.getAbilities('unknown_unit')).toEqual([]);
    });
  });

  describe('역전의 명수 (Underdog)', () => {
    beforeEach(() => {
      manager.registerAbility(attacker.id, 'underdog');
    });

    it('HP가 적보다 낮고 확률 통과 시 발동한다', () => {
      // 공격자 HP를 낮게 설정
      attacker.stats.currentHp = 300; // 30%
      defender.stats.currentHp = 600; // 75%

      // 항상 발동하도록 설정
      manager.setRandomFn(() => 0.1); // 25% 확률 통과

      const result = manager.checkUnderdog(attacker, defender);

      expect(result.triggered).toBe(true);
      expect(result.abilityType).toBe('underdog');
      expect(result.effect?.type).toBe('damage_bonus');
      expect(result.effect?.value).toBeGreaterThanOrEqual(0.4);
      expect(result.effect?.value).toBeLessThanOrEqual(0.8);
    });

    it('HP가 적보다 높으면 발동하지 않는다', () => {
      attacker.stats.currentHp = 800;
      defender.stats.currentHp = 300;

      manager.setRandomFn(() => 0.1);

      const result = manager.checkUnderdog(attacker, defender);

      expect(result.triggered).toBe(false);
    });

    it('확률 실패 시 발동하지 않는다', () => {
      attacker.stats.currentHp = 300;
      defender.stats.currentHp = 600;

      // 확률 실패 (25% 초과)
      manager.setRandomFn(() => 0.5);

      const result = manager.checkUnderdog(attacker, defender);

      expect(result.triggered).toBe(false);
    });

    it('능력이 없으면 발동하지 않는다', () => {
      manager.reset();
      attacker.stats.currentHp = 300;
      defender.stats.currentHp = 600;

      const result = manager.checkUnderdog(attacker, defender);

      expect(result.triggered).toBe(false);
    });
  });

  describe('환호성 (Victory Heal)', () => {
    beforeEach(() => {
      manager.registerAbility(attacker.id, 'victory_heal');
    });

    it('HP가 손실된 상태에서 발동하면 회복한다', () => {
      attacker.stats.currentHp = 600; // 400 손실
      manager.setRandomFn(() => 0.5); // 30% 회복

      const result = manager.checkVictoryHeal(attacker);

      expect(result.triggered).toBe(true);
      expect(result.abilityType).toBe('victory_heal');
      expect(result.effect?.type).toBe('heal');
      expect(result.effect?.value).toBeGreaterThanOrEqual(80); // 400 * 0.2
      expect(result.effect?.value).toBeLessThanOrEqual(160); // 400 * 0.4
    });

    it('HP가 최대이면 발동하지 않는다', () => {
      attacker.stats.currentHp = attacker.stats.maxHp;

      const result = manager.checkVictoryHeal(attacker);

      expect(result.triggered).toBe(false);
    });

    it('죽은 유닛은 발동하지 않는다', () => {
      attacker.stats.currentHp = 0;
      attacker.isAlive = false;

      const result = manager.checkVictoryHeal(attacker);

      expect(result.triggered).toBe(false);
    });

    it('applyVictoryHeal로 실제 HP가 회복된다', () => {
      attacker.stats.currentHp = 600;
      manager.setRandomFn(() => 0.5);

      const beforeHp = attacker.stats.currentHp;
      const healAmount = manager.applyVictoryHeal(attacker);

      expect(healAmount).toBeGreaterThan(0);
      expect(attacker.stats.currentHp).toBe(beforeHp + healAmount);
    });
  });

  describe('출혈 (Bleed)', () => {
    beforeEach(() => {
      manager.registerAbility(attacker.id, 'bleed');
    });

    it('확률 통과 시 출혈 스택이 추가된다', () => {
      // 확률 통과 설정
      // randomRange(0.23, 0.30)에서 0.1 사용 → 0.23 + 0.1*0.07 = 0.237
      // 그 다음 randomFn() 호출에서 확률 체크 → 0.1 < 0.237 이므로 통과
      manager.setRandomFn(() => 0.1);

      const result = manager.checkBleed(attacker, defender);

      expect(result.triggered).toBe(true);
      expect(result.abilityType).toBe('bleed');
      expect(result.effect?.type).toBe('bleed');
    });

    it('출혈 보너스가 누적된다', () => {
      // 모든 random 호출에서 낮은 값 반환 → 확률 체크 통과
      manager.setRandomFn(() => 0.1);

      manager.checkBleed(attacker, defender);
      manager.checkBleed(attacker, defender);

      const bonus = manager.getBleedBonus(attacker.id, defender.id);
      expect(bonus).toBeGreaterThan(0);
    });

    it('턴 경과 시 출혈 스택이 감소한다', () => {
      manager.setRandomFn(() => 0.1);

      manager.checkBleed(attacker, defender);
      
      // 3턴 경과
      manager.onTurnStart(1);
      manager.onTurnStart(2);
      manager.onTurnStart(3);

      const bonus = manager.getBleedBonus(attacker.id, defender.id);
      expect(bonus).toBe(0);
    });
  });

  describe('압도 (Overwhelm)', () => {
    beforeEach(() => {
      manager.registerAbility(defender.id, 'overwhelm');
    });

    it('전투 시작 시 압도 효과가 초기화된다', () => {
      manager.setRandomFn(() => 0.3); // 회피 선택, 35% 회피율

      manager.initializeOverwhelm(defender);
      manager.onTurnStart(1);

      const result = manager.checkOverwhelm(defender);

      expect(result.triggered).toBe(true);
      expect(result.abilityType).toBe('overwhelm');
    });

    it('첫 턴에만 효과가 발동한다', () => {
      manager.setRandomFn(() => 0.3);
      manager.initializeOverwhelm(defender);
      
      manager.onTurnStart(1);
      manager.checkOverwhelm(defender); // 첫 번째 사용
      
      manager.onTurnStart(2);
      const result = manager.checkOverwhelm(defender);

      expect(result.triggered).toBe(false);
    });

    it('회피 효과 시 회피 여부를 체크한다', () => {
      manager.setRandomFn(() => 0.3); // 회피 선택, 약 35% 회피율
      manager.initializeOverwhelm(defender);
      manager.onTurnStart(1);

      // 회피 성공 체크 (0.3 < 0.35)
      const evades = manager.checkOverwhelmEvasion(defender);
      expect(typeof evades).toBe('boolean');
    });

    it('피해 감소 효과가 적용된다', () => {
      manager.setRandomFn(() => 0.6); // 피해 감소 선택
      manager.initializeOverwhelm(defender);
      manager.onTurnStart(1);

      const reduction = manager.getOverwhelmDamageReduction(defender);
      expect(reduction).toBeGreaterThanOrEqual(0.15);
      expect(reduction).toBeLessThanOrEqual(0.40);
    });
  });

  describe('협상 (Negotiation)', () => {
    beforeEach(() => {
      manager.registerAbility(attacker.id, 'negotiation');
    });

    it('정치력이 높으면 적 최대 HP가 감소한다', () => {
      const originalMaxHp = defender.stats.maxHp;
      manager.setRandomFn(() => 0.5); // 중간 값

      const result = manager.applyNegotiation(attacker, defender, 99, 50);

      expect(result.triggered).toBe(true);
      expect(result.effect?.type).toBe('hp_reduction');
      expect(defender.stats.maxHp).toBeLessThan(originalMaxHp);
    });

    it('정치력이 낮으면 발동하지 않는다', () => {
      const originalMaxHp = defender.stats.maxHp;

      const result = manager.applyNegotiation(attacker, defender, 30, 50);

      expect(result.triggered).toBe(false);
      expect(defender.stats.maxHp).toBe(originalMaxHp);
    });

    it('같은 대상에게 중복 적용되지 않는다', () => {
      manager.setRandomFn(() => 0.5);

      manager.applyNegotiation(attacker, defender, 99, 50);
      const firstMaxHp = defender.stats.maxHp;

      const result = manager.applyNegotiation(attacker, defender, 99, 50);

      expect(result.triggered).toBe(false);
      expect(defender.stats.maxHp).toBe(firstMaxHp);
    });

    it('현재 HP도 최대 HP에 맞게 조정된다', () => {
      defender.stats.currentHp = defender.stats.maxHp;
      manager.setRandomFn(() => 0.5);

      manager.applyNegotiation(attacker, defender, 99, 50);

      expect(defender.stats.currentHp).toBeLessThanOrEqual(defender.stats.maxHp);
    });
  });

  describe('흡혈 (Lifesteal)', () => {
    beforeEach(() => {
      manager.registerAbility(attacker.id, 'lifesteal');
    });

    it('데미지에 비례하여 회복량이 계산된다', () => {
      manager.setRandomFn(() => 0.5); // 약 18% 회복

      const result = manager.calculateLifesteal(attacker, 100);

      expect(result.triggered).toBe(true);
      expect(result.effect?.type).toBe('heal');
      expect(result.effect?.value).toBeGreaterThanOrEqual(13); // 100 * 0.13
      expect(result.effect?.value).toBeLessThanOrEqual(23); // 100 * 0.23
    });

    it('데미지가 0이면 발동하지 않는다', () => {
      const result = manager.calculateLifesteal(attacker, 0);

      expect(result.triggered).toBe(false);
    });

    it('applyLifesteal로 실제 HP가 회복된다', () => {
      attacker.stats.currentHp = 500;
      manager.setRandomFn(() => 0.5);

      const healAmount = manager.applyLifesteal(attacker, 100);

      expect(healAmount).toBeGreaterThan(0);
      expect(attacker.stats.currentHp).toBe(500 + healAmount);
    });

    it('최대 HP를 초과하지 않는다', () => {
      attacker.stats.currentHp = attacker.stats.maxHp - 5;
      manager.setRandomFn(() => 0.5);

      manager.applyLifesteal(attacker, 100);

      expect(attacker.stats.currentHp).toBe(attacker.stats.maxHp);
    });
  });

  describe('유틸리티 메서드', () => {
    it('reset()으로 모든 상태가 초기화된다', () => {
      manager.registerAbility(attacker.id, 'underdog');
      manager.registerAbility(attacker.id, 'lifesteal');
      manager.initializeOverwhelm(defender);

      manager.reset();

      expect(manager.getAbilities(attacker.id)).toEqual([]);
    });

    it('정적 메서드로 능력 설정을 조회할 수 있다', () => {
      const config = PassiveAbilityManager.getAbilityConfig('underdog');

      expect(config.name).toBe('역전의 명수');
      expect(config.nameEn).toBe('Underdog');
    });

    it('모든 패시브 능력 목록을 조회할 수 있다', () => {
      const abilities = PassiveAbilityManager.getAllAbilities();

      expect(abilities).toHaveLength(6);
      expect(abilities.map(a => a.type)).toContain('underdog');
      expect(abilities.map(a => a.type)).toContain('victory_heal');
      expect(abilities.map(a => a.type)).toContain('bleed');
      expect(abilities.map(a => a.type)).toContain('overwhelm');
      expect(abilities.map(a => a.type)).toContain('negotiation');
      expect(abilities.map(a => a.type)).toContain('lifesteal');
    });
  });

  describe('PASSIVE_ABILITIES 상수', () => {
    it('모든 능력이 올바른 구조를 가진다', () => {
      const abilities: PassiveAbilityType[] = ['underdog', 'victory_heal', 'bleed', 'overwhelm', 'negotiation', 'lifesteal'];

      for (const type of abilities) {
        const config = PASSIVE_ABILITIES[type];
        expect(config).toBeDefined();
        expect(config.id).toBeTruthy();
        expect(config.name).toBeTruthy();
        expect(config.nameEn).toBeTruthy();
        expect(config.description).toBeTruthy();
        expect(config.minValue).toBeLessThanOrEqual(config.maxValue);
      }
    });
  });
});
