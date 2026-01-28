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

/** LocalStorage 키 prefix */
const PITY_STORAGE_PREFIX = 'gacha_pity_';

/** 등급별 조각 변환 수치 */
export const SHARD_CONVERSION: Record<GeneralGrade, number> = {
  N: 5,
  R: 10,
  SR: 20,
  SSR: 50,
  UR: 100,
};

export class GachaManager {
  private pityCount: number = 0;
  private pool: GachaPool;
  private userId: string | null = null;
  private ownedGenerals: Set<string> = new Set();

  constructor(pool: GachaPool, userId?: string) {
    this.pool = pool;
    if (userId) {
      this.userId = userId;
      this.loadPityCount();
    }
  }

  /**
   * 유저 ID 설정 및 천장 카운터 로드
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.loadPityCount();
  }

  /**
   * LocalStorage에서 천장 카운터 로드
   */
  private loadPityCount(): void {
    if (!this.userId) return;
    
    try {
      const saved = localStorage.getItem(PITY_STORAGE_PREFIX + this.userId);
      if (saved) {
        const data = JSON.parse(saved);
        this.pityCount = data.pityCount ?? 0;
      }
    } catch (e) {
      console.error('Failed to load pity count:', e);
    }
  }

  /**
   * LocalStorage에 천장 카운터 저장
   */
  private savePityCount(): void {
    if (!this.userId) return;
    
    try {
      localStorage.setItem(PITY_STORAGE_PREFIX + this.userId, JSON.stringify({
        pityCount: this.pityCount,
        lastUpdated: Date.now(),
      }));
    } catch (e) {
      console.error('Failed to save pity count:', e);
    }
  }

  /**
   * 보유 장수 목록 설정 (중복 체크용)
   */
  setOwnedGenerals(owned: Set<string>): void {
    this.ownedGenerals = owned;
  }

  /**
   * 보유 장수 목록 조회
   */
  getOwnedGenerals(): Set<string> {
    return this.ownedGenerals;
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

    // 천장 카운터 저장
    this.savePityCount();

    // 중복 체크
    const isNew = !this.ownedGenerals.has(generalId);
    const result: GachaResult = {
      generalId,
      grade,
      isNew,
    };

    // 중복이면 조각 지급
    if (!isNew) {
      result.duplicateShards = SHARD_CONVERSION[grade];
    }

    return result;
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
        const isNew = !this.ownedGenerals.has(srId);
        results[9] = {
          generalId: srId,
          grade: 'SR',
          isNew,
          duplicateShards: isNew ? undefined : SHARD_CONVERSION.SR,
        };
      }
    }

    return results;
  }

  /**
   * 뽑기 결과의 총 조각 합계 계산
   */
  getTotalDuplicateShards(results: GachaResult[]): number {
    return results.reduce((sum, r) => sum + (r.duplicateShards ?? 0), 0);
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
   * 천장 카운트 설정 (로드용/테스트용)
   */
  setPityCount(count: number): void {
    this.pityCount = count;
    this.savePityCount();
  }

  /**
   * 다음 보장까지 남은 횟수
   */
  getUntilPity(): number {
    return Math.max(0, PITY_THRESHOLD - this.pityCount);
  }
}
