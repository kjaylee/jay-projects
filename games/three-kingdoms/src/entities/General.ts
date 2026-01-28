import { GeneralStats, StatBonus } from './GeneralStats';

export type GeneralGrade = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type GeneralClass = 'warrior' | 'strategist' | 'archer' | 'cavalry' | 'support';
export type Faction = 'wei' | 'shu' | 'wu' | 'neutral' | 'other';

export interface GeneralConfig {
  id: string;
  name: string;
  grade: GeneralGrade;
  generalClass: GeneralClass;
  faction: Faction;
  baseStats: StatBonus;
  level?: number;
  stars?: number;
  exp?: number;
  skillIds?: string[];
}

const MAX_LEVEL = 100;
const MAX_STARS = 5;
const LEVEL_MULTIPLIER = 0.1;
const STAR_MULTIPLIER = 0.1;

/**
 * 장수 클래스
 * 레벨업 공식: base * (1 + level * 0.1)
 * 승급 공식: +10% per star
 */
export class General {
  public readonly id: string;
  public readonly name: string;
  public readonly grade: GeneralGrade;
  public readonly generalClass: GeneralClass;
  public readonly faction: Faction;
  public readonly baseStats: StatBonus;
  public readonly skillIds: string[];

  private _level: number;
  private _stars: number;
  private _exp: number;

  constructor(config: GeneralConfig) {
    this.id = config.id;
    this.name = config.name;
    this.grade = config.grade;
    this.generalClass = config.generalClass;
    this.faction = config.faction;
    this.baseStats = { ...config.baseStats };
    this.skillIds = config.skillIds ?? [];

    this._level = Math.min(config.level ?? 1, MAX_LEVEL);
    this._stars = Math.min(config.stars ?? 1, MAX_STARS);
    this._exp = config.exp ?? 0;
  }

  get level(): number {
    return this._level;
  }

  get stars(): number {
    return this._stars;
  }

  get exp(): number {
    return this._exp;
  }

  /**
   * 현재 스탯 계산
   * 공식: base * (1 + level * 0.1) * (1 + (stars - 1) * 0.1)
   */
  calculateStats(): GeneralStats {
    const levelMultiplier = 1 + this._level * LEVEL_MULTIPLIER;
    const starMultiplier = 1 + (this._stars - 1) * STAR_MULTIPLIER;
    const totalMultiplier = levelMultiplier * starMultiplier;

    return new GeneralStats(
      (this.baseStats.attack ?? 0) * totalMultiplier,
      (this.baseStats.defense ?? 0) * totalMultiplier,
      (this.baseStats.intelligence ?? 0) * totalMultiplier,
      (this.baseStats.speed ?? 0) * totalMultiplier,
      (this.baseStats.politics ?? 0) * totalMultiplier
    );
  }

  /**
   * 레벨업
   */
  levelUp(levels: number = 1): void {
    this._level = Math.min(this._level + levels, MAX_LEVEL);
  }

  /**
   * 경험치 추가
   */
  addExp(amount: number): number {
    this._exp += amount;
    let levelUps = 0;

    while (this._exp >= this.expToNextLevel && this._level < MAX_LEVEL) {
      this._exp -= this.expToNextLevel;
      this._level++;
      levelUps++;
    }

    return levelUps;
  }

  /**
   * 다음 레벨까지 필요 경험치
   */
  get expToNextLevel(): number {
    return this._level * 100;
  }

  /**
   * 승급 (별 증가)
   */
  upgrade(): void {
    if (this._stars < MAX_STARS) {
      this._stars++;
    }
  }

  /**
   * 전투력 계산
   */
  get combatPower(): number {
    return this.calculateStats().combatPower;
  }

  /**
   * 등급 색상
   */
  getGradeColor(): string {
    const colors: Record<GeneralGrade, string> = {
      N: '#ffffff',
      R: '#00ff00',
      SR: '#0088ff',
      SSR: '#ff8800',
      UR: '#ff0088',
    };
    return colors[this.grade];
  }

  /**
   * JSON 변환
   */
  toJSON(): GeneralConfig & { exp: number } {
    return {
      id: this.id,
      name: this.name,
      grade: this.grade,
      generalClass: this.generalClass,
      faction: this.faction,
      baseStats: this.baseStats,
      level: this._level,
      stars: this._stars,
      exp: this._exp,
      skillIds: this.skillIds,
    };
  }

  /**
   * JSON에서 복원
   */
  static fromJSON(json: GeneralConfig): General {
    return new General(json);
  }
}
