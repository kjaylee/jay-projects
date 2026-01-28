/**
 * 스턴(행동불가) 매니저
 * 유닛별 스턴 상태를 관리하고 행동 가능 여부를 판단
 */
export class StunManager {
  private stuns: Map<string, number>; // unitId → 남은 스턴 턴 수

  constructor() {
    this.stuns = new Map();
  }

  /**
   * 유닛에 스턴 적용
   * @param unitId 유닛 ID
   * @param duration 스턴 지속 턴 수
   */
  applyStun(unitId: string, duration: number): void {
    const currentDuration = this.stuns.get(unitId) ?? 0;

    // 더 긴 스턴만 적용 (기존 스턴이 더 길면 무시)
    if (duration > currentDuration) {
      this.stuns.set(unitId, duration);
    }
  }

  /**
   * 유닛이 스턴 상태인지 확인
   */
  isStunned(unitId: string): boolean {
    const duration = this.stuns.get(unitId) ?? 0;
    return duration > 0;
  }

  /**
   * 유닛이 행동 가능한지 확인 (스턴 상태가 아니면 행동 가능)
   */
  canAct(unitId: string): boolean {
    return !this.isStunned(unitId);
  }

  /**
   * 스턴 남은 턴 수 조회
   */
  getStunDuration(unitId: string): number {
    return this.stuns.get(unitId) ?? 0;
  }

  /**
   * 턴 종료 시 스턴 지속시간 감소
   * @returns 만료된 스턴의 유닛 ID 목록
   */
  tickStuns(): string[] {
    const expiredUnits: string[] = [];

    for (const [unitId, duration] of this.stuns) {
      const newDuration = duration - 1;

      if (newDuration <= 0) {
        this.stuns.delete(unitId);
        expiredUnits.push(unitId);
      } else {
        this.stuns.set(unitId, newDuration);
      }
    }

    return expiredUnits;
  }

  /**
   * 특정 유닛의 스턴 해제
   */
  removeStun(unitId: string): void {
    this.stuns.delete(unitId);
  }

  /**
   * 모든 스턴 초기화
   */
  clearAllStuns(): void {
    this.stuns.clear();
  }

  /**
   * 현재 스턴 상태인 유닛 ID 목록 반환
   */
  getStunnedUnits(): string[] {
    return Array.from(this.stuns.keys());
  }

  /**
   * 디버그용: 현재 상태 출력
   */
  debugPrint(): void {
    console.log('=== StunManager State ===');
    for (const [unitId, duration] of this.stuns) {
      console.log(`  ${unitId}: ${duration}턴 남음`);
    }
    console.log('=========================');
  }
}

// 전역 싱글톤 인스턴스 (필요시 사용)
let globalStunManager: StunManager | null = null;

export function getStunManager(): StunManager {
  if (!globalStunManager) {
    globalStunManager = new StunManager();
  }
  return globalStunManager;
}

export function resetStunManager(): void {
  globalStunManager = null;
}
