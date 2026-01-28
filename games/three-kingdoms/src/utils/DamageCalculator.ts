/**
 * DamageCalculator - 전투 데미지 계산 모듈
 * 
 * 물리/계략 데미지 계산, 치명타 판정, 최종 데미지 계산을 담당합니다.
 */

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  damageType: 'physical' | 'magical';
}

export class DamageCalculator {
  /**
   * 물리 데미지 계산
   * 공식: ATK * (1 - DEF/(DEF+100))
   * - DEF 0: 100% 데미지
   * - DEF 100: 50% 데미지
   * - DEF 200: 33% 데미지
   */
  static calculatePhysicalDamage(attack: number, defense: number): number {
    const damageReduction = defense / (defense + 100);
    return Math.floor(attack * (1 - damageReduction));
  }

  /**
   * 계략(마법) 데미지 계산
   * 공식: INT * multiplier * (1 - RES/(RES+80))
   * - RES 0: 100% 데미지
   * - RES 80: 50% 데미지
   */
  static calculateMagicalDamage(intelligence: number, resistance: number, multiplier: number): number {
    const resistReduction = resistance / (resistance + 80);
    return Math.floor(intelligence * multiplier * (1 - resistReduction));
  }

  /**
   * 치명타 판정
   * 공식: 기본 10% + 속도/100
   * - 속도 0: 10% 크리티컬 확률
   * - 속도 50: 60% 크리티컬 확률
   * - 속도 90: 100% 크리티컬 확률
   */
  static rollCritical(speed: number): boolean {
    const critChance = 0.1 + speed / 100;
    return Math.random() < critChance;
  }

  /**
   * 최종 데미지 계산
   * 치명타 시 1.5배 데미지
   */
  static calculateFinalDamage(baseDamage: number, isCritical: boolean): number {
    return isCritical ? Math.floor(baseDamage * 1.5) : baseDamage;
  }

  /**
   * 물리 공격의 전체 데미지 결과 계산
   */
  static calculatePhysicalAttack(attack: number, defense: number, speed: number): DamageResult {
    const baseDamage = this.calculatePhysicalDamage(attack, defense);
    const isCritical = this.rollCritical(speed);
    const damage = this.calculateFinalDamage(baseDamage, isCritical);
    
    return {
      damage,
      isCritical,
      damageType: 'physical',
    };
  }

  /**
   * 계략 공격의 전체 데미지 결과 계산
   */
  static calculateMagicalAttack(
    intelligence: number,
    resistance: number,
    multiplier: number,
    speed: number
  ): DamageResult {
    const baseDamage = this.calculateMagicalDamage(intelligence, resistance, multiplier);
    const isCritical = this.rollCritical(speed);
    const damage = this.calculateFinalDamage(baseDamage, isCritical);
    
    return {
      damage,
      isCritical,
      damageType: 'magical',
    };
  }
}

// 기존 테스트 호환성을 위한 함수 export
export function calculateDamage(attack: number, defense: number): number {
  return DamageCalculator.calculatePhysicalDamage(attack, defense);
}

export function calculateSkillDamage(intelligence: number, multiplier: number, resistance: number): number {
  return DamageCalculator.calculateMagicalDamage(intelligence, resistance, multiplier);
}
