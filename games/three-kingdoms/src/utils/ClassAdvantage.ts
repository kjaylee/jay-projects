/**
 * ClassAdvantage - 병과 상성 시스템
 * 
 * 영걸전/코에이 삼국지 스타일의 병과 상성 시스템
 * 
 * 상성 관계:
 * - 맹장(warrior) → 궁장(archer) → 기장(cavalry) → 맹장
 * - 책사(strategist): 상성 없음, 계략 특화
 * - 방장(support): 상성 없음, 방어 특화
 */

import { GeneralClass } from '../entities/General';

export type AdvantageType = 'advantage' | 'disadvantage' | 'neutral';

export interface AdvantageResult {
  type: AdvantageType;
  attackerClass: GeneralClass;
  defenderClass: GeneralClass;
  damageMultiplier: number;       // 공격 시 데미지 배율
  receivedDamageMultiplier: number; // 받는 데미지 배율
  description: string;
}

/**
 * 상성 관계 맵
 * key가 value에 유리함
 */
const ADVANTAGE_MAP: Record<GeneralClass, GeneralClass | null> = {
  warrior: 'archer',     // 맹장 → 궁장
  archer: 'cavalry',     // 궁장 → 기장
  cavalry: 'warrior',    // 기장 → 맹장
  strategist: null,      // 책사: 상성 없음
  support: null,         // 방장: 상성 없음
};

/**
 * 병과 한글 이름
 */
export const CLASS_NAMES: Record<GeneralClass, string> = {
  warrior: '맹장',
  archer: '궁장',
  cavalry: '기장',
  strategist: '책사',
  support: '방장',
};

/**
 * 상성 데미지 보정 상수
 */
export const ADVANTAGE_CONFIG = {
  damageBonus: 0.20,           // 상성 유리: +20% 데미지
  damageReduction: 0.20,       // 상성 불리: -20% 데미지
  receivedDamageReduction: 0.15, // 상성 유리: 받는 피해 -15%
  receivedDamageIncrease: 0.15,  // 상성 불리: 받는 피해 +15%
};

export class ClassAdvantage {
  /**
   * 두 병과 간의 상성 관계 확인
   * @param attackerClass 공격자 병과
   * @param defenderClass 방어자 병과
   * @returns AdvantageResult
   */
  static checkAdvantage(attackerClass: GeneralClass, defenderClass: GeneralClass): AdvantageResult {
    // 공격자가 방어자에게 유리한지 확인
    const attackerAdvantageTarget = ADVANTAGE_MAP[attackerClass];
    
    if (attackerAdvantageTarget === defenderClass) {
      return {
        type: 'advantage',
        attackerClass,
        defenderClass,
        damageMultiplier: 1 + ADVANTAGE_CONFIG.damageBonus,
        receivedDamageMultiplier: 1 - ADVANTAGE_CONFIG.receivedDamageReduction,
        description: `${CLASS_NAMES[attackerClass]}이(가) ${CLASS_NAMES[defenderClass]}에게 상성 유리`,
      };
    }

    // 방어자가 공격자에게 유리한지 확인 (공격자 불리)
    const defenderAdvantageTarget = ADVANTAGE_MAP[defenderClass];
    
    if (defenderAdvantageTarget === attackerClass) {
      return {
        type: 'disadvantage',
        attackerClass,
        defenderClass,
        damageMultiplier: 1 - ADVANTAGE_CONFIG.damageReduction,
        receivedDamageMultiplier: 1 + ADVANTAGE_CONFIG.receivedDamageIncrease,
        description: `${CLASS_NAMES[attackerClass]}이(가) ${CLASS_NAMES[defenderClass]}에게 상성 불리`,
      };
    }

    // 상성 관계 없음
    return {
      type: 'neutral',
      attackerClass,
      defenderClass,
      damageMultiplier: 1.0,
      receivedDamageMultiplier: 1.0,
      description: '상성 관계 없음',
    };
  }

  /**
   * 상성 데미지 계산
   * @param baseDamage 기본 데미지
   * @param attackerClass 공격자 병과
   * @param defenderClass 방어자 병과
   * @returns 상성 적용된 데미지
   */
  static calculateDamageWithAdvantage(
    baseDamage: number,
    attackerClass: GeneralClass,
    defenderClass: GeneralClass
  ): number {
    const advantage = this.checkAdvantage(attackerClass, defenderClass);
    return Math.floor(baseDamage * advantage.damageMultiplier);
  }

  /**
   * 받는 데미지 계산 (방어자 관점)
   * @param baseDamage 기본 데미지
   * @param attackerClass 공격자 병과
   * @param defenderClass 방어자 병과
   * @returns 상성 적용된 받는 데미지
   */
  static calculateReceivedDamageWithAdvantage(
    baseDamage: number,
    attackerClass: GeneralClass,
    defenderClass: GeneralClass
  ): number {
    const advantage = this.checkAdvantage(attackerClass, defenderClass);
    return Math.floor(baseDamage * advantage.receivedDamageMultiplier);
  }

  /**
   * 특정 병과가 유리한 상대 반환
   */
  static getAdvantageTarget(generalClass: GeneralClass): GeneralClass | null {
    return ADVANTAGE_MAP[generalClass];
  }

  /**
   * 특정 병과가 불리한 상대 반환
   */
  static getDisadvantageTarget(generalClass: GeneralClass): GeneralClass | null {
    // 누가 나에게 유리한지 찾기
    for (const [attackClass, targetClass] of Object.entries(ADVANTAGE_MAP)) {
      if (targetClass === generalClass) {
        return attackClass as GeneralClass;
      }
    }
    return null;
  }

  /**
   * 상성 삼각관계 표시
   * warrior → archer → cavalry → warrior
   */
  static getAdvantageTriangle(): string {
    return '맹장(warrior) → 궁장(archer) → 기장(cavalry) → 맹장(warrior)';
  }

  /**
   * 병과별 특성 설명
   */
  static getClassDescription(generalClass: GeneralClass): string {
    const descriptions: Record<GeneralClass, string> = {
      warrior: '맹장: 근접 전투 특화, 궁장에게 유리, 기장에게 불리',
      archer: '궁장: 원거리 공격 특화, 기장에게 유리, 맹장에게 불리',
      cavalry: '기장: 기동력 특화, 맹장에게 유리, 궁장에게 불리',
      strategist: '책사: 계략 특화, 상성 관계 없음',
      support: '방장: 방어/지원 특화, 상성 관계 없음',
    };
    return descriptions[generalClass];
  }

  /**
   * 모든 병과 목록 반환
   */
  static getAllClasses(): GeneralClass[] {
    return ['warrior', 'archer', 'cavalry', 'strategist', 'support'];
  }

  /**
   * 상성이 있는 병과만 반환
   */
  static getCombatClasses(): GeneralClass[] {
    return ['warrior', 'archer', 'cavalry'];
  }
}

/**
 * DamageCalculator와 연동을 위한 헬퍼 함수
 */
export function applyClassAdvantage(
  baseDamage: number,
  attackerClass: GeneralClass,
  defenderClass: GeneralClass
): { damage: number; advantage: AdvantageResult } {
  const advantage = ClassAdvantage.checkAdvantage(attackerClass, defenderClass);
  const damage = Math.floor(baseDamage * advantage.damageMultiplier);
  return { damage, advantage };
}
