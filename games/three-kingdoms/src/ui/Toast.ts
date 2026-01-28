import Phaser from 'phaser';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  duration?: number;
  type?: ToastType;
  y?: number;
}

const TOAST_COLORS: Record<ToastType, { bg: number; text: string }> = {
  success: { bg: 0x228b22, text: '#ffffff' },
  error: { bg: 0xdc3545, text: '#ffffff' },
  info: { bg: 0x17a2b8, text: '#ffffff' },
  warning: { bg: 0xffc107, text: '#000000' },
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

export class Toast {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private isShowing: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setVisible(false);
  }

  /**
   * 토스트 메시지 표시
   */
  show(message: string, options: ToastOptions = {}): void {
    if (this.isShowing) {
      this.container.removeAll(true);
    }

    const {
      duration = 2500,
      type = 'info',
      y = 100,
    } = options;

    const { width } = this.scene.cameras.main;
    const colors = TOAST_COLORS[type];
    const icon = TOAST_ICONS[type];

    // 배경
    const bg = this.scene.add.graphics();
    const textObj = this.scene.add.text(0, 0, `${icon} ${message}`, {
      fontSize: '14px',
      color: colors.text,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const padding = { x: 20, y: 12 };
    const bgWidth = textObj.width + padding.x * 2;
    const bgHeight = textObj.height + padding.y * 2;

    bg.fillStyle(colors.bg, 0.95);
    bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);
    bg.lineStyle(1, 0xffffff, 0.3);
    bg.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 8);

    this.container.add([bg, textObj]);
    this.container.setPosition(width / 2, y);
    this.container.setAlpha(0);
    this.container.setVisible(true);

    this.isShowing = true;

    // 등장 애니메이션
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: y + 10,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // 자동 숨김
    this.scene.time.delayedCall(duration, () => this.hide());
  }

  /**
   * 토스트 숨기기
   */
  hide(): void {
    if (!this.isShowing) return;

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: this.container.y - 20,
      duration: 200,
      onComplete: () => {
        this.container.setVisible(false);
        this.container.removeAll(true);
        this.isShowing = false;
      },
    });
  }

  /**
   * 성공 토스트 (shortcut)
   */
  success(message: string, options?: Omit<ToastOptions, 'type'>): void {
    this.show(message, { ...options, type: 'success' });
  }

  /**
   * 에러 토스트 (shortcut)
   */
  error(message: string, options?: Omit<ToastOptions, 'type'>): void {
    this.show(message, { ...options, type: 'error' });
  }

  /**
   * 정보 토스트 (shortcut)
   */
  info(message: string, options?: Omit<ToastOptions, 'type'>): void {
    this.show(message, { ...options, type: 'info' });
  }

  /**
   * 경고 토스트 (shortcut)
   */
  warning(message: string, options?: Omit<ToastOptions, 'type'>): void {
    this.show(message, { ...options, type: 'warning' });
  }

  destroy(): void {
    this.container.destroy();
  }
}

/**
 * 전역 토스트 인스턴스 관리
 */
let globalToast: Toast | null = null;

export function initToast(scene: Phaser.Scene): Toast {
  if (globalToast) {
    globalToast.destroy();
  }
  globalToast = new Toast(scene);
  return globalToast;
}

export function showToast(message: string, options?: ToastOptions): void {
  globalToast?.show(message, options);
}

export function successToast(message: string): void {
  globalToast?.success(message);
}

export function errorToast(message: string): void {
  globalToast?.error(message);
}

export function infoToast(message: string): void {
  globalToast?.info(message);
}

export function warningToast(message: string): void {
  globalToast?.warning(message);
}
