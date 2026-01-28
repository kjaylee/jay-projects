/**
 * 보유 장수 관리 시스템
 * - 장수 보유 여부 확인
 * - 중복 장수 → 조각 변환
 */

export type GeneralGrade = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface OwnedGeneral {
  generalId: string;
  grade: GeneralGrade;
  acquiredAt: number;
  shards: number; // 승급 조각
}

export interface ShardConversionResult {
  generalId: string;
  grade: GeneralGrade;
  isDuplicate: boolean;
  shardsGained: number;
  totalShards: number;
}

const STORAGE_KEY_PREFIX = 'owned_generals_';

/**
 * 등급별 중복 시 획득 조각 수
 */
const DUPLICATE_SHARDS: Record<GeneralGrade, number> = {
  N: 1,
  R: 5,
  SR: 20,
  SSR: 50,
  UR: 100,
};

export class OwnedGeneralsManager {
  private userId: string;
  private storageKey: string;
  private ownedGenerals: Map<string, OwnedGeneral>;

  constructor(userId: string) {
    this.userId = userId;
    this.storageKey = STORAGE_KEY_PREFIX + userId;
    this.ownedGenerals = new Map();
    this.load();
  }

  private load(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved) as OwnedGeneral[];
        data.forEach(g => this.ownedGenerals.set(g.generalId, g));
      }
    } catch (e) {
      console.error('Failed to load owned generals:', e);
    }
  }

  private save(): void {
    try {
      const data = Array.from(this.ownedGenerals.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save owned generals:', e);
    }
  }

  /**
   * 장수 보유 여부 확인
   */
  hasGeneral(generalId: string): boolean {
    return this.ownedGenerals.has(generalId);
  }

  /**
   * 보유 장수 조회
   */
  getGeneral(generalId: string): OwnedGeneral | null {
    return this.ownedGenerals.get(generalId) ?? null;
  }

  /**
   * 모든 보유 장수 조회
   */
  getAllGenerals(): OwnedGeneral[] {
    return Array.from(this.ownedGenerals.values());
  }

  /**
   * 장수 획득 처리 (중복 시 조각 변환)
   */
  acquireGeneral(generalId: string, grade: GeneralGrade): ShardConversionResult {
    const existing = this.ownedGenerals.get(generalId);
    
    if (existing) {
      // 중복 → 조각 변환
      const shardsGained = DUPLICATE_SHARDS[grade];
      existing.shards += shardsGained;
      this.save();
      
      return {
        generalId,
        grade,
        isDuplicate: true,
        shardsGained,
        totalShards: existing.shards,
      };
    }

    // 신규 획득
    const newGeneral: OwnedGeneral = {
      generalId,
      grade,
      acquiredAt: Date.now(),
      shards: 0,
    };
    this.ownedGenerals.set(generalId, newGeneral);
    this.save();

    return {
      generalId,
      grade,
      isDuplicate: false,
      shardsGained: 0,
      totalShards: 0,
    };
  }

  /**
   * 조각 추가
   */
  addShards(generalId: string, amount: number): boolean {
    const general = this.ownedGenerals.get(generalId);
    if (!general) return false;
    
    general.shards += amount;
    this.save();
    return true;
  }

  /**
   * 조각 소모 (승급에 사용)
   */
  useShards(generalId: string, amount: number): boolean {
    const general = this.ownedGenerals.get(generalId);
    if (!general || general.shards < amount) return false;
    
    general.shards -= amount;
    this.save();
    return true;
  }

  /**
   * 특정 장수의 조각 수 조회
   */
  getShards(generalId: string): number {
    return this.ownedGenerals.get(generalId)?.shards ?? 0;
  }

  /**
   * 보유 장수 수
   */
  getOwnedCount(): number {
    return this.ownedGenerals.size;
  }

  /**
   * 등급별 보유 장수 수
   */
  getOwnedCountByGrade(): Record<GeneralGrade, number> {
    const counts: Record<GeneralGrade, number> = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
    
    for (const general of this.ownedGenerals.values()) {
      counts[general.grade]++;
    }
    
    return counts;
  }

  /**
   * 초기화 (테스트용)
   */
  reset(): void {
    this.ownedGenerals.clear();
    localStorage.removeItem(this.storageKey);
  }
}

/**
 * 등급별 중복 조각 수 조회
 */
export function getDuplicateShards(grade: GeneralGrade): number {
  return DUPLICATE_SHARDS[grade];
}
