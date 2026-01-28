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
  level: number;  // 장수 레벨 (기본 1)
  exp: number;    // 현재 경험치
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
        data.forEach(g => {
          // 하위 호환: level/exp 필드가 없는 기존 데이터 처리
          if (g.level === undefined || g.level === null) g.level = 1;
          if (g.exp === undefined || g.exp === null) g.exp = 0;
          this.ownedGenerals.set(g.generalId, g);
        });
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
      level: 1,
      exp: 0,
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

  // ============ 레벨/경험치 관리 ============

  /**
   * 장수 레벨 조회
   */
  getGeneralLevel(generalId: string): number {
    return this.ownedGenerals.get(generalId)?.level ?? 1;
  }

  /**
   * 장수 경험치 조회
   */
  getGeneralExp(generalId: string): number {
    return this.ownedGenerals.get(generalId)?.exp ?? 0;
  }

  /**
   * 다음 레벨까지 필요한 경험치 계산
   * Level 1→2: 100, Level 2→3: 150, Level n→n+1: 100 + (n-1)*50
   */
  static getExpToNextLevel(level: number): number {
    return 100 + (level - 1) * 50;
  }

  /**
   * 경험치 추가 (자동 레벨업 포함)
   * @returns 레벨업 여부 및 새 레벨
   */
  addExp(generalId: string, amount: number): { leveled: boolean; newLevel: number; expGained: number } {
    const general = this.ownedGenerals.get(generalId);
    if (!general || amount <= 0) {
      return { leveled: false, newLevel: general?.level ?? 1, expGained: 0 };
    }

    general.exp += amount;
    const oldLevel = general.level;

    // 자동 레벨업 처리
    while (general.exp >= OwnedGeneralsManager.getExpToNextLevel(general.level)) {
      general.exp -= OwnedGeneralsManager.getExpToNextLevel(general.level);
      general.level++;
    }

    this.save();

    return {
      leveled: general.level > oldLevel,
      newLevel: general.level,
      expGained: amount,
    };
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
