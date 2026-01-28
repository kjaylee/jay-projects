/**
 * Toast 알림 컴포넌트 매니저
 * 획득/레벨업 등 게임 이벤트 알림 표시
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  icon?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  icon: string;
  createdAt: number;
}

/** 기본 표시 시간 (ms) */
export const DEFAULT_DURATION = 3000;

/** 타입별 기본 아이콘 */
export const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

/**
 * Toast 매니저 클래스
 */
export class ToastManager {
  private toasts: Toast[] = [];
  private maxToasts: number;
  private idCounter: number = 0;

  constructor(maxToasts: number = 5) {
    this.maxToasts = maxToasts;
  }

  /**
   * Toast 표시
   */
  show(config: ToastConfig): string {
    const toast: Toast = {
      id: `toast_${++this.idCounter}`,
      message: config.message,
      type: config.type ?? 'info',
      duration: config.duration ?? DEFAULT_DURATION,
      icon: config.icon ?? TOAST_ICONS[config.type ?? 'info'],
      createdAt: Date.now(),
    };

    this.toasts.push(toast);

    // 최대 개수 초과 시 가장 오래된 것 제거
    if (this.toasts.length > this.maxToasts) {
      this.toasts.shift();
    }

    return toast.id;
  }

  /**
   * 특정 Toast 제거
   */
  dismiss(id: string): boolean {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index >= 0) {
      this.toasts.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 모든 Toast 제거
   */
  dismissAll(): void {
    this.toasts = [];
  }

  /**
   * 현재 Toast 목록 조회
   */
  getToasts(): Toast[] {
    return [...this.toasts];
  }

  /**
   * ID로 Toast 조회
   */
  getToastById(id: string): Toast | undefined {
    return this.toasts.find(t => t.id === id);
  }

  /**
   * 만료된 Toast 정리
   */
  cleanup(): string[] {
    const now = Date.now();
    const expired: string[] = [];

    this.toasts = this.toasts.filter(toast => {
      const isExpired = now - toast.createdAt >= toast.duration;
      if (isExpired) {
        expired.push(toast.id);
      }
      return !isExpired;
    });

    return expired;
  }

  // === 편의 메서드 ===

  success(message: string, duration?: number): string {
    return this.show({ message, type: 'success', duration });
  }

  error(message: string, duration?: number): string {
    return this.show({ message, type: 'error', duration });
  }

  warning(message: string, duration?: number): string {
    return this.show({ message, type: 'warning', duration });
  }

  info(message: string, duration?: number): string {
    return this.show({ message, type: 'info', duration });
  }

  // === 게임 이벤트 특화 ===

  /**
   * 레벨업 알림
   */
  levelUp(name: string, level: number): string {
    return this.success(`🎖️ ${name} 레벨 ${level} 달성!`);
  }

  /**
   * 장수 획득 알림
   */
  generalAcquired(grade: string, name: string): string {
    return this.success(`🌟 ${grade} ${name} 획득!`);
  }

  /**
   * 재화 부족 알림
   */
  insufficientResource(resource: string): string {
    return this.warning(`💎 ${resource}이(가) 부족합니다`);
  }

  /**
   * 네트워크 에러 알림
   */
  networkError(): string {
    return this.error('🔌 연결이 끊어졌습니다');
  }
}
