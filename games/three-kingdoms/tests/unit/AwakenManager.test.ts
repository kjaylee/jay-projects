import { describe, it, expect, beforeEach } from 'vitest';
import { General, AwakenData } from '../../src/entities/General';
import { AwakenManager } from '../../src/managers/AwakenManager';

describe('AwakenManager', () => {
  let awakenManager: AwakenManager;

  const createURGeneral = (config: Partial<{
    level: number;
    stars: number;
    awakened: boolean;
    awakenData: AwakenData;
  }> = {}) => {
    return new General({
      id: 'lu_bu_unrivaled',
      name: '여포(천하무쌍)',
      grade: 'UR',
      generalClass: 'cavalry',
      faction: 'other',
      baseStats: { attack: 145, defense: 110, intelligence: 60, speed: 130, politics: 45 },
      level: config.level ?? 100,
      stars: config.stars ?? 5,
      awakened: config.awakened ?? false,
      awakenData: config.awakenData ?? {
        awakenStats: { attack: 250, defense: 120, intelligence: 50, speed: 180, politics: 30 },
        awakenSkillId: 'skill_godslayer',
        awakenCost: { gold: 200000, awakenStones: 100 },
      },
    });
  };

  const createSSRGeneral = () => {
    return new General({
      id: 'cao_cao',
      name: '조조',
      grade: 'SSR',
      generalClass: 'cavalry',
      faction: 'wei',
      baseStats: { attack: 85, defense: 90, intelligence: 96, speed: 88, politics: 99 },
      level: 100,
      stars: 5,
    });
  };

  beforeEach(() => {
    awakenManager = AwakenManager.getInstance();
  });

  describe('checkAwaken', () => {
    it('UR 등급, 최대 레벨, 최대 별, 충분한 재료 시 각성 가능', () => {
      const general = createURGeneral();
      const resources = { gold: 200000, awakenStones: 100 };

      const result = awakenManager.checkAwaken(general, resources);

      expect(result.canAwaken).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('SSR 등급은 각성 불가', () => {
      const general = createSSRGeneral();
      const resources = { gold: 200000, awakenStones: 100 };

      const result = awakenManager.checkAwaken(general, resources);

      expect(result.canAwaken).toBe(false);
      expect(result.reasons).toContain('UR 등급 장수만 각성 가능합니다.');
    });

    it('최대 레벨 미달 시 각성 불가', () => {
      const general = createURGeneral({ level: 50 });
      const resources = { gold: 200000, awakenStones: 100 };

      const result = awakenManager.checkAwaken(general, resources);

      expect(result.canAwaken).toBe(false);
      expect(result.reasons.some(r => r.includes('최대 레벨'))).toBe(true);
    });

    it('최대 별 미달 시 각성 불가', () => {
      const general = createURGeneral({ stars: 3 });
      const resources = { gold: 200000, awakenStones: 100 };

      const result = awakenManager.checkAwaken(general, resources);

      expect(result.canAwaken).toBe(false);
      expect(result.reasons.some(r => r.includes('최대 별'))).toBe(true);
    });

    it('이미 각성한 장수는 각성 불가', () => {
      const general = createURGeneral({ awakened: true });
      const resources = { gold: 200000, awakenStones: 100 };

      const result = awakenManager.checkAwaken(general, resources);

      expect(result.canAwaken).toBe(false);
      expect(result.reasons).toContain('이미 각성한 장수입니다.');
    });

    it('골드 부족 시 각성 불가', () => {
      const general = createURGeneral();
      const resources = { gold: 50000, awakenStones: 100 };

      const result = awakenManager.checkAwaken(general, resources);

      expect(result.canAwaken).toBe(false);
      expect(result.reasons.some(r => r.includes('골드가 부족'))).toBe(true);
    });

    it('각성석 부족 시 각성 불가', () => {
      const general = createURGeneral();
      const resources = { gold: 200000, awakenStones: 30 };

      const result = awakenManager.checkAwaken(general, resources);

      expect(result.canAwaken).toBe(false);
      expect(result.reasons.some(r => r.includes('각성석이 부족'))).toBe(true);
    });
  });

  describe('executeAwaken', () => {
    it('조건 충족 시 각성 성공', () => {
      const general = createURGeneral();
      const resources = { gold: 200000, awakenStones: 100 };

      const result = awakenManager.executeAwaken(general, resources);

      expect(result.success).toBe(true);
      expect(result.message).toContain('각성 완료');
      expect(general.awakened).toBe(true);
    });

    it('각성 성공 시 신규 스킬 ID 반환', () => {
      const general = createURGeneral();
      const resources = { gold: 200000, awakenStones: 100 };

      const result = awakenManager.executeAwaken(general, resources);

      expect(result.newSkillId).toBe('skill_godslayer');
    });

    it('조건 미충족 시 각성 실패', () => {
      const general = createURGeneral({ level: 50 });
      const resources = { gold: 200000, awakenStones: 100 };

      const result = awakenManager.executeAwaken(general, resources);

      expect(result.success).toBe(false);
      expect(general.awakened).toBe(false);
    });
  });

  describe('previewAwakenStats', () => {
    it('각성 보너스 스탯 미리보기', () => {
      const general = createURGeneral();

      const preview = awakenManager.previewAwakenStats(general);

      expect(preview).not.toBeNull();
      expect(preview!.attack).toBe(250);
      expect(preview!.defense).toBe(120);
      expect(preview!.intelligence).toBe(50);
      expect(preview!.speed).toBe(180);
    });

    it('각성 데이터 없는 장수는 null 반환', () => {
      const general = createSSRGeneral();

      const preview = awakenManager.previewAwakenStats(general);

      expect(preview).toBeNull();
    });
  });

  describe('getCombatPowerIncrease', () => {
    it('전투력 증가량 계산 (정치 제외)', () => {
      const general = createURGeneral();

      const increase = awakenManager.getCombatPowerIncrease(general);

      // attack(250) + defense(120) + intelligence(50) + speed(180) = 600
      expect(increase).toBe(600);
    });
  });
});

describe('General 각성 기능', () => {
  const createAwakenableGeneral = (awakened: boolean = false) => {
    return new General({
      id: 'guan_yu_god',
      name: '관우(신)',
      grade: 'UR',
      generalClass: 'warrior',
      faction: 'shu',
      baseStats: { attack: 130, defense: 115, intelligence: 100, speed: 110, politics: 95 },
      level: 100,
      stars: 5,
      awakened,
      awakenData: {
        awakenStats: { attack: 200, defense: 150, intelligence: 100, speed: 120, politics: 80 },
        awakenSkillId: 'skill_divine_judgment',
        awakenCost: { gold: 150000, awakenStones: 80 },
      },
    });
  };

  describe('canAwaken', () => {
    it('조건 충족 시 true 반환', () => {
      const general = createAwakenableGeneral();
      expect(general.canAwaken()).toBe(true);
    });

    it('이미 각성 시 false 반환', () => {
      const general = createAwakenableGeneral(true);
      expect(general.canAwaken()).toBe(false);
    });

    it('레벨 미달 시 false 반환', () => {
      const general = new General({
        id: 'test',
        name: '테스트',
        grade: 'UR',
        generalClass: 'warrior',
        faction: 'shu',
        baseStats: { attack: 100, defense: 100, intelligence: 100, speed: 100, politics: 100 },
        level: 50,
        stars: 5,
        awakenData: {
          awakenStats: { attack: 100 },
          awakenSkillId: 'skill_test',
          awakenCost: { gold: 100000, awakenStones: 50 },
        },
      });
      expect(general.canAwaken()).toBe(false);
    });
  });

  describe('awaken', () => {
    it('각성 성공 시 awakened 상태 변경', () => {
      const general = createAwakenableGeneral();
      
      expect(general.awakened).toBe(false);
      const success = general.awaken();
      
      expect(success).toBe(true);
      expect(general.awakened).toBe(true);
    });

    it('조건 미충족 시 각성 실패', () => {
      const general = createAwakenableGeneral(true); // 이미 각성
      
      const success = general.awaken();
      
      expect(success).toBe(false);
    });
  });

  describe('calculateStats (각성 보너스)', () => {
    it('각성 전 스탯 계산', () => {
      const general = createAwakenableGeneral();
      const stats = general.calculateStats();
      
      // level 100: * (1 + 100 * 0.1) = 11
      // stars 5: * (1 + 4 * 0.1) = 1.4
      // total: 11 * 1.4 = 15.4
      // attack: 130 * 15.4 = 2002 (floor 적용으로 2001)
      expect(stats.attack).toBe(2001);
    });

    it('각성 후 스탯에 보너스 적용', () => {
      const general = createAwakenableGeneral();
      general.awaken();
      const stats = general.calculateStats();
      
      // 기본 계산 후 각성 보너스가 더해지고 최종 floor 처리
      // attack: 130 * 15.4 + 200 = 2202
      expect(stats.attack).toBe(2202);
      // defense: 115 * 15.4 + 150 = 1920 (floor 적용)
      expect(stats.defense).toBe(1920);
    });
  });

  describe('getAllSkillIds', () => {
    it('각성 전에는 기본 스킬만 반환', () => {
      const general = createAwakenableGeneral();
      const skills = general.getAllSkillIds();
      
      expect(skills).not.toContain('skill_divine_judgment');
    });

    it('각성 후에는 각성 스킬 포함', () => {
      const general = createAwakenableGeneral();
      general.awaken();
      const skills = general.getAllSkillIds();
      
      expect(skills).toContain('skill_divine_judgment');
    });
  });

  describe('awakenedSkillId', () => {
    it('각성 전에는 null 반환', () => {
      const general = createAwakenableGeneral();
      expect(general.awakenedSkillId).toBeNull();
    });

    it('각성 후에는 각성 스킬 ID 반환', () => {
      const general = createAwakenableGeneral();
      general.awaken();
      expect(general.awakenedSkillId).toBe('skill_divine_judgment');
    });
  });

  describe('toJSON/fromJSON', () => {
    it('각성 상태 직렬화/역직렬화', () => {
      const general = createAwakenableGeneral();
      general.awaken();
      
      const json = general.toJSON();
      expect(json.awakened).toBe(true);
      
      const restored = General.fromJSON(json);
      expect(restored.awakened).toBe(true);
      expect(restored.awakenedSkillId).toBe('skill_divine_judgment');
    });
  });
});
