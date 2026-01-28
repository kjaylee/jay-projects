import Phaser from 'phaser';
import { Button } from './Button';
import { drawPanelBackground, COLORS } from './effects';

export interface ModalConfig {
  width?: number;
  height?: number;
  backgroundColor?: number;
  borderColor?: number;
  overlayAlpha?: number;
  title?: string;
  showCloseButton?: boolean;
  animated?: boolean;
  useImageBackground?: boolean;
}

const DEFAULT_CONFIG: ModalConfig = {
  width: 350,
  height: 250,
  backgroundColor: 0x1a1a2e,
  borderColor: COLORS.UI.gold,
  overlayAlpha: 0.8,
  title: '',
  showCloseButton: true,
  animated: true,
  useImageBackground: true,
};

export class Modal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Graphics;
  private panelContainer: Phaser.GameObjects.Container;
  private panelImage?: Phaser.GameObjects.Image;
  private panel?: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private titleLine?: Phaser.GameObjects.Graphics;
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
    const panelWidth = this.config.width!;
    const panelHeight = this.config.height!;

    // 오버레이 (클릭시 닫기)
    this.overlay = scene.add.graphics();
    this.overlay.fillStyle(0x000000, this.config.overlayAlpha!);
    this.overlay.fillRect(0, 0, screenWidth, screenHeight);
    this.overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, screenWidth, screenHeight),
      Phaser.Geom.Rectangle.Contains
    );
    this.overlay.on('pointerdown', () => this.hide());
    this.add(this.overlay);

    // 패널 컨테이너 (애니메이션용)
    this.panelContainer = scene.add.container(screenWidth / 2, screenHeight / 2);
    this.add(this.panelContainer);

    // 패널 배경 - 이미지 또는 그래픽
    if (this.config.useImageBackground && scene.textures.exists('modal_bg')) {
      this.panelImage = scene.add.image(0, 0, 'modal_bg');
      // 원하는 크기로 스케일 조정
      const scaleX = panelWidth / this.panelImage.width;
      const scaleY = panelHeight / this.panelImage.height;
      this.panelImage.setScale(scaleX, scaleY);
      this.panelContainer.add(this.panelImage);
    } else {
      this.panel = drawPanelBackground(
        scene,
        -panelWidth / 2,
        -panelHeight / 2,
        panelWidth,
        panelHeight,
        {
          fillColor: this.config.backgroundColor,
          borderColor: this.config.borderColor,
          cornerRadius: 16,
          innerGlow: true,
        }
      );
      this.panelContainer.add(this.panel);
    }

    // 패널은 클릭이 overlay로 전파되지 않도록
    const panelHitArea = scene.add.graphics();
    panelHitArea.fillStyle(0x000000, 0.001);
    panelHitArea.fillRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
    panelHitArea.setInteractive(
      new Phaser.Geom.Rectangle(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight),
      Phaser.Geom.Rectangle.Contains
    );
    this.panelContainer.add(panelHitArea);

    // 타이틀
    if (this.config.title) {
      this.titleText = scene.add.text(0, -panelHeight / 2 + 30, this.config.title, {
        fontSize: '20px',
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      this.panelContainer.add(this.titleText);

      // 타이틀 아래 구분선
      this.titleLine = scene.add.graphics();
      this.titleLine.lineStyle(1, COLORS.UI.gold, 0.3);
      this.titleLine.lineBetween(
        -panelWidth / 2 + 25,
        -panelHeight / 2 + 55,
        panelWidth / 2 - 25,
        -panelHeight / 2 + 55
      );
      this.panelContainer.add(this.titleLine);
    }

    // 닫기 버튼
    if (this.config.showCloseButton) {
      this.closeBtn = new Button(
        scene,
        panelWidth / 2 - 25,
        -panelHeight / 2 + 25,
        '✕',
        {
          width: 32,
          height: 32,
          fontSize: '18px',
          variant: 'dark',
          useImage: false,
        },
        () => this.hide()
      );
      this.panelContainer.add(this.closeBtn);
    }

    // 콘텐츠 컨테이너
    this.contentContainer = scene.add.container(0, 0);
    this.panelContainer.add(this.contentContainer);

    // 초기 상태: 숨김
    this.setVisible(false);
    this.setDepth(1000);

    scene.add.existing(this);
  }

  show(): void {
    this.setVisible(true);

    if (this.config.animated) {
      // 오버레이 페이드 인
      this.overlay.setAlpha(0);
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 1,
        duration: 150,
      });

      // 패널 스케일 + 페이드 인
      this.panelContainer.setScale(0.8);
      this.panelContainer.setAlpha(0);
      this.scene.tweens.add({
        targets: this.panelContainer,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
  }

  hide(): void {
    if (this.config.animated) {
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration: 150,
      });

      this.scene.tweens.add({
        targets: this.panelContainer,
        scaleX: 0.8,
        scaleY: 0.8,
        alpha: 0,
        duration: 150,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.setVisible(false);
          if (this.onCloseCallback) {
            this.onCloseCallback();
          }
        },
      });
    } else {
      this.setVisible(false);
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
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

  getPanelContainer(): Phaser.GameObjects.Container {
    return this.panelContainer;
  }
}
