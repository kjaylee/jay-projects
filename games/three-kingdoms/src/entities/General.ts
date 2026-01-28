import { GeneralStats, StatBonus } from './GeneralStats';
import { Equipment, EquipmentSlot } from './Equipment';
import { Skill } from './Skill';

export type GeneralGrade = 'N' | 'R' | 'SR' | 'SSR' | 'UR';
export type GeneralClass = 'warrior' | 'strategist' | 'archer' | 'cavalry' | 'support';
export type Faction = 'wei' | 'shu' | 'wu' | 'neutral' | 'other';

export type SkillLoader = (skillId: string) => Skill | null;

/** 각성 데이터 */
export interface AwakenData {
  awakenStats: StatBonus;
  awakenSkillId: string;
  awakenCost: {
    gold: number;
    awakenStones: number;
  };
}

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
  awakened?: boolean;
  awakenData?: AwakenData;
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
  public readonly awakenData?: AwakenData;

  private _level: number;
  private _stars: number;
  private _exp: number;
  private _awakened: boolean;

  // 장비 슬롯
  private _equipment: Map<EquipmentSlot, Equipment> = new Map();
  
  // 로드된 스킬
  private _skills: Skill[] = [];

  constructor(config: GeneralConfig) {
    this.id = config.id;
    this.name = config.name;
    this.grade = config.grade;
    this.generalClass = config.generalClass;
    this.faction = config.faction;
    this.baseStats = { ...config.baseStats };
    this.skillIds = config.skillIds ?? [];
    this.awakenData = config.awakenData;

    this._level = Math.min(config.level ?? 1, MAX_LEVEL);
    this._stars = Math.min(config.stars ?? 1, MAX_STARS);
    this._exp = config.exp ?? 0;
    this._awakened = config.awakened ?? false;
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

  get awakened(): boolean {
    return this._awakened;
  }

  /**
   * 현재 스탯 계산
   * 공식: base * (1 + level * 0.1) * (1 + (stars - 1) * 0.1)
   * 각성 시: 추가 스탯 보너스 적용
   * 장비 보너스: 최종 스탯에 합산
   */
  calculateStats(): GeneralStats {
    const levelMultiplier = 1 + this._level * LEVEL_MULTIPLIER;
    const starMultiplier = 1 + (this._stars - 1) * STAR_MULTIPLIER;
    const totalMultiplier = levelMultiplier * starMultiplier;

    let attack = (this.baseStats.attack ?? 0) * totalMultiplier;
    let defense = (this.baseStats.defense ?? 0) * totalMultiplier;
    let intelligence = (this.baseStats.intelligence ?? 0) * totalMultiplier;
    let speed = (this.baseStats.speed ?? 0) * totalMultiplier;
    let politics = (this.baseStats.politics ?? 0) * totalMultiplier;

    // 각성 보너스 적용
    if (this._awakened && this.awakenData?.awakenStats) {
      attack += this.awakenData.awakenStats.attack ?? 0;
      defense += this.awakenData.awakenStats.defense ?? 0;
      intelligence += this.awakenData.awakenStats.intelligence ?? 0;
      speed += this.awakenData.awakenStats.speed ?? 0;
      politics += this.awakenData.awakenStats.politics ?? 0;
    }

    // 장비 보너스 적용
    for (const equipment of this._equipment.values()) {
      const bonus = equipment.getStatBonus();
      attack += bonus.attack ?? 0;
      defense += bonus.defense ?? 0;
      intelligence += bonus.intelligence ?? 0;
      speed += bonus.speed ?? 0;
      politics += bonus.politics ?? 0;
    }

    return new GeneralStats(attack, defense, intelligence, speed, politics);
  }

  // ============ 장비 시스템 ============

  /**
   * 장비 장착
   * @returns 기존 장비 (교체 시) 또는 true (빈 슬롯)
   */
  equipItem(equipment: Equipment): Equipment | boolean {
    const slot = equipment.slot;
    const previousEquipment = this._equipment.get(slot);
    
    this._equipment.set(slot, equipment);
    
    return previousEquipment ?? true;
  }

  /**
   * 장비 해제
   * @returns 해제된 장비 또는 null
   */
  unequipItem(slot: EquipmentSlot): Equipment | null {
    const equipment = this._equipment.get(slot);
    if (!equipment) return null;
    
    this._equipment.delete(slot);
    return equipment;
  }

  /**
   * 특정 슬롯의 장착된 장비 조회
   */
  getEquippedItem(slot: EquipmentSlot): Equipment | null {
    return this._equipment.get(slot) ?? null;
  }

  /**
   * 모든 장착 장비 조회
   */
  getAllEquipment(): Equipment[] {
    return Array.from(this._equipment.values());
  }

  // ============ 스킬 시스템 ============

  /**
   * 로드된 스킬 배열
   */
  get skills(): Skill[] {
    return this._skills;
  }

  /**
   * 스킬 로드 (skillIds → Skill 객체)
   * @param loader 스킬 ID로 Skill 객체를 반환하는 함수
   */
  loadSkills(loader: SkillLoader): void {
    this._skills = [];
    
    const allSkillIds = this.getAllSkillIds();
    for (const skillId of allSkillIds) {
      const skill = loader(skillId);
      if (skill) {
        this._skills.push(skill);
      }
    }
  }

  /**
   * ID로 로드된 스킬 조회
   */
  getSkill(skillId: string): Skill | null {
    return this._skills.find(s => s.id === skillId) ?? null;
  }

  /**
   * 액티브 스킬만 반환
   */
  getActiveSkills(): Skill[] {
    return this._skills.filter(s => s.type === 'active');
  }

  /**
   * 패시브 스킬만 반환
   */
  getPassiveSkills(): Skill[] {
    return this._skills.filter(s => s.type === 'passive');
  }

  /**
   * 각성 가능 여부 체크
   * 조건: UR 등급 + 최대 레벨 + 최대 별
   */
  canAwaken(): boolean {
    return (
      this.grade === 'UR' &&
      this._level >= MAX_LEVEL &&
      this._stars >= MAX_STARS &&
      !this._awakened &&
      !!this.awakenData
    );
  }

  /**
   * 각성 실행 (내부 상태 변경)
   * @returns 성공 여부
   */
  awaken(): boolean {
    if (!this.canAwaken()) {
      return false;
    }
    this._awakened = true;
    return true;
  }

  /**
   * 각성 스킬 ID 반환
   */
  get awakenedSkillId(): string | null {
    if (!this._awakened || !this.awakenData) {
      return null;
    }
    return this.awakenData.awakenSkillId;
  }

  /**
   * 모든 스킬 ID 반환 (기본 + 각성)
   */
  getAllSkillIds(): string[] {
    const skills = [...this.skillIds];
    if (this._awakened && this.awakenData?.awakenSkillId) {
      skills.push(this.awakenData.awakenSkillId);
    }
    return skills;
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
      awakened: this._awakened,
      awakenData: this.awakenData,
    };
  }

  /**
   * JSON에서 복원
   */
  static fromJSON(json: GeneralConfig): General {
    return new General(json);
  }
}
