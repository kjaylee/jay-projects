import { describe, it, expect } from 'vitest';
import {
  ClassAdvantage,
  applyClassAdvantage,
  ADVANTAGE_CONFIG,
  CLASS_NAMES,
} from '../../src/utils/ClassAdvantage';
import { GeneralClass } from '../../src/entities/General';

describe('ClassAdvantage', () => {
  describe('상성 관계 확인', () => {
    it('맹장(warrior)은 궁장(archer)에게 유리하다', () => {
      const result = ClassAdvantage.checkAdvantage('warrior', 'archer');
      
      expect(result.type).toBe('advantage');
      expect(result.damageMultiplier).toBe(1 + ADVANTAGE_CONFIG.damageBonus);
      expect(result.receivedDamageMultiplier).toBe(1 - ADVANTAGE_CONFIG.receivedDamageReduction);
    });

    it('궁장(archer)은 기장(cavalry)에게 유리하다', () => {
      const result = ClassAdvantage.checkAdvantage('archer', 'cavalry');
      
      expect(result.type).toBe('advantage');
      expect(result.damageMultiplier).toBeCloseTo(1.20);
    });

    it('기장(cavalry)은 맹장(warrior)에게 유리하다', () => {
      const result = ClassAdvantage.checkAdvantage('cavalry', 'warrior');
      
      expect(result.type).toBe('advantage');
      expect(result.damageMultiplier).toBeCloseTo(1.20);
    });

    it('맹장(warrior)은 기장(cavalry)에게 불리하다', () => {
      const result = ClassAdvantage.checkAdvantage('warrior', 'cavalry');
      
      expect(result.type).toBe('disadvantage');
      expect(result.damageMultiplier).toBe(1 - ADVANTAGE_CONFIG.damageReduction);
      expect(result.receivedDamageMultiplier).toBe(1 + ADVANTAGE_CONFIG.receivedDamageIncrease);
    });

    it('궁장(archer)은 맹장(warrior)에게 불리하다', () => {
      const result = ClassAdvantage.checkAdvantage('archer', 'warrior');
      
      expect(result.type).toBe('disadvantage');
      expect(result.damageMultiplier).toBeCloseTo(0.80);
    });

    it('기장(cavalry)은 궁장(archer)에게 불리하다', () => {
      const result = ClassAdvantage.checkAdvantage('cavalry', 'archer');
      
      expect(result.type).toBe('disadvantage');
    });

    it('책사(strategist)는 상성이 없다', () => {
      const classes: GeneralClass[] = ['warrior', 'archer', 'cavalry', 'support'];
      
      for (const targetClass of classes) {
        const result = ClassAdvantage.checkAdvantage('strategist', targetClass);
        expect(result.type).toBe('neutral');
        expect(result.damageMultiplier).toBe(1.0);
      }
    });

    it('방장(support)는 상성이 없다', () => {
      const classes: GeneralClass[] = ['warrior', 'archer', 'cavalry', 'strategist'];
      
      for (const targetClass of classes) {
        const result = ClassAdvantage.checkAdvantage('support', targetClass);
        expect(result.type).toBe('neutral');
      }
    });

    it('같은 병과끼리는 상성이 없다', () => {
      const result = ClassAdvantage.checkAdvantage('warrior', 'warrior');
      
      expect(result.type).toBe('neutral');
      expect(result.damageMultiplier).toBe(1.0);
      expect(result.receivedDamageMultiplier).toBe(1.0);
    });
  });

  describe('데미지 계산', () => {
    it('상성 유리 시 데미지가 20% 증가한다', () => {
      const baseDamage = 100;
      const damage = ClassAdvantage.calculateDamageWithAdvantage(baseDamage, 'warrior', 'archer');
      
      expect(damage).toBe(120);
    });

    it('상성 불리 시 데미지가 20% 감소한다', () => {
      const baseDamage = 100;
      const damage = ClassAdvantage.calculateDamageWithAdvantage(baseDamage, 'warrior', 'cavalry');
      
      expect(damage).toBe(80);
    });

    it('상성 없음 시 데미지가 그대로다', () => {
      const baseDamage = 100;
      const damage = ClassAdvantage.calculateDamageWithAdvantage(baseDamage, 'strategist', 'warrior');
      
      expect(damage).toBe(100);
    });

    it('받는 데미지도 상성에 따라 보정된다', () => {
      const baseDamage = 100;
      
      // 유리할 때 받는 데미지 감소
      const receivedDamage = ClassAdvantage.calculateReceivedDamageWithAdvantage(
        baseDamage,
        'warrior',
        'archer'
      );
      expect(receivedDamage).toBe(85); // -15%
    });
  });

  describe('유틸리티 함수', () => {
    it('유리한 상대를 반환한다', () => {
      expect(ClassAdvantage.getAdvantageTarget('warrior')).toBe('archer');
      expect(ClassAdvantage.getAdvantageTarget('archer')).toBe('cavalry');
      expect(ClassAdvantage.getAdvantageTarget('cavalry')).toBe('warrior');
      expect(ClassAdvantage.getAdvantageTarget('strategist')).toBeNull();
      expect(ClassAdvantage.getAdvantageTarget('support')).toBeNull();
    });

    it('불리한 상대를 반환한다', () => {
      expect(ClassAdvantage.getDisadvantageTarget('warrior')).toBe('cavalry');
      expect(ClassAdvantage.getDisadvantageTarget('archer')).toBe('warrior');
      expect(ClassAdvantage.getDisadvantageTarget('cavalry')).toBe('archer');
      expect(ClassAdvantage.getDisadvantageTarget('strategist')).toBeNull();
      expect(ClassAdvantage.getDisadvantageTarget('support')).toBeNull();
    });

    it('상성 삼각관계 문자열을 반환한다', () => {
      const triangle = ClassAdvantage.getAdvantageTriangle();
      
      expect(triangle).toContain('warrior');
      expect(triangle).toContain('archer');
      expect(triangle).toContain('cavalry');
    });

    it('병과 설명을 반환한다', () => {
      const description = ClassAdvantage.getClassDescription('warrior');
      
      expect(description).toContain('맹장');
      expect(description).toContain('궁장에게 유리');
      expect(description).toContain('기장에게 불리');
    });

    it('모든 병과 목록을 반환한다', () => {
      const classes = ClassAdvantage.getAllClasses();
      
      expect(classes).toHaveLength(5);
      expect(classes).toContain('warrior');
      expect(classes).toContain('strategist');
    });

    it('전투 병과만 반환한다', () => {
      const combatClasses = ClassAdvantage.getCombatClasses();
      
      expect(combatClasses).toHaveLength(3);
      expect(combatClasses).toContain('warrior');
      expect(combatClasses).toContain('archer');
      expect(combatClasses).toContain('cavalry');
      expect(combatClasses).not.toContain('strategist');
    });
  });

  describe('applyClassAdvantage 헬퍼 함수', () => {
    it('데미지와 상성 결과를 함께 반환한다', () => {
      const { damage, advantage } = applyClassAdvantage(100, 'warrior', 'archer');
      
      expect(damage).toBe(120);
      expect(advantage.type).toBe('advantage');
    });
  });

  describe('CLASS_NAMES', () => {
    it('모든 병과에 한글 이름이 있다', () => {
      expect(CLASS_NAMES.warrior).toBe('맹장');
      expect(CLASS_NAMES.archer).toBe('궁장');
      expect(CLASS_NAMES.cavalry).toBe('기장');
      expect(CLASS_NAMES.strategist).toBe('책사');
      expect(CLASS_NAMES.support).toBe('방장');
    });
  });

  describe('상성 설명 메시지', () => {
    it('유리한 상성의 설명을 포함한다', () => {
      const result = ClassAdvantage.checkAdvantage('warrior', 'archer');
      
      expect(result.description).toContain('맹장');
      expect(result.description).toContain('궁장');
      expect(result.description).toContain('유리');
    });

    it('불리한 상성의 설명을 포함한다', () => {
      const result = ClassAdvantage.checkAdvantage('warrior', 'cavalry');
      
      expect(result.description).toContain('불리');
    });

    it('중립 상성의 설명을 포함한다', () => {
      const result = ClassAdvantage.checkAdvantage('strategist', 'warrior');
      
      expect(result.description).toContain('상성 관계 없음');
    });
  });
});
