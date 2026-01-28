import { describe, it, expect } from 'vitest';
import { Skill, SkillType, SkillTarget, SkillEffect } from '../../src/entities/Skill';

describe('Skill', () => {
  describe('생성', () => {
    it('공격 스킬 생성', () => {
      const skill = new Skill({
        id: 'fire-attack',
        name: '화계',
        type: 'active',
        target: 'enemy_all',
        effects: [{ type: 'damage', value: 150, attribute: 'intelligence' }],
        cooldown: 3,
        mpCost: 30,
      });

      expect(skill.id).toBe('fire-attack');
      expect(skill.name).toBe('화계');
      expect(skill.type).toBe('active');
      expect(skill.target).toBe('enemy_all');
      expect(skill.cooldown).toBe(3);
      expect(skill.mpCost).toBe(30);
    });

    it('패시브 스킬 생성', () => {
      const skill = new Skill({
        id: 'brave-general',
        name: '용장',
        type: 'passive',
        target: 'self',
        effects: [{ type: 'buff', value: 20, attribute: 'attack' }],
      });

      expect(skill.type).toBe('passive');
      expect(skill.cooldown).toBe(0);
      expect(skill.mpCost).toBe(0);
    });
  });

  describe('타겟 유형', () => {
    it('단일 대상', () => {
      const skill = new Skill({
        id: 'strike',
        name: '강타',
        type: 'active',
        target: 'enemy_single',
        effects: [{ type: 'damage', value: 200 }],
      });
      expect(skill.isSingleTarget()).toBe(true);
      expect(skill.isAoE()).toBe(false);
    });

    it('범위 대상 (전체)', () => {
      const skill = new Skill({
        id: 'fire-attack',
        name: '화계',
        type: 'active',
        target: 'enemy_all',
        effects: [{ type: 'damage', value: 150 }],
      });
      expect(skill.isSingleTarget()).toBe(false);
      expect(skill.isAoE()).toBe(true);
    });

    it('범위 대상 (횡렬)', () => {
      const skill = new Skill({
        id: 'row-attack',
        name: '횡렬공격',
        type: 'active',
        target: 'enemy_row',
        effects: [{ type: 'damage', value: 120 }],
      });
      expect(skill.isAoE()).toBe(true);
    });

    it('범위 대상 (종렬)', () => {
      const skill = new Skill({
        id: 'col-attack',
        name: '종렬공격',
        type: 'active',
        target: 'enemy_column',
        effects: [{ type: 'damage', value: 120 }],
      });
      expect(skill.isAoE()).toBe(true);
    });
  });

  describe('효과 유형', () => {
    it('데미지 효과', () => {
      const skill = new Skill({
        id: 'slash',
        name: '베기',
        type: 'active',
        target: 'enemy_single',
        effects: [{ type: 'damage', value: 180, attribute: 'attack' }],
      });
      expect(skill.hasDamage()).toBe(true);
      expect(skill.hasHeal()).toBe(false);
    });

    it('회복 효과', () => {
      const skill = new Skill({
        id: 'heal',
        name: '치료',
        type: 'active',
        target: 'ally_single',
        effects: [{ type: 'heal', value: 100 }],
      });
      expect(skill.hasHeal()).toBe(true);
      expect(skill.hasDamage()).toBe(false);
    });

    it('버프 효과', () => {
      const skill = new Skill({
        id: 'inspire',
        name: '격려',
        type: 'active',
        target: 'ally_all',
        effects: [{ type: 'buff', value: 30, attribute: 'attack', duration: 2 }],
      });
      expect(skill.hasBuff()).toBe(true);
    });

    it('디버프 효과', () => {
      const skill = new Skill({
        id: 'weaken',
        name: '약화',
        type: 'active',
        target: 'enemy_single',
        effects: [{ type: 'debuff', value: 25, attribute: 'defense', duration: 2 }],
      });
      expect(skill.hasDebuff()).toBe(true);
    });

    it('복합 효과 (데미지 + 디버프)', () => {
      const skill = new Skill({
        id: 'poison-strike',
        name: '독검',
        type: 'active',
        target: 'enemy_single',
        effects: [
          { type: 'damage', value: 100 },
          { type: 'debuff', value: 10, attribute: 'defense', duration: 3 },
        ],
      });
      expect(skill.hasDamage()).toBe(true);
      expect(skill.hasDebuff()).toBe(true);
    });
  });

  describe('쿨다운', () => {
    it('쿨다운 감소', () => {
      const skill = new Skill({
        id: 'ultimate',
        name: '필살기',
        type: 'active',
        target: 'enemy_all',
        effects: [{ type: 'damage', value: 300 }],
        cooldown: 5,
      });

      skill.use();
      expect(skill.currentCooldown).toBe(5);
      
      skill.reduceCooldown();
      expect(skill.currentCooldown).toBe(4);
      
      skill.reduceCooldown(3);
      expect(skill.currentCooldown).toBe(1);
    });

    it('사용 가능 여부', () => {
      const skill = new Skill({
        id: 'skill',
        name: '스킬',
        type: 'active',
        target: 'enemy_single',
        effects: [{ type: 'damage', value: 100 }],
        cooldown: 2,
      });

      expect(skill.isReady()).toBe(true);
      skill.use();
      expect(skill.isReady()).toBe(false);
      skill.reduceCooldown(2);
      expect(skill.isReady()).toBe(true);
    });
  });

  describe('데미지 계산', () => {
    it('기본 데미지 계산', () => {
      const skill = new Skill({
        id: 'fire',
        name: '화계',
        type: 'active',
        target: 'enemy_all',
        effects: [{ type: 'damage', value: 150, attribute: 'intelligence' }],
      });

      // 지력 100일 때: 100 * 1.5 = 150
      const damage = skill.calculateDamage(100);
      expect(damage).toBe(150);
    });

    it('공격력 기반 데미지', () => {
      const skill = new Skill({
        id: 'slash',
        name: '베기',
        type: 'active',
        target: 'enemy_single',
        effects: [{ type: 'damage', value: 200, attribute: 'attack' }],
      });

      // 공격력 150일 때: 150 * 2.0 = 300
      const damage = skill.calculateDamage(150);
      expect(damage).toBe(300);
    });
  });
});
