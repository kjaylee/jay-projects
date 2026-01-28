export type SkillType = 'active' | 'passive';
export type SkillTarget =
  | 'self'
  | 'ally_single'
  | 'ally_all'
  | 'ally_row'
  | 'enemy_single'
  | 'enemy_all'
  | 'enemy_row'
  | 'enemy_column';

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  attribute?: 'attack' | 'defense' | 'intelligence' | 'speed';
  duration?: number;
}

export interface SkillConfig {
  id: string;
  name: string;
  type: SkillType;
  target: SkillTarget;
  effects: SkillEffect[];
  cooldown?: number;
  mpCost?: number;
  description?: string;
}

/**
 * 스킬/계략 클래스
 */
export class Skill {
  public readonly id: string;
  public readonly name: string;
  public readonly type: SkillType;
  public readonly target: SkillTarget;
  public readonly effects: SkillEffect[];
  public readonly cooldown: number;
  public readonly mpCost: number;
  public readonly description: string;

  private _currentCooldown: number = 0;

  constructor(config: SkillConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.target = config.target;
    this.effects = [...config.effects];
    this.cooldown = config.type === 'passive' ? 0 : (config.cooldown ?? 0);
    this.mpCost = config.type === 'passive' ? 0 : (config.mpCost ?? 0);
    this.description = config.description ?? '';
  }

  get currentCooldown(): number {
    return this._currentCooldown;
  }

  /**
   * 단일 대상 스킬 여부
   */
  isSingleTarget(): boolean {
    return this.target === 'enemy_single' || this.target === 'ally_single' || this.target === 'self';
  }

  /**
   * 범위 스킬 여부
   */
  isAoE(): boolean {
    return !this.isSingleTarget();
  }

  /**
   * 데미지 효과 포함 여부
   */
  hasDamage(): boolean {
    return this.effects.some((e) => e.type === 'damage');
  }

  /**
   * 회복 효과 포함 여부
   */
  hasHeal(): boolean {
    return this.effects.some((e) => e.type === 'heal');
  }

  /**
   * 버프 효과 포함 여부
   */
  hasBuff(): boolean {
    return this.effects.some((e) => e.type === 'buff');
  }

  /**
   * 디버프 효과 포함 여부
   */
  hasDebuff(): boolean {
    return this.effects.some((e) => e.type === 'debuff');
  }

  /**
   * 스킬 사용 (쿨다운 설정)
   */
  use(): void {
    this._currentCooldown = this.cooldown;
  }

  /**
   * 쿨다운 감소
   */
  reduceCooldown(amount: number = 1): void {
    this._currentCooldown = Math.max(0, this._currentCooldown - amount);
  }

  /**
   * 사용 가능 여부
   */
  isReady(): boolean {
    return this._currentCooldown === 0;
  }

  /**
   * 쿨다운 리셋
   */
  resetCooldown(): void {
    this._currentCooldown = 0;
  }

  /**
   * 데미지 계산
   * @param statValue 해당 스탯 값 (공격력 또는 지력)
   * @returns 계산된 데미지
   */
  calculateDamage(statValue: number): number {
    const damageEffect = this.effects.find((e) => e.type === 'damage');
    if (!damageEffect) return 0;

    // value는 퍼센트 (150 = 1.5배)
    const multiplier = damageEffect.value / 100;
    return Math.floor(statValue * multiplier);
  }

  /**
   * 회복량 계산
   */
  calculateHeal(statValue: number): number {
    const healEffect = this.effects.find((e) => e.type === 'heal');
    if (!healEffect) return 0;

    return Math.floor(statValue * (healEffect.value / 100));
  }

  /**
   * 적 대상 여부
   */
  isEnemyTarget(): boolean {
    return this.target.startsWith('enemy');
  }

  /**
   * 아군 대상 여부
   */
  isAllyTarget(): boolean {
    return this.target.startsWith('ally') || this.target === 'self';
  }

  /**
   * JSON 변환
   */
  toJSON(): SkillConfig {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      target: this.target,
      effects: this.effects,
      cooldown: this.cooldown,
      mpCost: this.mpCost,
      description: this.description,
    };
  }

  /**
   * JSON에서 복원
   */
  static fromJSON(json: SkillConfig): Skill {
    return new Skill(json);
  }
}
