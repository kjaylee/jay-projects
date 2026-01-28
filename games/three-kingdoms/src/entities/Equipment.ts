import { StatBonus } from './GeneralStats';

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'horse';
export type EquipmentGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface EquipmentConfig {
  id: string;
  name: string;
  slot: EquipmentSlot;
  grade: EquipmentGrade;
  stats: EquipmentStats;
  enhanceLevel?: number;
  description?: string;
}

export interface EquipmentStats {
  attack?: number;
  defense?: number;
  intelligence?: number;
  speed?: number;
  politics?: number;
  hp?: number;
}

const GRADE_COLORS: Record<EquipmentGrade, string> = {
  common: '#ffffff',
  uncommon: '#00ff00',
  rare: '#0088ff',
  epic: '#9933ff',
  legendary: '#ff8800',
};

const GRADE_MULTIPLIERS: Record<EquipmentGrade, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2,
  epic: 3,
  legendary: 5,
};

const MAX_ENHANCE_LEVEL = 15;
const ENHANCE_BONUS_PER_LEVEL = 0.05;
const BASE_ENHANCE_COST = 1000;

/**
 * 장비 클래스
 */
export class Equipment {
  public readonly id: string;
  public readonly name: string;
  public readonly slot: EquipmentSlot;
  public readonly grade: EquipmentGrade;
  public readonly stats: EquipmentStats;
  public readonly description: string;

  private _enhanceLevel: number;

  constructor(config: EquipmentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.slot = config.slot;
    this.grade = config.grade;
    this.stats = { ...config.stats };
    this.description = config.description ?? '';
    this._enhanceLevel = Math.min(config.enhanceLevel ?? 0, MAX_ENHANCE_LEVEL);
  }

  get enhanceLevel(): number {
    return this._enhanceLevel;
  }

  /**
   * 등급 색상 반환
   */
  getColor(): string {
    return GRADE_COLORS[this.grade];
  }

  /**
   * 스탯 보너스 계산 (강화 포함)
   */
  getStatBonus(): StatBonus {
    const enhanceMultiplier = 1 + this._enhanceLevel * ENHANCE_BONUS_PER_LEVEL;

    return {
      attack: Math.floor((this.stats.attack ?? 0) * enhanceMultiplier),
      defense: Math.floor((this.stats.defense ?? 0) * enhanceMultiplier),
      intelligence: Math.floor((this.stats.intelligence ?? 0) * enhanceMultiplier),
      speed: Math.floor((this.stats.speed ?? 0) * enhanceMultiplier),
      politics: Math.floor((this.stats.politics ?? 0) * enhanceMultiplier),
      hp: Math.floor((this.stats.hp ?? 0) * enhanceMultiplier),
    };
  }

  /**
   * 강화
   */
  enhance(): boolean {
    if (this._enhanceLevel >= MAX_ENHANCE_LEVEL) {
      return false;
    }
    this._enhanceLevel++;
    return true;
  }

  /**
   * 강화 비용 계산
   */
  getEnhanceCost(): number {
    const gradeMultiplier = GRADE_MULTIPLIERS[this.grade];
    return BASE_ENHANCE_COST * (this._enhanceLevel + 1) * gradeMultiplier;
  }

  /**
   * 해당 슬롯에 장착 가능 여부
   */
  canEquipTo(slot: EquipmentSlot): boolean {
    return this.slot === slot;
  }

  /**
   * 최대 강화 여부
   */
  isMaxEnhanced(): boolean {
    return this._enhanceLevel >= MAX_ENHANCE_LEVEL;
  }

  /**
   * JSON 변환
   */
  toJSON(): EquipmentConfig {
    return {
      id: this.id,
      name: this.name,
      slot: this.slot,
      grade: this.grade,
      stats: this.stats,
      enhanceLevel: this._enhanceLevel,
      description: this.description,
    };
  }

  /**
   * JSON에서 복원
   */
  static fromJSON(json: EquipmentConfig): Equipment {
    return new Equipment(json);
  }
}
