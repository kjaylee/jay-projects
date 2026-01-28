import { General, AwakenData } from '../entities/General';
import { GeneralStats } from '../entities/GeneralStats';

/**
 * 각성 재료 상태
 */
export interface AwakenResources {
  gold: number;
  awakenStones: number;
}

/**
 * 각성 결과
 */
export interface AwakenResult {
  success: boolean;
  message: string;
  general?: General;
  statsBonus?: GeneralStats;
  newSkillId?: string;
}

/**
 * 각성 가능 여부 체크 결과
 */
export interface AwakenCheck {
  canAwaken: boolean;
  reasons: string[];
  requiredResources?: {
    gold: number;
    awakenStones: number;
  };
  currentResources?: AwakenResources;
}

/**
 * 각성 매니저
 * UR 등급 장수의 각성 시스템 관리
 */
export class AwakenManager {
  private static instance: AwakenManager;

  private constructor() {}

  static getInstance(): AwakenManager {
    if (!AwakenManager.instance) {
      AwakenManager.instance = new AwakenManager();
    }
    return AwakenManager.instance;
  }

  /**
   * 각성 가능 여부 상세 체크
   */
  checkAwaken(general: General, resources: AwakenResources): AwakenCheck {
    const reasons: string[] = [];

    // 등급 체크
    if (general.grade !== 'UR') {
      reasons.push('UR 등급 장수만 각성 가능합니다.');
    }

    // 레벨 체크
    if (general.level < 100) {
      reasons.push(`최대 레벨(100)에 도달해야 합니다. (현재: ${general.level})`);
    }

    // 별 체크
    if (general.stars < 5) {
      reasons.push(`최대 별(5성)에 도달해야 합니다. (현재: ${general.stars}성)`);
    }

    // 이미 각성 체크
    if (general.awakened) {
      reasons.push('이미 각성한 장수입니다.');
    }

    // 각성 데이터 체크
    if (!general.awakenData) {
      reasons.push('각성 데이터가 없는 장수입니다.');
    }

    // 재료 체크
    const cost = general.awakenData?.awakenCost ?? { gold: 100000, awakenStones: 50 };
    if (resources.gold < cost.gold) {
      reasons.push(`골드가 부족합니다. (필요: ${cost.gold.toLocaleString()}, 보유: ${resources.gold.toLocaleString()})`);
    }
    if (resources.awakenStones < cost.awakenStones) {
      reasons.push(`각성석이 부족합니다. (필요: ${cost.awakenStones}, 보유: ${resources.awakenStones})`);
    }

    return {
      canAwaken: reasons.length === 0,
      reasons,
      requiredResources: cost,
      currentResources: resources,
    };
  }

  /**
   * 각성 실행
   */
  executeAwaken(general: General, resources: AwakenResources): AwakenResult {
    const check = this.checkAwaken(general, resources);

    if (!check.canAwaken) {
      return {
        success: false,
        message: check.reasons.join('\n'),
      };
    }

    // 각성 실행
    const success = general.awaken();
    if (!success) {
      return {
        success: false,
        message: '각성에 실패했습니다.',
      };
    }

    // 각성 보너스 스탯 계산
    const statsBonus = general.awakenData?.awakenStats
      ? GeneralStats.fromObject(general.awakenData.awakenStats)
      : undefined;

    return {
      success: true,
      message: `${general.name} 각성 완료!`,
      general,
      statsBonus,
      newSkillId: general.awakenedSkillId ?? undefined,
    };
  }

  /**
   * 각성 보너스 스탯 미리보기
   */
  previewAwakenStats(general: General): GeneralStats | null {
    if (!general.awakenData?.awakenStats) {
      return null;
    }
    return GeneralStats.fromObject(general.awakenData.awakenStats);
  }

  /**
   * 각성 후 예상 전투력 계산
   */
  calculateAwakenedCombatPower(general: General): number {
    if (!general.awakenData?.awakenStats) {
      return general.combatPower;
    }

    const currentStats = general.calculateStats();
    const bonus = general.awakenData.awakenStats;

    return (
      currentStats.attack + (bonus.attack ?? 0) +
      currentStats.defense + (bonus.defense ?? 0) +
      currentStats.intelligence + (bonus.intelligence ?? 0) +
      currentStats.speed + (bonus.speed ?? 0)
    );
  }

  /**
   * 전투력 증가량 계산
   */
  getCombatPowerIncrease(general: General): number {
    if (!general.awakenData?.awakenStats) {
      return 0;
    }

    const bonus = general.awakenData.awakenStats;
    return (
      (bonus.attack ?? 0) +
      (bonus.defense ?? 0) +
      (bonus.intelligence ?? 0) +
      (bonus.speed ?? 0)
    );
  }
}
