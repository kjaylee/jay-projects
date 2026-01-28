import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Phaser before importing SkillEffectManager
vi.mock('phaser', () => ({
  default: {
    Math: {
      Between: vi.fn((min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min),
      FloatBetween: vi.fn((min: number, max: number) => Math.random() * (max - min) + min),
      DegToRad: vi.fn((deg: number) => deg * Math.PI / 180),
    },
    BlendModes: {
      ADD: 1,
      NORMAL: 0,
    },
  },
}));

import { SkillEffectManager, SkillCategory } from '../../src/managers/SkillEffectManager';
import { SkillResult, EffectResult } from '../../src/managers/SkillExecutor';
import { BattleUnit } from '../../src/entities/BattleUnit';

// Mock Phaser Scene
const createMockScene = () => {
  const mockGraphics = {
    fillStyle: vi.fn().mockReturnThis(),
    fillCircle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    fillTriangle: vi.fn().mockReturnThis(),
    fillRoundedRect: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    strokeCircle: vi.fn().mockReturnThis(),
    lineBetween: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    strokePath: vi.fn().mockReturnThis(),
    beginPath: vi.fn().mockReturnThis(),
    closePath: vi.fn().mockReturnThis(),
    fillPath: vi.fn().mockReturnThis(),
    generateTexture: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    setPosition: vi.fn().mockReturnThis(),
    setRotation: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
  };

  const mockText = {
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };

  const mockTween = {
    targets: [],
    add: vi.fn().mockReturnValue({ targets: [] }),
  };

  const mockTime = {
    delayedCall: vi.fn((delay: number, callback: () => void) => {
      setTimeout(callback, 0);
      return { remove: vi.fn() };
    }),
  };

  const mockCamera = {
    width: 450,
    height: 800,
    shake: vi.fn(),
  };

  return {
    add: {
      graphics: vi.fn(() => mockGraphics),
      text: vi.fn(() => mockText),
      container: vi.fn(() => ({ add: vi.fn(), setDepth: vi.fn() })),
      rectangle: vi.fn(() => ({ setOrigin: vi.fn(), setDepth: vi.fn() })),
    },
    make: {
      graphics: vi.fn(() => mockGraphics),
    },
    textures: {
      exists: vi.fn(() => false),
    },
    tweens: {
      add: vi.fn((config) => {
        // 즉시 onComplete 호출
        if (config.onComplete) {
          setTimeout(() => config.onComplete(), 0);
        }
        return mockTween;
      }),
    },
    time: mockTime,
    cameras: {
      main: mockCamera,
    },
  } as unknown as Phaser.Scene;
};

// Mock BattleUnit
const createMockUnit = (overrides: Partial<BattleUnit> = {}): BattleUnit => ({
  id: 'unit_1',
  generalId: 'general_1',
  name: 'Test Unit',
  team: 'player',
  position: { row: 0, col: 1 },
  stats: {
    attack: 100,
    defense: 50,
    intelligence: 80,
    speed: 60,
    currentHp: 500,
    maxHp: 500,
  },
  level: 1,
  isAlive: true,
  skills: [],
  skillCooldowns: new Map(),
  ...overrides,
});

// Mock SkillResult
const createMockSkillResult = (overrides: Partial<SkillResult> = {}): SkillResult => ({
  success: true,
  skillId: 'fire_attack',
  skillName: '화계',
  caster: createMockUnit(),
  targets: [createMockUnit({ id: 'enemy_1', team: 'enemy' })],
  effects: [
    {
      type: 'damage',
      target: createMockUnit({ id: 'enemy_1', team: 'enemy' }),
      value: 150,
    },
  ],
  totalDamage: 150,
  totalHeal: 0,
  ...overrides,
});

describe('SkillEffectManager', () => {
  let scene: Phaser.Scene;
  let manager: SkillEffectManager;

  beforeEach(() => {
    vi.useFakeTimers();
    scene = createMockScene();
    manager = new SkillEffectManager(scene);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('생성 및 초기화', () => {
    it('SkillEffectManager 인스턴스를 생성한다', () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(SkillEffectManager);
    });

    it('파티클 텍스처를 생성한다', () => {
      expect(scene.textures.exists).toHaveBeenCalledWith('particle_circle');
      expect(scene.textures.exists).toHaveBeenCalledWith('particle_star');
      expect(scene.textures.exists).toHaveBeenCalledWith('particle_slash');
    });
  });

  describe('스킬 분류 (categorizeSkill)', () => {
    it('화계 스킬을 magical_fire로 분류한다', () => {
      const result = createMockSkillResult({
        skillId: 'fire_attack',
        skillName: '화계',
      });
      const category = manager.categorizeSkill('fire_attack', '화계', result);
      expect(category).toBe('magical_fire');
    });

    it('수계 스킬을 magical_ice로 분류한다', () => {
      const result = createMockSkillResult({
        skillId: 'water_attack',
        skillName: '수계',
      });
      const category = manager.categorizeSkill('water_attack', '수계', result);
      expect(category).toBe('magical_ice');
    });

    it('치료 스킬을 heal로 분류한다', () => {
      const result = createMockSkillResult({
        skillId: 'heal',
        skillName: '치료',
        totalHeal: 100,
        totalDamage: 0,
      });
      const category = manager.categorizeSkill('heal', '치료', result);
      expect(category).toBe('heal');
    });

    it('철벽 스킬을 buff로 분류한다', () => {
      const result = createMockSkillResult({
        skillId: 'iron_wall',
        skillName: '철벽',
        effects: [{ type: 'buff', target: createMockUnit(), value: 50, attribute: 'defense', duration: 2 }],
      });
      const category = manager.categorizeSkill('iron_wall', '철벽', result);
      expect(category).toBe('buff');
    });

    it('혼란 스킬을 debuff로 분류한다', () => {
      const result = createMockSkillResult({
        skillId: 'confusion',
        skillName: '혼란',
        effects: [{ type: 'debuff', target: createMockUnit(), value: -50, attribute: 'attack', duration: 2 }],
      });
      const category = manager.categorizeSkill('confusion', '혼란', result);
      expect(category).toBe('debuff');
    });

    it('낙석 스킬을 physical로 분류한다', () => {
      const result = createMockSkillResult({
        skillId: 'rockfall',
        skillName: '낙석',
      });
      const category = manager.categorizeSkill('rockfall', '낙석', result);
      expect(category).toBe('physical');
    });

    it('번개 스킬을 magical_lightning으로 분류한다', () => {
      const result = createMockSkillResult({
        skillId: 'lightning_bolt',
        skillName: '번개',
      });
      const category = manager.categorizeSkill('lightning_bolt', '번개', result);
      expect(category).toBe('magical_lightning');
    });

    it('효과 기반으로 회복 스킬을 분류한다', () => {
      const result = createMockSkillResult({
        skillId: 'unknown_skill',
        skillName: '알수없는스킬',
        totalHeal: 200,
        totalDamage: 0,
      });
      const category = manager.categorizeSkill('unknown_skill', '알수없는스킬', result);
      expect(category).toBe('heal');
    });

    it('기본값으로 physical을 반환한다', () => {
      const result = createMockSkillResult({
        skillId: 'basic_attack',
        skillName: '일반공격',
        totalDamage: 100,
        totalHeal: 0,
        effects: [{ type: 'damage', target: createMockUnit(), value: 100 }],
      });
      const category = manager.categorizeSkill('basic_attack', '일반공격', result);
      expect(category).toBe('physical');
    });
  });

  describe('배속 설정', () => {
    it('배속을 설정한다', () => {
      manager.setSpeed(2);
      // 내부 상태 확인을 위한 간접 테스트
      expect(manager.isEffectPlaying()).toBe(false);
    });

    it('배속 4배를 설정한다', () => {
      manager.setSpeed(4);
      expect(manager.isEffectPlaying()).toBe(false);
    });
  });

  describe('스킬 이펙트 재생', () => {
    it('스킬 이펙트를 재생한다', () => {
      const result = createMockSkillResult();
      const getUnitPosition = (unit: BattleUnit) => ({ x: 200, y: 300 });

      // 동기적으로 호출만 확인 (비동기 완료는 확인하지 않음)
      manager.playSkillEffect(result, getUnitPosition);
      
      // 비동기 처리를 위해 타이머 실행
      vi.runAllTimers();

      // 스킬 이름 텍스트 생성 확인
      expect(scene.add.text).toHaveBeenCalled();
      // 배경 그래픽 생성 확인
      expect(scene.add.graphics).toHaveBeenCalled();
    });

    it('이펙트 재생 중에는 중복 재생되지 않는다', () => {
      const result = createMockSkillResult();
      const getUnitPosition = () => ({ x: 200, y: 300 });

      // 첫 번째 재생 시작
      manager.playSkillEffect(result, getUnitPosition);
      
      // 즉시 두 번째 재생 시도
      const callCountBefore = (scene.add.text as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
      manager.playSkillEffect(result, getUnitPosition);
      const callCountAfter = (scene.add.text as unknown as { mock: { calls: unknown[] } }).mock.calls.length;

      // 두 번째 호출에서는 추가 텍스트가 생성되지 않아야 함
      expect(callCountAfter).toBe(callCountBefore);
      
      vi.runAllTimers();
    });
  });

  describe('데미지 숫자 표시', () => {
    it('데미지 숫자를 표시한다', async () => {
      const promise = manager.showDamageNumber({ x: 200, y: 300 }, 150, false);
      vi.runAllTimers();
      await promise;

      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        '-150',
        expect.objectContaining({
          color: '#ff4444',
        })
      );
    });

    it('크리티컬 데미지를 더 크게 표시한다', async () => {
      const promise = manager.showDamageNumber({ x: 200, y: 300 }, 300, true);
      vi.runAllTimers();
      await promise;

      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringContaining('300'),
        expect.objectContaining({
          fontSize: '32px',
          color: '#ffff00',
        })
      );
    });
  });

  describe('회복 숫자 표시', () => {
    it('회복 숫자를 녹색으로 표시한다', async () => {
      const promise = manager.showHealNumber({ x: 200, y: 300 }, 100);
      vi.runAllTimers();
      await promise;

      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        '+100',
        expect.objectContaining({
          color: '#44ff44',
        })
      );
    });
  });

  describe('기본 공격 이펙트', () => {
    it('기본 공격 히트 이펙트를 재생한다', () => {
      manager.playBasicAttackEffect({ x: 200, y: 300 });
      
      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.tweens.add).toHaveBeenCalled();
    });
  });

  describe('크리티컬 이펙트', () => {
    it('크리티컬 이펙트를 재생한다', () => {
      manager.playCriticalEffect({ x: 200, y: 300 });
      
      expect(scene.add.graphics).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.cameras.main.shake).toHaveBeenCalled();
    });
  });

  describe('정리', () => {
    it('destroy 호출 시 정리된다', () => {
      manager.destroy();
      // 에러 없이 완료되면 성공
      expect(true).toBe(true);
    });
  });
});
