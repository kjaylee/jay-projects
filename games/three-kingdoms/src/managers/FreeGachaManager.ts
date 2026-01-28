/**
 * 일일 무료 가챠 관리자
 * - 하루에 1회만 무료 뽑기 가능
 * - LocalStorage에 상태 저장
 * - 자정 기준 리셋
 */

// 날짜 문자열 생성 (YYYY-MM-DD)
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export interface FreeGachaState {
  lastFreeDate: string | null;
  userId: string;
}

const STORAGE_KEY_PREFIX = 'freeGacha_';

export class FreeGachaManager {
  private userId: string;
  private storageKey: string;
  private state: FreeGachaState;

  constructor(userId: string) {
    this.userId = userId;
    this.storageKey = STORAGE_KEY_PREFIX + userId;
    this.state = this.load();
  }

  private load(): FreeGachaState {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        console.error('Failed to parse FreeGachaManager state');
      }
    }
    return { lastFreeDate: null, userId: this.userId };
  }

  private save(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  /**
   * 오늘 무료 가챠를 사용할 수 있는지 확인
   */
  canUseFreeGacha(): boolean {
    if (!this.state.lastFreeDate) {
      return true;
    }
    const today = getDateString();
    return this.state.lastFreeDate !== today;
  }

  /**
   * 무료 가챠 사용 처리
   * @returns 성공 여부
   */
  useFreeGacha(): boolean {
    if (!this.canUseFreeGacha()) {
      return false;
    }
    this.state.lastFreeDate = getDateString();
    this.save();
    return true;
  }

  /**
   * 다음 무료 가챠까지 남은 시간 (밀리초)
   */
  getTimeUntilReset(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  /**
   * 다음 무료 가챠까지 남은 시간 (포맷팅된 문자열)
   */
  getTimeUntilResetFormatted(): string {
    const ms = this.getTimeUntilReset();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}시간 ${minutes}분`;
  }

  /**
   * 마지막 무료 가챠 사용 날짜
   */
  getLastFreeDate(): string | null {
    return this.state.lastFreeDate;
  }

  /**
   * 상태 초기화 (테스트/관리용)
   */
  reset(): void {
    this.state = { lastFreeDate: null, userId: this.userId };
    localStorage.removeItem(this.storageKey);
  }
}
