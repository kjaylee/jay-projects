/**
 * TerrainManager - 지형/날씨 효과 시스템
 * 
 * 영걸전/코에이 삼국지 스타일의 지형과 날씨 시스템
 * 
 * 지형 타입:
 * - 평지(plain): 기본
 * - 숲(forest): 화계 +25%, 기병 이동력 -1
 * - 수변(water): 수계 +25%
 * - 산지(mountain): 낙석 +25%, 방어력 +10%
 * - 성벽(castle): 방어력 +30%
 * 
 * 날씨 타입:
 * - 맑음(clear): 기본
 * - 비(rain): 화계 75%, 수계 100%, 이동력 -1
 * - 안개(fog): 명중률 -20%
 */

import { GeneralClass } from '../entities/General';

export type TerrainType = 'plain' | 'forest' | 'water' | 'mountain' | 'castle';
export type WeatherType = 'clear' | 'rain' | 'fog' | 'wind';
export type SkillElement = 'fire' | 'water' | 'rock' | 'normal';

export interface TerrainEffect {
  type: TerrainType;
  name: string;
  nameEn: string;
  description: string;
  defenseBonus: number;         // 방어력 보너스 (배율)
  movementCost: number;         // 이동력 비용 (기본 1)
  cavalryMovementPenalty: number; // 기병 추가 이동력 비용
  skillModifiers: Partial<Record<SkillElement, number>>; // 계략 타입별 배율
  accuracyModifier: number;     // 명중률 보정
}

export interface WeatherEffect {
  type: WeatherType;
  name: string;
  nameEn: string;
  description: string;
  movementModifier: number;     // 이동력 보정
  accuracyModifier: number;     // 명중률 보정
  skillModifiers: Partial<Record<SkillElement, number>>; // 계략 타입별 배율
  duration: number;             // 지속 턴 수
}

export interface CombatModifiers {
  defenseMultiplier: number;
  attackMultiplier: number;
  accuracyMultiplier: number;
  movementCost: number;
  skillMultipliers: Record<SkillElement, number>;
}

/**
 * 지형 효과 데이터
 */
export const TERRAIN_EFFECTS: Record<TerrainType, TerrainEffect> = {
  plain: {
    type: 'plain',
    name: '평지',
    nameEn: 'Plain',
    description: '기본 지형. 특별한 효과 없음.',
    defenseBonus: 1.0,
    movementCost: 1,
    cavalryMovementPenalty: 0,
    skillModifiers: {},
    accuracyModifier: 1.0,
  },
  forest: {
    type: 'forest',
    name: '숲',
    nameEn: 'Forest',
    description: '화계 데미지 +25%, 기병 이동력 -1',
    defenseBonus: 1.05,
    movementCost: 1,
    cavalryMovementPenalty: 1,
    skillModifiers: { fire: 1.25 },
    accuracyModifier: 0.95,
  },
  water: {
    type: 'water',
    name: '수변',
    nameEn: 'Water',
    description: '수계 데미지 +25%, 기병 이동력 -2',
    defenseBonus: 0.95,
    movementCost: 2,
    cavalryMovementPenalty: 2,
    skillModifiers: { water: 1.25 },
    accuracyModifier: 1.0,
  },
  mountain: {
    type: 'mountain',
    name: '산지',
    nameEn: 'Mountain',
    description: '낙석 데미지 +25%, 방어력 +10%',
    defenseBonus: 1.10,
    movementCost: 2,
    cavalryMovementPenalty: 1,
    skillModifiers: { rock: 1.25 },
    accuracyModifier: 0.9,
  },
  castle: {
    type: 'castle',
    name: '성벽',
    nameEn: 'Castle',
    description: '방어력 +30%, 이동 불가',
    defenseBonus: 1.30,
    movementCost: 3,
    cavalryMovementPenalty: 0,
    skillModifiers: {},
    accuracyModifier: 1.0,
  },
};

/**
 * 날씨 효과 데이터
 */
export const WEATHER_EFFECTS: Record<WeatherType, WeatherEffect> = {
  clear: {
    type: 'clear',
    name: '맑음',
    nameEn: 'Clear',
    description: '기본 날씨. 특별한 효과 없음.',
    movementModifier: 0,
    accuracyModifier: 1.0,
    skillModifiers: {},
    duration: -1, // 무한
  },
  rain: {
    type: 'rain',
    name: '비',
    nameEn: 'Rain',
    description: '화계 75%, 수계 100%, 이동력 -1',
    movementModifier: -1,
    accuracyModifier: 0.95,
    skillModifiers: { fire: 0.75, water: 1.0 },
    duration: 3,
  },
  fog: {
    type: 'fog',
    name: '안개',
    nameEn: 'Fog',
    description: '명중률 -20%, 매복 유리',
    movementModifier: 0,
    accuracyModifier: 0.80,
    skillModifiers: {},
    duration: 2,
  },
  wind: {
    type: 'wind',
    name: '바람',
    nameEn: 'Wind',
    description: '화계 +50% 확산, 궁병 명중률 -10%',
    movementModifier: 0,
    accuracyModifier: 0.90,
    skillModifiers: { fire: 1.50 },
    duration: 2,
  },
};

/**
 * 전장 맵 타일
 */
export interface BattleTile {
  row: number;
  col: number;
  terrain: TerrainType;
}

/**
 * 전장 상태
 */
export interface BattlefieldState {
  width: number;
  height: number;
  tiles: BattleTile[][];
  weather: WeatherType;
  weatherDuration: number;
}

export class TerrainManager {
  private battlefield: BattlefieldState;

  constructor(width: number = 3, height: number = 3) {
    this.battlefield = this.createDefaultBattlefield(width, height);
  }

  /**
   * 기본 전장 생성 (모두 평지)
   */
  private createDefaultBattlefield(width: number, height: number): BattlefieldState {
    const tiles: BattleTile[][] = [];
    for (let row = 0; row < height; row++) {
      tiles[row] = [];
      for (let col = 0; col < width; col++) {
        tiles[row][col] = { row, col, terrain: 'plain' };
      }
    }

    return {
      width,
      height,
      tiles,
      weather: 'clear',
      weatherDuration: -1,
    };
  }

  /**
   * 지형 설정
   */
  setTerrain(row: number, col: number, terrain: TerrainType): void {
    if (this.isValidPosition(row, col)) {
      this.battlefield.tiles[row][col].terrain = terrain;
    }
  }

  /**
   * 지형 조회
   */
  getTerrain(row: number, col: number): TerrainType {
    if (!this.isValidPosition(row, col)) {
      return 'plain';
    }
    return this.battlefield.tiles[row][col].terrain;
  }

  /**
   * 지형 효과 조회
   */
  getTerrainEffect(row: number, col: number): TerrainEffect {
    const terrain = this.getTerrain(row, col);
    return TERRAIN_EFFECTS[terrain];
  }

  /**
   * 날씨 설정
   */
  setWeather(weather: WeatherType): void {
    this.battlefield.weather = weather;
    this.battlefield.weatherDuration = WEATHER_EFFECTS[weather].duration;
  }

  /**
   * 현재 날씨 조회
   */
  getWeather(): WeatherType {
    return this.battlefield.weather;
  }

  /**
   * 날씨 효과 조회
   */
  getWeatherEffect(): WeatherEffect {
    return WEATHER_EFFECTS[this.battlefield.weather];
  }

  /**
   * 턴 진행 (날씨 duration 감소)
   */
  advanceTurn(): void {
    if (this.battlefield.weatherDuration > 0) {
      this.battlefield.weatherDuration--;
      if (this.battlefield.weatherDuration === 0) {
        this.setWeather('clear');
      }
    }
  }

  /**
   * 위치 유효성 검사
   */
  isValidPosition(row: number, col: number): boolean {
    return (
      row >= 0 &&
      row < this.battlefield.height &&
      col >= 0 &&
      col < this.battlefield.width
    );
  }

  /**
   * 전투 보정치 계산
   */
  getCombatModifiers(
    row: number,
    col: number,
    generalClass?: GeneralClass
  ): CombatModifiers {
    const terrain = this.getTerrainEffect(row, col);
    const weather = this.getWeatherEffect();

    // 기본 계략 배율
    const skillMultipliers: Record<SkillElement, number> = {
      fire: 1.0,
      water: 1.0,
      rock: 1.0,
      normal: 1.0,
    };

    // 지형 계략 보정 적용
    for (const [element, modifier] of Object.entries(terrain.skillModifiers)) {
      skillMultipliers[element as SkillElement] *= modifier;
    }

    // 날씨 계략 보정 적용
    for (const [element, modifier] of Object.entries(weather.skillModifiers)) {
      skillMultipliers[element as SkillElement] *= modifier;
    }

    // 이동력 비용 계산
    let movementCost = terrain.movementCost;
    if (generalClass === 'cavalry') {
      movementCost += terrain.cavalryMovementPenalty;
    }
    movementCost = Math.max(1, movementCost + weather.movementModifier);

    return {
      defenseMultiplier: terrain.defenseBonus,
      attackMultiplier: 1.0,
      accuracyMultiplier: terrain.accuracyModifier * weather.accuracyModifier,
      movementCost,
      skillMultipliers,
    };
  }

  /**
   * 계략 데미지 계산
   */
  calculateSkillDamage(
    baseDamage: number,
    skillElement: SkillElement,
    row: number,
    col: number
  ): number {
    const modifiers = this.getCombatModifiers(row, col);
    return Math.floor(baseDamage * modifiers.skillMultipliers[skillElement]);
  }

  /**
   * 방어력 보정 계산
   */
  getDefenseBonus(row: number, col: number): number {
    const terrain = this.getTerrainEffect(row, col);
    return terrain.defenseBonus;
  }

  /**
   * 명중률 보정 계산
   */
  getAccuracyModifier(row: number, col: number): number {
    const terrain = this.getTerrainEffect(row, col);
    const weather = this.getWeatherEffect();
    return terrain.accuracyModifier * weather.accuracyModifier;
  }

  /**
   * 이동력 비용 계산
   */
  getMovementCost(row: number, col: number, generalClass?: GeneralClass): number {
    const terrain = this.getTerrainEffect(row, col);
    const weather = this.getWeatherEffect();

    let cost = terrain.movementCost;
    if (generalClass === 'cavalry') {
      cost += terrain.cavalryMovementPenalty;
    }
    cost = Math.max(1, cost + weather.movementModifier);

    return cost;
  }

  /**
   * 랜덤 날씨 변경 (확률 기반)
   */
  randomWeatherChange(changeChance: number = 0.1): boolean {
    if (Math.random() < changeChance) {
      const weathers: WeatherType[] = ['clear', 'rain', 'fog', 'wind'];
      const currentIndex = weathers.indexOf(this.battlefield.weather);
      
      // 현재 날씨 제외하고 랜덤 선택
      const availableWeathers = weathers.filter((_, i) => i !== currentIndex);
      const newWeather = availableWeathers[Math.floor(Math.random() * availableWeathers.length)];
      
      this.setWeather(newWeather);
      return true;
    }
    return false;
  }

  /**
   * 전장 상태 조회
   */
  getBattlefieldState(): BattlefieldState {
    return { ...this.battlefield };
  }

  /**
   * 전장 맵 생성 (시나리오별)
   */
  static createBattlefield(scenario: string): TerrainManager {
    const manager = new TerrainManager(3, 3);

    switch (scenario) {
      case 'chibi':
        // 적벽: 수변 + 바람
        manager.setTerrain(0, 0, 'water');
        manager.setTerrain(0, 1, 'water');
        manager.setTerrain(0, 2, 'water');
        manager.setWeather('wind');
        break;

      case 'hulao':
        // 호로관: 성벽 + 산지
        manager.setTerrain(0, 1, 'castle');
        manager.setTerrain(1, 0, 'mountain');
        manager.setTerrain(1, 2, 'mountain');
        break;

      case 'bowang':
        // 박망파: 숲 + 화계 유리
        manager.setTerrain(0, 0, 'forest');
        manager.setTerrain(0, 2, 'forest');
        manager.setTerrain(1, 1, 'forest');
        break;

      case 'yiling':
        // 이릉: 숲 + 연영
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            manager.setTerrain(row, col, 'forest');
          }
        }
        manager.setWeather('clear');
        break;

      default:
        // 기본: 평지
        break;
    }

    return manager;
  }

  /**
   * 지형 설명 가져오기
   */
  static getTerrainDescription(terrain: TerrainType): string {
    return TERRAIN_EFFECTS[terrain].description;
  }

  /**
   * 날씨 설명 가져오기
   */
  static getWeatherDescription(weather: WeatherType): string {
    return WEATHER_EFFECTS[weather].description;
  }

  /**
   * 모든 지형 타입 가져오기
   */
  static getAllTerrainTypes(): TerrainType[] {
    return Object.keys(TERRAIN_EFFECTS) as TerrainType[];
  }

  /**
   * 모든 날씨 타입 가져오기
   */
  static getAllWeatherTypes(): WeatherType[] {
    return Object.keys(WEATHER_EFFECTS) as WeatherType[];
  }
}
