import Phaser from 'phaser';
import { COLORS } from './effects';

export type ButtonVariant = 'red' | 'gold' | 'dark';

export interface ButtonStyle {
  width?: number;
  height?: number;
  variant?: ButtonVariant;
  fontSize?: string;
  fontColor?: string;
  hoverScale?: number;
  pressScale?: number;
  disabled?: boolean;
  useImage?: boolean;
  // Custom colors (override variant)
  backgroundColor?: number;
  backgroundColorDark?: number;
  borderColor?: number;
  glowOnHover?: boolean;
}

const DEFAULT_STYLE: ButtonStyle = {
  width: 200,
  height: 50,
  variant: 'red',
  fontSize: '18px',
  fontColor: '#ffffff',
  hoverScale: 1.05,
  pressScale: 0.95,
  disabled: false,
  useImage: true,
};

export class Button extends Phaser.GameObjects.Container {
  private bgImage?: Phaser.GameObjects.Image;
  private bgGraphics?: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private style: ButtonStyle;
  private callback?: () => void;
  private _disabled: boolean = false;
  private isPressed: boolean = false;
  private variant: ButtonVariant;

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
    this.variant = this.style.variant ?? 'red';
    this.callback = callback;
    this._disabled = this.style.disabled ?? false;

    // Glow layer (hover 시 표시)
    this.glow = scene.add.graphics();
    this.add(this.glow);

    // Background - 이미지 사용 여부 확인
    const imageKey = `btn_${this.variant}`;
    if (this.style.useImage && scene.textures.exists(imageKey)) {
      this.createImageBackground(imageKey);
    } else {
      this.createGraphicsBackground();
    }

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

    this.updateDisabledState();

    scene.add.existing(this);
  }

  private createImageBackground(imageKey: string): void {
    this.bgImage = this.scene.add.image(0, 0, imageKey);
    
    // 원하는 크기로 스케일 조정
    const scaleX = this.style.width! / this.bgImage.width;
    const scaleY = this.style.height! / this.bgImage.height;
    this.bgImage.setScale(scaleX, scaleY);
    
    this.add(this.bgImage);
  }

  private createGraphicsBackground(): void {
    const { width, height, backgroundColor, backgroundColorDark, borderColor: customBorderColor } = this.style;
    const halfW = width! / 2;
    const halfH = height! / 2;
    const cornerRadius = 8;

    this.bgGraphics = this.scene.add.graphics();
    
    // 커스텀 색상 또는 variant 기반 색상 결정
    let topColor: number, bottomColor: number, borderColor: number;
    
    if (backgroundColor !== undefined) {
      topColor = backgroundColor;
      bottomColor = backgroundColorDark ?? backgroundColor;
      borderColor = customBorderColor ?? 0xffd700;
    } else {
      switch (this.variant) {
        case 'gold':
          topColor = 0xffd700;
          bottomColor = 0xb8860b;
          borderColor = 0x4a3000;
          break;
        case 'dark':
          topColor = 0x3a3a3a;
          bottomColor = 0x1a1a1a;
          borderColor = 0xffd700;
          break;
        case 'red':
        default:
          topColor = 0xc41e3a;
          bottomColor = 0x5c0000;
          borderColor = 0xffd700;
          break;
      }
    }

    // 그림자
    this.bgGraphics.fillStyle(0x000000, 0.4);
    this.bgGraphics.fillRoundedRect(-halfW + 2, -halfH + 3, width!, height!, cornerRadius);
    
    // 메인 그라디언트 배경
    this.bgGraphics.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    this.bgGraphics.fillRoundedRect(-halfW, -halfH, width!, height!, cornerRadius);
    
    // 상단 하이라이트
    this.bgGraphics.fillStyle(0xffffff, 0.15);
    this.bgGraphics.fillRoundedRect(
      -halfW + 2, -halfH + 2,
      width! - 4, height! / 3,
      { tl: cornerRadius - 2, tr: cornerRadius - 2, bl: 0, br: 0 }
    );
    
    // 테두리
    this.bgGraphics.lineStyle(3, borderColor);
    this.bgGraphics.strokeRoundedRect(-halfW, -halfH, width!, height!, cornerRadius);

    this.add(this.bgGraphics);
  }

  private setupEvents(): void {
    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointerup', this.onPointerUp, this);
  }

  private drawGlow(visible: boolean): void {
    this.glow.clear();
    if (!visible) return;
    
    // glowOnHover가 false면 글로우 표시 안함
    if (this.style.glowOnHover === false) return;
    
    const { width, height } = this.style;
    const halfW = width! / 2;
    const halfH = height! / 2;
    
    // 글로우 색상 결정
    let glowColor: number;
    switch (this.variant) {
      case 'gold':
        glowColor = 0xffd700;
        break;
      case 'dark':
        glowColor = 0xffd700;
        break;
      case 'red':
      default:
        glowColor = 0xff6666;
        break;
    }
    
    this.glow.fillStyle(glowColor, 0.3);
    this.glow.fillRoundedRect(-halfW - 4, -halfH - 4, width! + 8, height! + 8, 10);
  }

  private onPointerOver(): void {
    if (this._disabled) return;
    
    this.drawGlow(true);
    
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
    
    // 프레스 이미지로 교체 (있으면)
    if (this.bgImage && this.scene.textures.exists(`btn_${this.variant}_pressed`)) {
      this.bgImage.setTexture(`btn_${this.variant}_pressed`);
    }
    
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
    
    // 원래 이미지로 복귀
    if (this.bgImage) {
      this.bgImage.setTexture(`btn_${this.variant}`);
    }
    
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

  private updateDisabledState(): void {
    if (this._disabled) {
      this.label.setAlpha(0.5);
      if (this.bgImage) {
        this.bgImage.setTint(0x666666);
      }
      if (this.bgGraphics) {
        this.bgGraphics.setAlpha(0.5);
      }
    } else {
      this.label.setAlpha(1);
      if (this.bgImage) {
        this.bgImage.clearTint();
      }
      if (this.bgGraphics) {
        this.bgGraphics.setAlpha(1);
      }
    }
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
      this.disableInteractive();
    } else {
      this.setInteractive({ useHandCursor: true });
    }
    
    this.updateDisabledState();
    this.drawGlow(false);
  }

  get disabled(): boolean {
    return this._disabled;
  }

  setVariant(variant: ButtonVariant): void {
    this.variant = variant;
    const imageKey = `btn_${variant}`;
    
    if (this.bgImage && this.scene.textures.exists(imageKey)) {
      this.bgImage.setTexture(imageKey);
    }
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
