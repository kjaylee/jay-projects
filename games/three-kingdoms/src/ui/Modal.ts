import Phaser from 'phaser';
import { Button } from './Button';

export interface ModalConfig {
  width?: number;
  height?: number;
  backgroundColor?: number;
  borderColor?: number;
  overlayAlpha?: number;
  title?: string;
  showCloseButton?: boolean;
}

const DEFAULT_CONFIG: ModalConfig = {
  width: 400,
  height: 500,
  backgroundColor: 0x1a1a2e,
  borderColor: 0xffd700,
  overlayAlpha: 0.7,
  title: '',
  showCloseButton: true,
};

export class Modal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Graphics;
  private panel: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private closeBtn?: Button;
  private contentContainer: Phaser.GameObjects.Container;
  private config: ModalConfig;
  private onCloseCallback?: () => void;

  constructor(
    scene: Phaser.Scene,
    config?: Partial<ModalConfig>
  ) {
    super(scene, 0, 0);

    this.config = { ...DEFAULT_CONFIG, ...config };

    const { width: screenWidth, height: screenHeight } = scene.cameras.main;

    // Overlay (click outside to close)
    this.overlay = scene.add.graphics();
    this.overlay.fillStyle(0x000000, this.config.overlayAlpha!);
    this.overlay.fillRect(0, 0, screenWidth, screenHeight);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, screenWidth, screenHeight),
      Phaser.Geom.Rectangle.Contains
    );
    this.overlay.on('pointerdown', () => this.hide());
    this.add(this.overlay);

    // Panel
    const panelX = (screenWidth - this.config.width!) / 2;
    const panelY = (screenHeight - this.config.height!) / 2;

    this.panel = scene.add.graphics();
    this.panel.fillStyle(this.config.backgroundColor!, 1);
    this.panel.fillRoundedRect(panelX, panelY, this.config.width!, this.config.height!, 12);
    this.panel.lineStyle(2, this.config.borderColor!);
    this.panel.strokeRoundedRect(panelX, panelY, this.config.width!, this.config.height!, 12);
    this.panel.setInteractive(
      new Phaser.Geom.Rectangle(panelX, panelY, this.config.width!, this.config.height!),
      Phaser.Geom.Rectangle.Contains
    );
    this.add(this.panel);

    // Title
    if (this.config.title) {
      this.titleText = scene.add.text(screenWidth / 2, panelY + 30, this.config.title, {
        fontSize: '22px',
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add(this.titleText);
    }

    // Close button
    if (this.config.showCloseButton) {
      this.closeBtn = new Button(
        scene,
        panelX + this.config.width! - 30,
        panelY + 30,
        '✕',
        { width: 36, height: 36, fontSize: '20px', backgroundColor: 0x333333 },
        () => this.hide()
      );
      this.add(this.closeBtn);
    }

    // Content container
    this.contentContainer = scene.add.container(screenWidth / 2, screenHeight / 2);
    this.add(this.contentContainer);

    // Initially hidden
    this.setVisible(false);
    this.setDepth(1000);

    scene.add.existing(this);
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  setTitle(title: string): void {
    if (this.titleText) {
      this.titleText.setText(title);
    }
  }

  setContent(content: Phaser.GameObjects.GameObject[]): void {
    this.contentContainer.removeAll(true);
    content.forEach(item => this.contentContainer.add(item));
  }

  addContent(content: Phaser.GameObjects.GameObject): void {
    this.contentContainer.add(content);
  }

  clearContent(): void {
    this.contentContainer.removeAll(true);
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  getContentContainer(): Phaser.GameObjects.Container {
    return this.contentContainer;
  }
}
