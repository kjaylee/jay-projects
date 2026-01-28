import Phaser from 'phaser';

export interface ButtonStyle {
  width?: number;
  height?: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  cornerRadius?: number;
  fontSize?: string;
  fontColor?: string;
  hoverBackgroundColor?: number;
  disabledBackgroundColor?: number;
}

const DEFAULT_STYLE: ButtonStyle = {
  width: 200,
  height: 44,
  backgroundColor: 0x8b0000,
  borderColor: 0xffd700,
  borderWidth: 2,
  cornerRadius: 8,
  fontSize: '18px',
  fontColor: '#ffffff',
  hoverBackgroundColor: 0xb00000,
  disabledBackgroundColor: 0x444444,
};

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private style: ButtonStyle;
  private callback?: () => void;
  private _disabled: boolean = false;

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
    this.callback = callback;

    // Background
    this.bg = scene.add.graphics();
    this.drawBackground(this.style.backgroundColor!);
    this.add(this.bg);

    // Label
    this.label = scene.add.text(0, 0, text, {
      fontSize: this.style.fontSize,
      color: this.style.fontColor,
    }).setOrigin(0.5);
    this.add(this.label);

    // Interactivity
    this.setSize(this.style.width!, this.style.height!);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', this.onPointerOver, this);
    this.on('pointerout', this.onPointerOut, this);
    this.on('pointerdown', this.onPointerDown, this);

    scene.add.existing(this);
  }

  private drawBackground(color: number): void {
    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(
      -this.style.width! / 2,
      -this.style.height! / 2,
      this.style.width!,
      this.style.height!,
      this.style.cornerRadius
    );
    this.bg.lineStyle(this.style.borderWidth!, this.style.borderColor!);
    this.bg.strokeRoundedRect(
      -this.style.width! / 2,
      -this.style.height! / 2,
      this.style.width!,
      this.style.height!,
      this.style.cornerRadius
    );
  }

  private onPointerOver(): void {
    if (this._disabled) return;
    this.drawBackground(this.style.hoverBackgroundColor!);
  }

  private onPointerOut(): void {
    if (this._disabled) return;
    this.drawBackground(this.style.backgroundColor!);
  }

  private onPointerDown(): void {
    if (this._disabled) return;
    if (this.callback) {
      this.callback();
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
      this.drawBackground(this.style.disabledBackgroundColor!);
      this.label.setAlpha(0.5);
      this.disableInteractive();
    } else {
      this.drawBackground(this.style.backgroundColor!);
      this.label.setAlpha(1);
      this.setInteractive({ useHandCursor: true });
    }
  }

  get disabled(): boolean {
    return this._disabled;
  }
}
