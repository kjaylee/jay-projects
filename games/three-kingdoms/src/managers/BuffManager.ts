/**
 * 활성 버프/디버프 인터페이스
 */
export interface ActiveBuff {
  id: string;
  skillId: string;
  type: 'buff' | 'debuff';
  stat: string;           // attack, defense, intelligence, speed
  value: number;          // 0.5 = +50%, -0.5 = -50%
  duration: number;       // 남은 턴
  source: string;         // caster unit id
}

/**
 * 버프/디버프 매니저
 * 유닛별 활성 버프를 관리하고 스탯 보정값을 계산
 */
export class BuffManager {
  private buffs: Map<string, ActiveBuff[]>;  // unitId → 활성 버프 목록

  constructor() {
    this.buffs = new Map();
  }

  /**
   * 버프 추가
   * 같은 스킬에서 온 같은 스탯의 버프는 갱신 (duration만 리셋)
   */
  addBuff(unitId: string, buff: ActiveBuff): void {
    if (!this.buffs.has(unitId)) {
      this.buffs.set(unitId, []);
    }

    const unitBuffs = this.buffs.get(unitId)!;
    
    // 같은 스킬 + 같은 스탯의 기존 버프 확인
    const existingIndex = unitBuffs.findIndex(
      (b) => b.skillId === buff.skillId && b.stat === buff.stat
    );

    if (existingIndex >= 0) {
      // 기존 버프 갱신 (duration 리셋)
      unitBuffs[existingIndex] = buff;
    } else {
      // 새 버프 추가
      unitBuffs.push(buff);
    }
  }

  /**
   * 특정 버프 제거
   */
  removeBuff(unitId: string, buffId: string): void {
    const unitBuffs = this.buffs.get(unitId);
    if (!unitBuffs) return;

    const index = unitBuffs.findIndex((b) => b.id === buffId);
    if (index >= 0) {
      unitBuffs.splice(index, 1);
    }
  }

  /**
   * 특정 유닛의 모든 버프 제거
   */
  clearBuffs(unitId: string): void {
    this.buffs.delete(unitId);
  }

  /**
   * 모든 버프 초기화
   */
  clearAllBuffs(): void {
    this.buffs.clear();
  }

  /**
   * 턴 종료 시 duration 감소 및 만료 버프 제거
   * @returns 만료된 버프 목록
   */
  tickBuffs(): ActiveBuff[] {
    const expiredBuffs: ActiveBuff[] = [];

    for (const [unitId, unitBuffs] of this.buffs) {
      const remaining: ActiveBuff[] = [];

      for (const buff of unitBuffs) {
        buff.duration -= 1;

        if (buff.duration <= 0) {
          expiredBuffs.push(buff);
        } else {
          remaining.push(buff);
        }
      }

      if (remaining.length > 0) {
        this.buffs.set(unitId, remaining);
      } else {
        this.buffs.delete(unitId);
      }
    }

    return expiredBuffs;
  }

  /**
   * 유닛의 특정 스탯 보정값 계산
   * 같은 스탯의 모든 버프/디버프를 합산
   * @returns 승수 (1.5 = +50%, 0.5 = -50%)
   */
  getStatModifier(unitId: string, stat: string): number {
    const unitBuffs = this.buffs.get(unitId);
    if (!unitBuffs || unitBuffs.length === 0) {
      return 1.0;
    }

    let totalModifier = 0;

    for (const buff of unitBuffs) {
      if (buff.stat === stat) {
        totalModifier += buff.value;
      }
    }

    // 최종 승수: 1 + 총 보정값
    // 최소 0.1로 제한 (90% 이상 감소 방지)
    return Math.max(0.1, 1 + totalModifier);
  }

  /**
   * 유닛의 활성 버프 목록 조회
   */
  getActiveBuffs(unitId: string): ActiveBuff[] {
    return this.buffs.get(unitId) ?? [];
  }

  /**
   * 유닛의 특정 타입(buff/debuff)만 조회
   */
  getBuffsByType(unitId: string, type: 'buff' | 'debuff'): ActiveBuff[] {
    return this.getActiveBuffs(unitId).filter((b) => b.type === type);
  }

  /**
   * 유닛에 특정 스킬의 버프가 있는지 확인
   */
  hasBuffFromSkill(unitId: string, skillId: string): boolean {
    const unitBuffs = this.buffs.get(unitId);
    if (!unitBuffs) return false;
    return unitBuffs.some((b) => b.skillId === skillId);
  }

  /**
   * 디버그용: 현재 상태 출력
   */
  debugPrint(): void {
    console.log('=== BuffManager State ===');
    for (const [unitId, unitBuffs] of this.buffs) {
      console.log(`Unit ${unitId}:`);
      for (const buff of unitBuffs) {
        const sign = buff.value >= 0 ? '+' : '';
        console.log(`  - [${buff.type}] ${buff.stat} ${sign}${buff.value * 100}% (${buff.duration}턴)`);
      }
    }
    console.log('========================');
  }
}

// 전역 싱글톤 인스턴스 (필요시 사용)
let globalBuffManager: BuffManager | null = null;

export function getBuffManager(): BuffManager {
  if (!globalBuffManager) {
    globalBuffManager = new BuffManager();
  }
  return globalBuffManager;
}

export function resetBuffManager(): void {
  globalBuffManager = null;
}
