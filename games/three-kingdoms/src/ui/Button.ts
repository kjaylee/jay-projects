import Phaser from 'phaser';
import { drawButtonGradient, COLORS } from './effects';

export interface ButtonStyle {
  width?: number;
  height?: number;
  backgroundColor?: number;
  backgroundColorDark?: number;
  borderColor?: number;
  borderWidth?: number;
  cornerRadius?: number;
  fontSize?: string;
  fontColor?: string;
  hoverScale?: number;
  pressScale?: number;
  glowOnHover?: boolean;
  disabled?: boolean;
}

const DEFAULT_STYLE: ButtonStyle = {
  width: 200,
  height: 44,
  backgroundColor: COLORS.UI.red,
  backgroundColorDark: COLORS.UI.darkRed,
  borderColor: COLORS.UI.gold,
  borderWidth: 2,
  cornerRadius: 8,
  fontSize: '18px',
  fontColor: '#ffffff',
  hoverScale: 1.05,
  pressScale: 0.95,
  glowOnHover: true,
  disabled: false,
};

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private style: ButtonStyle;
  private callback?: () => void;
  private _disabled: boolean = false;
  private isPressed: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style?: Partial<ButtonStyle>,
    callback?: () => void
  ) {
    super(scene, x, y);

    this.style = { ...DEFAULT_STYLE, ...style };
    
    // 색상 계산 (어두운 색이 없으면 자동 생성)
    if (!this.style.backgroundColorDark) {
      this.style.backgroundColorDark = this.darkenColor(this.style.backgroundColor!, 0.6);
    }
    
    this.callback = callback;
    this._disabled = this.style.disabled ?? false;

    // Glow layer (hover 시 표시)
    this.glow = scene.add.graphics();
    this.drawGlow(false);
    this.add(this.glow);

    // Background
    this.bg = scene.add.graphics();
    this.drawBackground();
    this.add(this.bg);

    // Label with shadow
    this.label = scene.add.text(0, -1, text, {
      fontSize: this.style.fontSize,
      color: this.style.fontColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.add(this.label);

    // Interactivity
    this.setSize(this.style.width!, this.style.height!);
    
    if (!this._disabled) {
      this.setInteractive({ useHandCursor: true });
      this.setupEvents();
    }

    scene.add.existing(this);
  }

  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  private setupEvents(): void {
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerup', this.onPointerUp, this);
  }

  private drawGlow(visible: boolean): void {
    this.glow.clear();
    if (!visible || !this.style.glowOnHover) return;
    
    const { width, height, cornerRadius, borderColor } = this.style;
    const halfW = width! / 2;
    const halfH = height! / 2;
    
    // 외곽 글로우
    this.glow.fillStyle(borderColor!, 0.3);
    this.glow.fillRoundedRect(-halfW - 4, -halfH - 4, width! + 8, height! + 8, cornerRadius! + 2);
  }

  private drawBackground(): void {
    const { width, height, cornerRadius, backgroundColor, backgroundColorDark, borderColor, borderWidth } = this.style;
    const halfW = width! / 2;
    const halfH = height! / 2;

    this.bg.clear();
    
    if (this._disabled) {
      // 비활성화 상태
      this.bg.fillStyle(0x444444, 1);
      this.bg.fillRoundedRect(-halfW, -halfH, width!, height!, cornerRadius);
      this.bg.lineStyle(borderWidth!, 0x666666);
      this.bg.strokeRoundedRect(-halfW, -halfH, width!, height!, cornerRadius);
      return;
    }

    // 그림자
    this.bg.fillStyle(0x000000, 0.4);
    this.bg.fillRoundedRect(-halfW + 2, -halfH + 3, width!, height!, cornerRadius);
    
    // 메인 그라디언트 배경
    this.bg.fillGradientStyle(
      backgroundColor!, backgroundColor!,
      backgroundColorDark!, backgroundColorDark!,
      1
    );
    this.bg.fillRoundedRect(-halfW, -halfH, width!, height!, cornerRadius);
    
    // 상단 하이라이트
    this.bg.fillStyle(0xffffff, 0.15);
    this.bg.fillRoundedRect(
      -halfW + 2, -halfH + 2,
      width! - 4, height! / 3,
      { tl: cornerRadius! - 2, tr: cornerRadius! - 2, bl: 0, br: 0 }
    );
    
    // 테두리
    this.bg.lineStyle(borderWidth!, borderColor!);
    this.bg.strokeRoundedRect(-halfW, -halfH, width!, height!, cornerRadius);
  }

  private onPointerOver(): void {
    if (this._disabled) return;
    
    this.drawGlow(true);
    
    // 스케일 업 애니메이션
    this.scene.tweens.add({
      targets: this,
      scaleX: this.style.hoverScale,
      scaleY: this.style.hoverScale,
      duration: 100,
      ease: 'Power2',
    });
  }

  private onPointerOut(): void {
    if (this._disabled) return;
    
    this.drawGlow(false);
    this.isPressed = false;
    
    // 스케일 복원
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Power2',
    });
  }

  private onPointerDown(): void {
    if (this._disabled) return;
    
    this.isPressed = true;
    
    // 프레스 효과
    this.scene.tweens.add({
      targets: this,
      scaleX: this.style.pressScale,
      scaleY: this.style.pressScale,
      duration: 50,
      ease: 'Power2',
    });
  }

  private onPointerUp(): void {
    if (this._disabled || !this.isPressed) return;
    
    this.isPressed = false;
    
    // 원래 크기로 복귀 후 콜백
    this.scene.tweens.add({
      targets: this,
      scaleX: this.style.hoverScale,
      scaleY: this.style.hoverScale,
      duration: 50,
      ease: 'Power2',
      onComplete: () => {
        if (this.callback) {
          this.callback();
        }
      },
    });
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setCallback(callback: () => void): void {
    this.callback = callback;
  }

  setDisabled(disabled: boolean): void {
    this._disabled = disabled;
    
    if (disabled) {
      this.label.setAlpha(0.5);
      this.disableInteractive();
    } else {
      this.label.setAlpha(1);
      this.setInteractive({ useHandCursor: true });
    }
    
    this.drawBackground();
    this.drawGlow(false);
  }

  get disabled(): boolean {
    return this._disabled;
  }

  // 버튼 스타일 변경
  setStyle(newStyle: Partial<ButtonStyle>): void {
    this.style = { ...this.style, ...newStyle };
    this.drawBackground();
  }

  // 펄스 애니메이션 (주목 필요한 버튼에)
  pulse(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });
  }
}
