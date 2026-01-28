import { describe, it, expect, beforeEach } from 'vitest';
import { BuffManager, ActiveBuff } from '../../src/managers/BuffManager';

describe('BuffManager', () => {
  let buffManager: BuffManager;

  beforeEach(() => {
    buffManager = new BuffManager();
  });

  describe('버프 추가/제거', () => {
    it('버프를 추가할 수 있다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff);
      const activeBuffs = buffManager.getActiveBuffs('unit_a');

      expect(activeBuffs).toHaveLength(1);
      expect(activeBuffs[0]).toEqual(buff);
    });

    it('여러 버프를 추가할 수 있다', () => {
      const buff1: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };
      const buff2: ActiveBuff = {
        id: 'debuff_1',
        skillId: 'confusion',
        type: 'debuff',
        stat: 'attack',
        value: -0.5,
        duration: 2,
        source: 'unit_2',
      };

      buffManager.addBuff('unit_a', buff1);
      buffManager.addBuff('unit_a', buff2);

      const activeBuffs = buffManager.getActiveBuffs('unit_a');
      expect(activeBuffs).toHaveLength(2);
    });

    it('같은 스킬의 같은 스탯 버프는 갱신된다', () => {
      const buff1: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };
      const buff2: ActiveBuff = {
        id: 'buff_2',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 3, // 새로운 duration
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff1);
      buffManager.addBuff('unit_a', buff2);

      const activeBuffs = buffManager.getActiveBuffs('unit_a');
      expect(activeBuffs).toHaveLength(1);
      expect(activeBuffs[0].duration).toBe(3); // 갱신됨
    });

    it('버프를 제거할 수 있다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff);
      buffManager.removeBuff('unit_a', 'buff_1');

      const activeBuffs = buffManager.getActiveBuffs('unit_a');
      expect(activeBuffs).toHaveLength(0);
    });

    it('유닛의 모든 버프를 제거할 수 있다', () => {
      const buff1: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };
      const buff2: ActiveBuff = {
        id: 'debuff_1',
        skillId: 'confusion',
        type: 'debuff',
        stat: 'attack',
        value: -0.5,
        duration: 2,
        source: 'unit_2',
      };

      buffManager.addBuff('unit_a', buff1);
      buffManager.addBuff('unit_a', buff2);
      buffManager.clearBuffs('unit_a');

      const activeBuffs = buffManager.getActiveBuffs('unit_a');
      expect(activeBuffs).toHaveLength(0);
    });
  });

  describe('턴 경과 및 만료', () => {
    it('tickBuffs()로 duration이 감소한다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff);
      buffManager.tickBuffs();

      const activeBuffs = buffManager.getActiveBuffs('unit_a');
      expect(activeBuffs).toHaveLength(1);
      expect(activeBuffs[0].duration).toBe(1);
    });

    it('duration이 0이 되면 버프가 만료된다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 1,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff);
      const expired = buffManager.tickBuffs();

      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('buff_1');

      const activeBuffs = buffManager.getActiveBuffs('unit_a');
      expect(activeBuffs).toHaveLength(0);
    });

    it('여러 턴 경과 후 순차적으로 만료된다', () => {
      const buff1: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 1,
        source: 'unit_1',
      };
      const buff2: ActiveBuff = {
        id: 'buff_2',
        skillId: 'power_up',
        type: 'buff',
        stat: 'attack',
        value: 0.3,
        duration: 3,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff1);
      buffManager.addBuff('unit_a', buff2);

      // 1턴 후: buff_1 만료
      let expired = buffManager.tickBuffs();
      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('buff_1');

      let activeBuffs = buffManager.getActiveBuffs('unit_a');
      expect(activeBuffs).toHaveLength(1);

      // 2턴 후: buff_2 duration 1
      expired = buffManager.tickBuffs();
      expect(expired).toHaveLength(0);

      // 3턴 후: buff_2 만료
      expired = buffManager.tickBuffs();
      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe('buff_2');

      activeBuffs = buffManager.getActiveBuffs('unit_a');
      expect(activeBuffs).toHaveLength(0);
    });
  });

  describe('스탯 보정값 계산', () => {
    it('버프가 없으면 1.0을 반환한다', () => {
      const modifier = buffManager.getStatModifier('unit_a', 'attack');
      expect(modifier).toBe(1.0);
    });

    it('버프 +50%는 1.5를 반환한다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff);
      const modifier = buffManager.getStatModifier('unit_a', 'defense');
      expect(modifier).toBe(1.5);
    });

    it('디버프 -50%는 0.5를 반환한다', () => {
      const debuff: ActiveBuff = {
        id: 'debuff_1',
        skillId: 'confusion',
        type: 'debuff',
        stat: 'attack',
        value: -0.5,
        duration: 2,
        source: 'unit_2',
      };

      buffManager.addBuff('unit_a', debuff);
      const modifier = buffManager.getStatModifier('unit_a', 'attack');
      expect(modifier).toBe(0.5);
    });

    it('같은 스탯에 여러 버프가 있으면 합산된다', () => {
      const buff1: ActiveBuff = {
        id: 'buff_1',
        skillId: 'power_up',
        type: 'buff',
        stat: 'attack',
        value: 0.3,
        duration: 2,
        source: 'unit_1',
      };
      const buff2: ActiveBuff = {
        id: 'buff_2',
        skillId: 'rage',
        type: 'buff',
        stat: 'attack',
        value: 0.2,
        duration: 2,
        source: 'unit_2',
      };

      buffManager.addBuff('unit_a', buff1);
      buffManager.addBuff('unit_a', buff2);

      const modifier = buffManager.getStatModifier('unit_a', 'attack');
      expect(modifier).toBe(1.5); // 1 + 0.3 + 0.2
    });

    it('버프와 디버프가 상쇄된다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'power_up',
        type: 'buff',
        stat: 'attack',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };
      const debuff: ActiveBuff = {
        id: 'debuff_1',
        skillId: 'weakness',
        type: 'debuff',
        stat: 'attack',
        value: -0.3,
        duration: 2,
        source: 'unit_2',
      };

      buffManager.addBuff('unit_a', buff);
      buffManager.addBuff('unit_a', debuff);

      const modifier = buffManager.getStatModifier('unit_a', 'attack');
      expect(modifier).toBe(1.2); // 1 + 0.5 - 0.3
    });

    it('다른 스탯의 버프는 영향을 주지 않는다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff);
      
      const defenseModifier = buffManager.getStatModifier('unit_a', 'defense');
      const attackModifier = buffManager.getStatModifier('unit_a', 'attack');

      expect(defenseModifier).toBe(1.5);
      expect(attackModifier).toBe(1.0);
    });

    it('디버프 합이 -90% 이상이면 0.1로 제한된다', () => {
      const debuff1: ActiveBuff = {
        id: 'debuff_1',
        skillId: 'curse1',
        type: 'debuff',
        stat: 'attack',
        value: -0.5,
        duration: 2,
        source: 'unit_1',
      };
      const debuff2: ActiveBuff = {
        id: 'debuff_2',
        skillId: 'curse2',
        type: 'debuff',
        stat: 'attack',
        value: -0.6,
        duration: 2,
        source: 'unit_2',
      };

      buffManager.addBuff('unit_a', debuff1);
      buffManager.addBuff('unit_a', debuff2);

      const modifier = buffManager.getStatModifier('unit_a', 'attack');
      expect(modifier).toBe(0.1); // 최소 0.1
    });
  });

  describe('유틸리티 메서드', () => {
    it('getBuffsByType()으로 버프만 조회할 수 있다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };
      const debuff: ActiveBuff = {
        id: 'debuff_1',
        skillId: 'confusion',
        type: 'debuff',
        stat: 'attack',
        value: -0.5,
        duration: 2,
        source: 'unit_2',
      };

      buffManager.addBuff('unit_a', buff);
      buffManager.addBuff('unit_a', debuff);

      const buffs = buffManager.getBuffsByType('unit_a', 'buff');
      const debuffs = buffManager.getBuffsByType('unit_a', 'debuff');

      expect(buffs).toHaveLength(1);
      expect(buffs[0].type).toBe('buff');
      expect(debuffs).toHaveLength(1);
      expect(debuffs[0].type).toBe('debuff');
    });

    it('hasBuffFromSkill()로 특정 스킬의 버프 여부를 확인할 수 있다', () => {
      const buff: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff);

      expect(buffManager.hasBuffFromSkill('unit_a', 'iron_wall')).toBe(true);
      expect(buffManager.hasBuffFromSkill('unit_a', 'confusion')).toBe(false);
    });

    it('clearAllBuffs()로 모든 버프를 초기화할 수 있다', () => {
      const buff1: ActiveBuff = {
        id: 'buff_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'unit_1',
      };
      const buff2: ActiveBuff = {
        id: 'buff_2',
        skillId: 'power_up',
        type: 'buff',
        stat: 'attack',
        value: 0.3,
        duration: 2,
        source: 'unit_1',
      };

      buffManager.addBuff('unit_a', buff1);
      buffManager.addBuff('unit_b', buff2);

      buffManager.clearAllBuffs();

      expect(buffManager.getActiveBuffs('unit_a')).toHaveLength(0);
      expect(buffManager.getActiveBuffs('unit_b')).toHaveLength(0);
    });
  });

  describe('철벽(iron_wall) / 혼란(confusion) 시나리오', () => {
    it('철벽: 방어력 +50%가 정상 적용된다', () => {
      // 철벽 스킬 효과 시뮬레이션
      const ironWallBuff: ActiveBuff = {
        id: 'iron_wall_defense_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5, // +50%
        duration: 2,
        source: 'caster_1',
      };

      buffManager.addBuff('front_unit_1', ironWallBuff);
      buffManager.addBuff('front_unit_2', ironWallBuff);

      // 방어력 100인 유닛의 최종 방어력
      const baseDef = 100;
      const modifier = buffManager.getStatModifier('front_unit_1', 'defense');
      const modifiedDef = Math.floor(baseDef * modifier);

      expect(modifiedDef).toBe(150); // 100 * 1.5 = 150
    });

    it('혼란: 공격력 -50%가 정상 적용된다', () => {
      // 혼란 스킬 효과 시뮬레이션
      const confusionDebuff: ActiveBuff = {
        id: 'confusion_attack_1',
        skillId: 'confusion',
        type: 'debuff',
        stat: 'attack',
        value: -0.5, // -50%
        duration: 2,
        source: 'caster_1',
      };

      buffManager.addBuff('enemy_1', confusionDebuff);
      buffManager.addBuff('enemy_2', confusionDebuff);
      buffManager.addBuff('enemy_3', confusionDebuff);

      // 공격력 80인 유닛의 최종 공격력
      const baseAtk = 80;
      const modifier = buffManager.getStatModifier('enemy_1', 'attack');
      const modifiedAtk = Math.floor(baseAtk * modifier);

      expect(modifiedAtk).toBe(40); // 80 * 0.5 = 40
    });

    it('2턴 후 버프/디버프가 만료된다', () => {
      const buff: ActiveBuff = {
        id: 'iron_wall_defense_1',
        skillId: 'iron_wall',
        type: 'buff',
        stat: 'defense',
        value: 0.5,
        duration: 2,
        source: 'caster_1',
      };

      buffManager.addBuff('unit_a', buff);

      // 1턴 경과
      buffManager.tickBuffs();
      expect(buffManager.getActiveBuffs('unit_a')).toHaveLength(1);

      // 2턴 경과 - 만료
      const expired = buffManager.tickBuffs();
      expect(expired).toHaveLength(1);
      expect(buffManager.getActiveBuffs('unit_a')).toHaveLength(0);
    });
  });
});
