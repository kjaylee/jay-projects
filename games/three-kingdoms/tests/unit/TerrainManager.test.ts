import { describe, it, expect, beforeEach } from 'vitest';
import {
  TerrainManager,
  TERRAIN_EFFECTS,
  WEATHER_EFFECTS,
  TerrainType,
  WeatherType,
} from '../../src/managers/TerrainManager';

describe('TerrainManager', () => {
  let manager: TerrainManager;

  beforeEach(() => {
    manager = new TerrainManager(3, 3);
  });

  describe('전장 생성', () => {
    it('기본 전장은 모두 평지이다', () => {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(manager.getTerrain(row, col)).toBe('plain');
        }
      }
    });

    it('기본 날씨는 맑음이다', () => {
      expect(manager.getWeather()).toBe('clear');
    });
  });

  describe('지형 설정 및 조회', () => {
    it('지형을 설정할 수 있다', () => {
      manager.setTerrain(0, 0, 'forest');
      
      expect(manager.getTerrain(0, 0)).toBe('forest');
    });

    it('유효하지 않은 위치는 평지를 반환한다', () => {
      expect(manager.getTerrain(-1, 0)).toBe('plain');
      expect(manager.getTerrain(10, 10)).toBe('plain');
    });

    it('유효하지 않은 위치에 설정해도 에러가 나지 않는다', () => {
      expect(() => manager.setTerrain(-1, 0, 'forest')).not.toThrow();
    });
  });

  describe('지형 효과', () => {
    describe('평지(plain)', () => {
      it('기본 효과를 가진다', () => {
        const effect = TERRAIN_EFFECTS.plain;
        
        expect(effect.defenseBonus).toBe(1.0);
        expect(effect.movementCost).toBe(1);
        expect(effect.accuracyModifier).toBe(1.0);
      });
    });

    describe('숲(forest)', () => {
      it('화계 데미지 +25%이다', () => {
        const effect = TERRAIN_EFFECTS.forest;
        
        expect(effect.skillModifiers.fire).toBe(1.25);
      });

      it('기병 이동력 -1이다', () => {
        const effect = TERRAIN_EFFECTS.forest;
        
        expect(effect.cavalryMovementPenalty).toBe(1);
      });
    });

    describe('수변(water)', () => {
      it('수계 데미지 +25%이다', () => {
        const effect = TERRAIN_EFFECTS.water;
        
        expect(effect.skillModifiers.water).toBe(1.25);
      });

      it('이동 비용이 높다', () => {
        const effect = TERRAIN_EFFECTS.water;
        
        expect(effect.movementCost).toBe(2);
      });
    });

    describe('산지(mountain)', () => {
      it('낙석 데미지 +25%이다', () => {
        const effect = TERRAIN_EFFECTS.mountain;
        
        expect(effect.skillModifiers.rock).toBe(1.25);
      });

      it('방어력 +10%이다', () => {
        const effect = TERRAIN_EFFECTS.mountain;
        
        expect(effect.defenseBonus).toBe(1.10);
      });
    });

    describe('성벽(castle)', () => {
      it('방어력 +30%이다', () => {
        const effect = TERRAIN_EFFECTS.castle;
        
        expect(effect.defenseBonus).toBe(1.30);
      });
    });
  });

  describe('날씨 설정 및 효과', () => {
    it('날씨를 설정할 수 있다', () => {
      manager.setWeather('rain');
      
      expect(manager.getWeather()).toBe('rain');
    });

    describe('비(rain)', () => {
      it('화계 75%로 감소한다', () => {
        const effect = WEATHER_EFFECTS.rain;
        
        expect(effect.skillModifiers.fire).toBe(0.75);
      });

      it('이동력 -1이다', () => {
        const effect = WEATHER_EFFECTS.rain;
        
        expect(effect.movementModifier).toBe(-1);
      });

      it('지속 시간이 3턴이다', () => {
        const effect = WEATHER_EFFECTS.rain;
        
        expect(effect.duration).toBe(3);
      });
    });

    describe('안개(fog)', () => {
      it('명중률 -20%이다', () => {
        const effect = WEATHER_EFFECTS.fog;
        
        expect(effect.accuracyModifier).toBe(0.80);
      });
    });

    describe('바람(wind)', () => {
      it('화계 +50%이다', () => {
        const effect = WEATHER_EFFECTS.wind;
        
        expect(effect.skillModifiers.fire).toBe(1.50);
      });
    });
  });

  describe('턴 진행', () => {
    it('날씨 duration이 감소한다', () => {
      manager.setWeather('rain');
      const state = manager.getBattlefieldState();
      const initialDuration = state.weatherDuration;
      
      manager.advanceTurn();
      
      expect(manager.getBattlefieldState().weatherDuration).toBe(initialDuration - 1);
    });

    it('duration이 0이 되면 맑음으로 변경된다', () => {
      manager.setWeather('fog'); // duration 2
      
      manager.advanceTurn();
      manager.advanceTurn();
      
      expect(manager.getWeather()).toBe('clear');
    });

    it('맑음은 duration이 무한(-1)이다', () => {
      manager.setWeather('clear');
      
      manager.advanceTurn();
      
      expect(manager.getWeather()).toBe('clear');
    });
  });

  describe('전투 보정치 계산', () => {
    it('지형과 날씨 효과가 합산된다', () => {
      manager.setTerrain(0, 0, 'forest');
      manager.setWeather('wind');
      
      const modifiers = manager.getCombatModifiers(0, 0);
      
      // 숲(1.25) * 바람(1.50) = 1.875
      expect(modifiers.skillMultipliers.fire).toBeCloseTo(1.875);
    });

    it('기병은 추가 이동 패널티가 있다', () => {
      manager.setTerrain(0, 0, 'forest');
      
      const normalCost = manager.getCombatModifiers(0, 0).movementCost;
      const cavalryCost = manager.getCombatModifiers(0, 0, 'cavalry').movementCost;
      
      expect(cavalryCost).toBeGreaterThan(normalCost);
    });
  });

  describe('계략 데미지 계산', () => {
    it('지형 보너스가 적용된다', () => {
      manager.setTerrain(0, 0, 'forest');
      
      const baseDamage = 100;
      const damage = manager.calculateSkillDamage(baseDamage, 'fire', 0, 0);
      
      expect(damage).toBe(125); // +25%
    });

    it('날씨 효과가 적용된다', () => {
      manager.setWeather('rain');
      
      const baseDamage = 100;
      const damage = manager.calculateSkillDamage(baseDamage, 'fire', 0, 0);
      
      expect(damage).toBe(75); // -25%
    });
  });

  describe('방어력 보정', () => {
    it('성벽에서 방어력 +30%이다', () => {
      manager.setTerrain(0, 0, 'castle');
      
      const bonus = manager.getDefenseBonus(0, 0);
      
      expect(bonus).toBe(1.30);
    });
  });

  describe('명중률 보정', () => {
    it('안개에서 명중률 -20%이다', () => {
      manager.setWeather('fog');
      
      const modifier = manager.getAccuracyModifier(0, 0);
      
      expect(modifier).toBe(0.80);
    });

    it('지형과 날씨가 합산된다', () => {
      manager.setTerrain(0, 0, 'mountain'); // 0.9
      manager.setWeather('fog'); // 0.8
      
      const modifier = manager.getAccuracyModifier(0, 0);
      
      expect(modifier).toBeCloseTo(0.72); // 0.9 * 0.8
    });
  });

  describe('이동력 계산', () => {
    it('수변에서 이동 비용이 높다', () => {
      manager.setTerrain(0, 0, 'water');
      
      const cost = manager.getMovementCost(0, 0);
      
      expect(cost).toBe(2);
    });

    it('비가 오면 추가로 -1이다', () => {
      manager.setTerrain(0, 0, 'plain');
      manager.setWeather('rain');
      
      const cost = manager.getMovementCost(0, 0);
      
      expect(cost).toBe(1); // 최소 1
    });
  });

  describe('시나리오별 전장 생성', () => {
    it('적벽(chibi) 전장을 생성한다', () => {
      const chibi = TerrainManager.createBattlefield('chibi');
      
      expect(chibi.getTerrain(0, 0)).toBe('water');
      expect(chibi.getTerrain(0, 1)).toBe('water');
      expect(chibi.getWeather()).toBe('wind');
    });

    it('호로관(hulao) 전장을 생성한다', () => {
      const hulao = TerrainManager.createBattlefield('hulao');
      
      expect(hulao.getTerrain(0, 1)).toBe('castle');
      expect(hulao.getTerrain(1, 0)).toBe('mountain');
    });

    it('박망파(bowang) 전장을 생성한다', () => {
      const bowang = TerrainManager.createBattlefield('bowang');
      
      expect(bowang.getTerrain(0, 0)).toBe('forest');
      expect(bowang.getTerrain(1, 1)).toBe('forest');
    });

    it('이릉(yiling) 전장을 생성한다', () => {
      const yiling = TerrainManager.createBattlefield('yiling');
      
      // 전체가 숲
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(yiling.getTerrain(row, col)).toBe('forest');
        }
      }
    });

    it('기본 시나리오는 평지이다', () => {
      const defaultField = TerrainManager.createBattlefield('unknown');
      
      expect(defaultField.getTerrain(0, 0)).toBe('plain');
    });
  });

  describe('랜덤 날씨 변경', () => {
    it('확률에 따라 날씨가 변경될 수 있다', () => {
      let changed = false;
      
      for (let i = 0; i < 100; i++) {
        const newManager = new TerrainManager();
        if (newManager.randomWeatherChange(0.5)) {
          changed = true;
          break;
        }
      }
      
      expect(changed).toBe(true);
    });

    it('확률 0이면 변경되지 않는다', () => {
      const result = manager.randomWeatherChange(0);
      
      expect(result).toBe(false);
      expect(manager.getWeather()).toBe('clear');
    });
  });

  describe('유틸리티 함수', () => {
    it('지형 설명을 반환한다', () => {
      const description = TerrainManager.getTerrainDescription('forest');
      
      expect(description).toContain('화계');
      expect(description).toContain('기병');
    });

    it('날씨 설명을 반환한다', () => {
      const description = TerrainManager.getWeatherDescription('rain');
      
      expect(description).toContain('화계');
      expect(description).toContain('수계');
    });

    it('모든 지형 타입을 반환한다', () => {
      const types = TerrainManager.getAllTerrainTypes();
      
      expect(types).toContain('plain');
      expect(types).toContain('forest');
      expect(types).toContain('water');
      expect(types).toContain('mountain');
      expect(types).toContain('castle');
    });

    it('모든 날씨 타입을 반환한다', () => {
      const types = TerrainManager.getAllWeatherTypes();
      
      expect(types).toContain('clear');
      expect(types).toContain('rain');
      expect(types).toContain('fog');
      expect(types).toContain('wind');
    });
  });

  describe('전장 상태 조회', () => {
    it('전장 상태를 반환한다', () => {
      manager.setTerrain(0, 0, 'forest');
      manager.setWeather('rain');
      
      const state = manager.getBattlefieldState();
      
      expect(state.width).toBe(3);
      expect(state.height).toBe(3);
      expect(state.weather).toBe('rain');
      expect(state.tiles[0][0].terrain).toBe('forest');
    });
  });
});
