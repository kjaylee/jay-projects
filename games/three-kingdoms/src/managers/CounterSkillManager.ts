import { BattleUnit } from '../entities/BattleUnit';

/**
 * 계략 간파 타입
 */
export type CounterSkillType = 
  | 'fire_counter'      // 화심계 - 화계 무효화
  | 'water_counter'     // 수심계 - 수계 무효화
  | 'trap_counter'      // 공심계 - 낙석/함정 무효화
  | 'confusion_counter'; // 심묘계 - 혼란 무효화

/**
 * 대상 스킬 카테고리
 */
export type TargetSkillCategory = 'fire' | 'water' | 'trap' | 'confusion';

/**
 * 계략 간파 설정
 */
export interface CounterSkillConfig {
  id: string;
  type: CounterSkillType;
  name: string;
  nameEn: string;
  description: string;
  /** 무효화 대상 카테고리 */
  targetCategory: TargetSkillCategory;
  /** 무효화 확률 (0~1) */
  counterChance: number;
}

/**
 * 계략 간파 결과
 */
export interface CounterSkillResult {
  countered: boolean;
  counterType: CounterSkillType;
  counterName: string;
  targetSkillId?: string;
  targetSkillName?: string;
  message?: string;
}

/**
 * 스킬 카테고리 매핑
 */
export const SKILL_CATEGORY_MAP: Record<string, TargetSkillCategory> = {
  // 화계류
  'fire_attack': 'fire',
  'skill_fire_attack': 'fire',
  'skill_yiling_fire': 'fire',
  'skill_red_cliff': 'fire',
  'skill_fire_god': 'fire',
  'skill_inferno': 'fire',
  'skill_wind_and_fire': 'fire',
  'skill_infernal_blaze': 'fire',
  'skill_wu_chao_fire': 'fire',
  
  // 수계류
  'water_attack': 'water',
  'skill_water_attack': 'water',
  'skill_water_defense': 'water',
  'skill_naval_command': 'water',
  
  // 낙석/함정류
  'rockfall': 'trap',
  'skill_rockfall': 'trap',
  'skill_ambush': 'trap',
  'ambush': 'trap',
  'skill_chain_strategy': 'trap',
  
  // 혼란류
  'confusion': 'confusion',
  'skill_confusion': 'confusion',
  'skill_poison_plot': 'confusion',
  'skill_chain_beauty': 'confusion',
};

/**
 * 계략 간파 정의
 */
export const COUNTER_SKILLS: Record<CounterSkillType, CounterSkillConfig> = {
  fire_counter: {
    id: 'counter_fire',
    type: 'fire_counter',
    name: '화심계',
    nameEn: 'Fire Heart Strategy',
    description: '화계 45% 무효화',
    targetCategory: 'fire',
    counterChance: 0.45,
  },
  water_counter: {
    id: 'counter_water',
    type: 'water_counter',
    name: '수심계',
    nameEn: 'Water Heart Strategy',
    description: '수계 45% 무효화',
    targetCategory: 'water',
    counterChance: 0.45,
  },
  trap_counter: {
    id: 'counter_trap',
    type: 'trap_counter',
    name: '공심계',
    nameEn: 'Trap Heart Strategy',
    description: '낙석/함정 45% 무효화',
    targetCategory: 'trap',
    counterChance: 0.45,
  },
  confusion_counter: {
    id: 'counter_confusion',
    type: 'confusion_counter',
    name: '심묘계',
    nameEn: 'Mind Strategy',
    description: '혼란 45% 무효화',
    targetCategory: 'confusion',
    counterChance: 0.45,
  },
};

/**
 * 계략 간파 매니저
 * 특정 스킬을 무효화하는 카운터 시스템 관리
 */
export class CounterSkillManager {
  /** 유닛별 보유 계략 간파 */
  private unitCounters: Map<string, CounterSkillType[]> = new Map();
  
  /** 간파 발동 기록 (통계용) */
  private counterHistory: Array<{
    timestamp: number;
    counterType: CounterSkillType;
    defenderUnit: string;
    targetSkill: string;
    success: boolean;
  }> = [];

  /** 랜덤 함수 (테스트용 오버라이드 가능) */
  private randomFn: () => number = Math.random;

  constructor() {
    this.reset();
  }

  /**
   * 랜덤 함수 설정 (테스트용)
   */
  setRandomFn(fn: () => number): void {
    this.randomFn = fn;
  }

  /**
   * 상태 초기화
   */
  reset(): void {
    this.unitCounters.clear();
    this.counterHistory = [];
  }

  /**
   * 유닛에 계략 간파 등록
   */
  registerCounter(unitId: string, counterType: CounterSkillType): void {
    if (!this.unitCounters.has(unitId)) {
      this.unitCounters.set(unitId, []);
    }
    const counters = this.unitCounters.get(unitId)!;
    if (!counters.includes(counterType)) {
      counters.push(counterType);
    }
  }

  /**
   * 유닛의 계략 간파 조회
   */
  getCounters(unitId: string): CounterSkillType[] {
    return this.unitCounters.get(unitId) ?? [];
  }

  /**
   * 유닛이 특정 계략 간파를 보유하는지 확인
   */
  hasCounter(unitId: string, counterType: CounterSkillType): boolean {
    return this.getCounters(unitId).includes(counterType);
  }

  /**
   * 스킬의 카테고리 조회
   */
  getSkillCategory(skillId: string): TargetSkillCategory | null {
    return SKILL_CATEGORY_MAP[skillId] ?? null;
  }

  /**
   * 카테고리에 해당하는 계략 간파 타입 조회
   */
  getCounterTypeForCategory(category: TargetSkillCategory): CounterSkillType {
    const mapping: Record<TargetSkillCategory, CounterSkillType> = {
      fire: 'fire_counter',
      water: 'water_counter',
      trap: 'trap_counter',
      confusion: 'confusion_counter',
    };
    return mapping[category];
  }

  /**
   * 스킬 무효화 시도
   * @param defender 방어자 유닛
   * @param skillId 적 스킬 ID
   * @param skillName 적 스킬 이름 (표시용)
   * @returns 무효화 결과
   */
  tryCounter(
    defender: BattleUnit,
    skillId: string,
    skillName?: string
  ): CounterSkillResult {
    // 스킬 카테고리 확인
    const category = this.getSkillCategory(skillId);
    
    if (!category) {
      // 카운터 불가능한 스킬
      return {
        countered: false,
        counterType: 'fire_counter', // 기본값
        counterName: '',
      };
    }

    // 해당 카테고리에 대한 카운터 타입
    const counterType = this.getCounterTypeForCategory(category);
    const config = COUNTER_SKILLS[counterType];

    // 방어자가 해당 카운터를 보유하는지 확인
    if (!this.hasCounter(defender.id, counterType)) {
      return {
        countered: false,
        counterType,
        counterName: config.name,
        targetSkillId: skillId,
        targetSkillName: skillName,
      };
    }

    // 무효화 확률 체크 (45%)
    const success = this.randomFn() < config.counterChance;

    // 기록 저장
    this.counterHistory.push({
      timestamp: Date.now(),
      counterType,
      defenderUnit: defender.id,
      targetSkill: skillId,
      success,
    });

    const result: CounterSkillResult = {
      countered: success,
      counterType,
      counterName: config.name,
      targetSkillId: skillId,
      targetSkillName: skillName,
    };

    if (success) {
      result.message = `${defender.name}의 ${config.name} 발동! ${skillName ?? skillId} 무효화!`;
    } else {
      result.message = `${defender.name}의 ${config.name} 발동 실패`;
    }

    return result;
  }

  /**
   * 여러 방어자 중 스킬을 무효화할 수 있는지 확인
   * @param defenders 방어자 유닛 배열
   * @param skillId 적 스킬 ID
   * @param skillName 적 스킬 이름
   * @returns 첫 번째 성공한 무효화 결과 또는 실패
   */
  tryCounterForAny(
    defenders: BattleUnit[],
    skillId: string,
    skillName?: string
  ): CounterSkillResult & { defender?: BattleUnit } {
    for (const defender of defenders) {
      const result = this.tryCounter(defender, skillId, skillName);
      if (result.countered) {
        return { ...result, defender };
      }
    }

    // 모두 실패
    const category = this.getSkillCategory(skillId);
    const counterType = category ? this.getCounterTypeForCategory(category) : 'fire_counter';
    
    return {
      countered: false,
      counterType,
      counterName: COUNTER_SKILLS[counterType]?.name ?? '',
      targetSkillId: skillId,
      targetSkillName: skillName,
    };
  }

  /**
   * 스킬이 무효화 가능한 카테고리인지 확인
   */
  isCounterable(skillId: string): boolean {
    return this.getSkillCategory(skillId) !== null;
  }

  /**
   * 간파 발동 통계
   */
  getCounterStats(): {
    total: number;
    success: number;
    byType: Record<CounterSkillType, { attempts: number; successes: number }>;
  } {
    const stats = {
      total: this.counterHistory.length,
      success: this.counterHistory.filter(h => h.success).length,
      byType: {} as Record<CounterSkillType, { attempts: number; successes: number }>,
    };

    // 타입별 초기화
    for (const type of Object.keys(COUNTER_SKILLS) as CounterSkillType[]) {
      stats.byType[type] = { attempts: 0, successes: 0 };
    }

    // 집계
    for (const record of this.counterHistory) {
      stats.byType[record.counterType].attempts++;
      if (record.success) {
        stats.byType[record.counterType].successes++;
      }
    }

    return stats;
  }

  /**
   * 간파 기록 초기화
   */
  clearHistory(): void {
    this.counterHistory = [];
  }

  /**
   * 카테고리에 스킬 ID 등록 (확장용)
   */
  static registerSkillCategory(skillId: string, category: TargetSkillCategory): void {
    SKILL_CATEGORY_MAP[skillId] = category;
  }

  /**
   * 특정 계략 간파 설정 조회
   */
  static getCounterConfig(type: CounterSkillType): CounterSkillConfig {
    return COUNTER_SKILLS[type];
  }

  /**
   * 모든 계략 간파 목록
   */
  static getAllCounters(): CounterSkillConfig[] {
    return Object.values(COUNTER_SKILLS);
  }

  /**
   * 카테고리별 스킬 목록 조회
   */
  static getSkillsByCategory(category: TargetSkillCategory): string[] {
    return Object.entries(SKILL_CATEGORY_MAP)
      .filter(([_, cat]) => cat === category)
      .map(([skillId]) => skillId);
  }
}
