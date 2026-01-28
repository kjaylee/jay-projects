/**
 * 장수 스탯 클래스
 * 5대 스탯: 무력(attack), 방어(defense), 지력(intelligence), 속도(speed), 정치(politics)
 */
export class GeneralStats {
  public readonly attack: number;
  public readonly defense: number;
  public readonly intelligence: number;
  public readonly speed: number;
  public readonly politics: number;

  constructor(
    attack: number,
    defense: number,
    intelligence: number,
    speed: number,
    politics: number
  ) {
    this.attack = Math.max(0, Math.floor(attack));
    this.defense = Math.max(0, Math.floor(defense));
    this.intelligence = Math.max(0, Math.floor(intelligence));
    this.speed = Math.max(0, Math.floor(speed));
    this.politics = Math.max(0, Math.floor(politics));
  }

  /**
   * 전투력 계산 (정치 제외)
   */
  get combatPower(): number {
    return this.attack + this.defense + this.intelligence + this.speed;
  }

  /**
   * 버프/디버프 적용 (새 객체 반환)
   */
  applyBuff(buff: Partial<StatBonus>): GeneralStats {
    return new GeneralStats(
      this.attack + (buff.attack ?? 0),
      this.defense + (buff.defense ?? 0),
      this.intelligence + (buff.intelligence ?? 0),
      this.speed + (buff.speed ?? 0),
      this.politics + (buff.politics ?? 0)
    );
  }

  /**
   * 스탯 합산 (장비 등)
   */
  add(other: Partial<StatBonus>): GeneralStats {
    return this.applyBuff(other);
  }

  /**
   * 스탯 배율 적용
   */
  multiply(multiplier: number): GeneralStats {
    return new GeneralStats(
      this.attack * multiplier,
      this.defense * multiplier,
      this.intelligence * multiplier,
      this.speed * multiplier,
      this.politics * multiplier
    );
  }

  /**
   * 객체로 변환
   */
  toObject(): StatBonus {
    return {
      attack: this.attack,
      defense: this.defense,
      intelligence: this.intelligence,
      speed: this.speed,
      politics: this.politics,
    };
  }

  /**
   * 객체에서 생성
   */
  static fromObject(obj: StatBonus): GeneralStats {
    return new GeneralStats(
      obj.attack ?? 0,
      obj.defense ?? 0,
      obj.intelligence ?? 0,
      obj.speed ?? 0,
      obj.politics ?? 0
    );
  }
}

export interface StatBonus {
  attack?: number;
  defense?: number;
  intelligence?: number;
  speed?: number;
  politics?: number;
  hp?: number;
}
