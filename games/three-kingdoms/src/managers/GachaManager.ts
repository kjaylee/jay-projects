/**
 * 가챠 시스템 매니저
 * 장수 뽑기 확률, 천장 시스템, 10연차 보장 관리
 */

export type GeneralGrade = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface GachaPool {
  N: string[];
  R: string[];
  SR: string[];
  SSR: string[];
  UR: string[];
}

export interface GachaResult {
  generalId: string;
  grade: GeneralGrade;
  isNew: boolean;
  duplicateShards?: number;
}

/**
 * 가챠 확률 테이블
 * N: 60%, R: 30%, SR: 8%, SSR: 1.8%, UR: 0.2%
 */
export const GACHA_RATES: Record<GeneralGrade, number> = {
  N: 0.60,
  R: 0.30,
  SR: 0.08,
  SSR: 0.018,
  UR: 0.002,
};

/** 천장 보장 횟수 (80회) */
export const PITY_THRESHOLD = 80;

/** 단차 비용 (보석) */
export const SINGLE_COST = 160;

/** 10연차 비용 (보석) */
export const MULTI_COST = 1600;

export class GachaManager {
  private pityCount: number = 0;
  private pool: GachaPool;

  constructor(pool: GachaPool) {
    this.pool = pool;
  }

  /**
   * 단차 (1회 뽑기)
   */
  pull(): GachaResult {
    // 뽑기 전에 카운트 증가 (현재 뽑기가 N번째)
    this.pityCount++;
    
    const grade = this.determineGrade();
    const generalId = this.selectGeneral(grade);

    // SSR 이상 획득 시 천장 리셋
    if (grade === 'SSR' || grade === 'UR') {
      this.pityCount = 0;
    }

    return {
      generalId,
      grade,
      isNew: true, // TODO: 보유 여부 확인 연동
    };
  }

  /**
   * 연차 (N회 뽑기)
   * 10연차 시 SR 이상 1장 보장
   */
  pullMulti(count: number = 10): GachaResult[] {
    const results: GachaResult[] = [];

    for (let i = 0; i < count; i++) {
      results.push(this.pull());
    }

    // 10연차 SR 보장
    if (count === 10) {
      const hasSROrHigher = results.some(
        (r) => r.grade === 'SR' || r.grade === 'SSR' || r.grade === 'UR'
      );

      if (!hasSROrHigher) {
        // 마지막 슬롯을 SR로 교체
        const srId = this.selectGeneral('SR');
        results[9] = {
          generalId: srId,
          grade: 'SR',
          isNew: true,
        };
      }
    }

    return results;
  }

  /**
   * 등급 결정 (확률 + 천장)
   */
  private determineGrade(): GeneralGrade {
    // 천장 체크
    if (this.pityCount >= PITY_THRESHOLD) {
      return 'SSR';
    }

    const random = Math.random();
    let cumulative = 0;

    for (const [grade, rate] of Object.entries(GACHA_RATES)) {
      cumulative += rate;
      if (random < cumulative) {
        return grade as GeneralGrade;
      }
    }

    return 'N';
  }

  /**
   * 등급별 풀에서 장수 선택
   */
  private selectGeneral(grade: GeneralGrade): string {
    const candidates = this.pool[grade];
    
    if (!candidates || candidates.length === 0) {
      console.warn(`Empty pool for grade: ${grade}`);
      return 'unknown';
    }
    
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * 현재 천장 카운트 조회
   */
  getPityCount(): number {
    return this.pityCount;
  }

  /**
   * 천장 카운트 설정 (로드용)
   */
  setPityCount(count: number): void {
    this.pityCount = count;
  }

  /**
   * 다음 보장까지 남은 횟수
   */
  getUntilPity(): number {
    return Math.max(0, PITY_THRESHOLD - this.pityCount);
  }
}
