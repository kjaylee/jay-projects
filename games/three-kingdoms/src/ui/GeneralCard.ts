import Phaser from 'phaser';
import { General, GeneralGrade } from '../entities/General';
import { COLORS, createCardShineEffect } from './effects';

export interface GeneralCardConfig {
  width?: number;
  height?: number;
  showLevel?: boolean;
  showStars?: boolean;
  interactive?: boolean;
  selected?: boolean;
  showShine?: boolean;
  showName?: boolean;
  useImageFrame?: boolean;
}

const DEFAULT_CONFIG: GeneralCardConfig = {
  width: 100,
  height: 140,
  showLevel: true,
  showStars: true,
  interactive: true,
  selected: false,
  showShine: true,
  showName: true,
  useImageFrame: true,
};

const GRADE_COLORS: Record<GeneralGrade, { primary: number; bg: number; glow: number }> = {
  N: { primary: 0x888888, bg: 0x333333, glow: 0x666666 },
  R: { primary: 0x00cc00, bg: 0x1a3a1a, glow: 0x00ff00 },
  SR: { primary: 0x0088ff, bg: 0x1a2a4a, glow: 0x00ccff },
  SSR: { primary: 0xff8800, bg: 0x4a2a1a, glow: 0xffaa00 },
  UR: { primary: 0xff0088, bg: 0x4a1a3a, glow: 0xff44aa },
};

const GRADE_FRAME_KEYS: Record<GeneralGrade, string> = {
  N: 'card_frame_n',
  R: 'card_frame_r',
  SR: 'card_frame_sr',
  SSR: 'card_frame_ssr',
  UR: 'card_frame_ur',
};

export class GeneralCard extends Phaser.GameObjects.Container {
  private frameImage?: Phaser.GameObjects.Image;
  private frameBg?: Phaser.GameObjects.Graphics;
  private border?: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private portrait!: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  private nameText?: Phaser.GameObjects.Text;
  private gradeText: Phaser.GameObjects.Text;
  private levelText?: Phaser.GameObjects.Text;
  private starsContainer?: Phaser.GameObjects.Container;
  private shine?: Phaser.GameObjects.Graphics;
  private config: GeneralCardConfig;
  private _selected: boolean = false;
  private general: General;
  private gradeColors: { primary: number; bg: number; glow: number };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    general: General,
    config?: Partial<GeneralCardConfig>
  ) {
    super(scene, x, y);

    this.general = general;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._selected = this.config.selected ?? false;
    this.gradeColors = GRADE_COLORS[general.grade];

    const { width, height } = this.config;
    const halfW = width! / 2;
    const halfH = height! / 2;

    // Glow layer (선택 시 또는 hover 시)
    this.glow = scene.add.graphics();
    this.add(this.glow);

    // Frame - 이미지 또는 그래픽
    this.createFrame(general.grade);

    // Portrait (이미지 또는 폴백 이모지)
    this.createPortrait(general);

    // Grade badge
    this.gradeText = scene.add.text(-halfW + 5, -halfH + 5, general.grade, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#' + this.gradeColors.primary.toString(16).padStart(6, '0'),
      padding: { x: 4, y: 2 },
    });
    this.add(this.gradeText);

    // Class icon (우측 상단)
    const classEmoji = this.getClassEmoji(general.generalClass);
    const classIcon = scene.add.text(halfW - 5, -halfH + 5, classEmoji, {
      fontSize: '14px',
    }).setOrigin(1, 0);
    this.add(classIcon);

    // Name
    if (this.config.showName) {
      const nameBg = scene.add.graphics();
      nameBg.fillStyle(0x000000, 0.7);
      nameBg.fillRect(-halfW + 2, halfH - 24, width! - 4, 22);
      this.add(nameBg);

      this.nameText = scene.add.text(0, halfH - 13, general.name, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.add(this.nameText);
    }

    // Level
    if (this.config.showLevel) {
      this.levelText = scene.add.text(halfW - 5, -halfH + 24, `Lv.${general.level}`, {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 3, y: 2 },
      }).setOrigin(1, 0);
      this.add(this.levelText);
    }

    // Stars
    if (this.config.showStars) {
      this.starsContainer = this.createStars(general.stars, halfW, halfH);
      this.add(this.starsContainer);
    }

    // Shine effect (SSR, UR만)
    if (this.config.showShine && (general.grade === 'SSR' || general.grade === 'UR')) {
      this.shine = createCardShineEffect(scene, 0, 0, width!, height!);
      this.add(this.shine);
    }

    // Interactivity
    if (this.config.interactive) {
      this.setSize(width!, height!);
      this.setInteractive({ useHandCursor: true });
      this.setupEvents();
    }

    scene.add.existing(this);
  }

  private createFrame(grade: GeneralGrade): void {
    const { width, height } = this.config;
    const halfW = width! / 2;
    const halfH = height! / 2;
    const frameKey = GRADE_FRAME_KEYS[grade];

    if (this.config.useImageFrame && this.scene.textures.exists(frameKey)) {
      // 이미지 프레임 사용
      this.frameImage = this.scene.add.image(0, 0, frameKey);
      const scaleX = width! / this.frameImage.width;
      const scaleY = height! / this.frameImage.height;
      this.frameImage.setScale(scaleX, scaleY);
      this.add(this.frameImage);
    } else {
      // 폴백: 그래픽으로 프레임 그리기
      this.frameBg = this.scene.add.graphics();
      this.border = this.scene.add.graphics();
      
      // 배경
      const bgTop = this.gradeColors.bg;
      const bgBottom = this.darkenColor(this.gradeColors.bg, 0.5);
      this.frameBg.fillGradientStyle(bgTop, bgTop, bgBottom, bgBottom, 1);
      this.frameBg.fillRoundedRect(-halfW, -halfH, width!, height!, 8);
      this.add(this.frameBg);
      
      // 테두리
      this.border.lineStyle(3, this.gradeColors.primary);
      this.border.strokeRoundedRect(-halfW, -halfH, width!, height!, 8);
      this.add(this.border);
    }
  }

  private createPortrait(general: General): void {
    const { width, height } = this.config;
    const halfH = height! / 2;
    
    const imageKey = `portrait_${general.id}`;
    
    if (this.scene.textures.exists(imageKey)) {
      this.portrait = this.scene.add.image(0, -8, imageKey);
      
      // 카드에 맞게 스케일 조정
      const targetWidth = width! - 12;
      const targetHeight = height! - 40;
      const scale = Math.min(
        targetWidth / this.portrait.width,
        targetHeight / this.portrait.height
      );
      this.portrait.setScale(scale * 0.85);
    } else {
      // 폴백: 클래스 이모지
      const classEmoji = this.getClassEmoji(general.generalClass);
      this.portrait = this.scene.add.text(0, -10, classEmoji, {
        fontSize: '40px',
      }).setOrigin(0.5);
    }
    
    this.add(this.portrait);
  }

  private createStars(starCount: number, halfW: number, halfH: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, halfH - 38);
    
    const totalWidth = starCount * 12;
    const startX = -totalWidth / 2 + 6;
    
    for (let i = 0; i < 5; i++) {
      const filled = i < starCount;
      const star = this.scene.add.text(startX + i * 12, 0, filled ? '★' : '☆', {
        fontSize: '11px',
        color: filled ? '#ffd700' : '#555555',
      }).setOrigin(0.5);
      container.add(star);
    }
    
    return container;
  }

  private getClassEmoji(generalClass: string): string {
    const classEmojis: Record<string, string> = {
      warrior: '⚔️',
      strategist: '📜',
      archer: '🏹',
      cavalry: '🐎',
      support: '💫',
      guardian: '🛡️',
    };
    return classEmojis[generalClass] || '👤';
  }

  private setupEvents(): void {
    this.on('pointerover', () => {
      if (!this._selected) {
        this.drawGlow(true);
        this.scene.tweens.add({
          targets: this,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100,
        });
      }
    });

    this.on('pointerout', () => {
      if (!this._selected) {
        this.drawGlow(false);
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      }
    });

    this.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: this,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
      });
    });
  }

  private drawGlow(visible: boolean): void {
    this.glow.clear();
    if (!visible && !this._selected) return;
    
    const { width, height } = this.config;
    const halfW = width! / 2;
    const halfH = height! / 2;
    
    const glowColor = this._selected ? 0x00ff00 : this.gradeColors.glow;
    const glowAlpha = this._selected ? 0.6 : 0.4;
    
    this.glow.fillStyle(glowColor, glowAlpha);
    this.glow.fillRoundedRect(-halfW - 4, -halfH - 4, width! + 8, height! + 8, 12);
  }

  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  setSelected(selected: boolean): void {
    this._selected = selected;
    this.drawGlow(selected);
    
    // 선택 시 테두리 색상 변경 (그래픽 프레임인 경우)
    if (this.border) {
      this.border.clear();
      const borderColor = selected ? 0x00ff00 : this.gradeColors.primary;
      const borderWidth = selected ? 4 : 3;
      const { width, height } = this.config;
      const halfW = width! / 2;
      const halfH = height! / 2;
      this.border.lineStyle(borderWidth, borderColor);
      this.border.strokeRoundedRect(-halfW, -halfH, width!, height!, 8);
    }
    
    // 이미지 프레임인 경우 틴트 적용
    if (this.frameImage && selected) {
      // 선택 시 약간 밝게
      this.frameImage.setTint(0x88ff88);
    } else if (this.frameImage) {
      this.frameImage.clearTint();
    }
    
    if (selected) {
      this.setScale(1.05);
    } else {
      this.setScale(1);
    }
  }

  get selected(): boolean {
    return this._selected;
  }

  getGeneral(): General {
    return this.general;
  }

  updateDisplay(): void {
    if (this.levelText) {
      this.levelText.setText(`Lv.${this.general.level}`);
    }
    if (this.starsContainer) {
      this.starsContainer.destroy();
      const halfW = this.config.width! / 2;
      const halfH = this.config.height! / 2;
      this.starsContainer = this.createStars(this.general.stars, halfW, halfH);
      this.add(this.starsContainer);
    }
  }

  // 획득 시 특별 애니메이션
  playAcquireAnimation(): void {
    this.setAlpha(0);
    this.setScale(0.5);
    
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
        });
      },
    });
    
    // SSR/UR은 화면 플래시
    if (this.general.grade === 'SSR' || this.general.grade === 'UR') {
      const flash = this.scene.add.graphics();
      flash.fillStyle(this.gradeColors.glow, 0.3);
      flash.fillRect(
        -this.scene.cameras.main.width / 2,
        -this.scene.cameras.main.height / 2,
        this.scene.cameras.main.width,
        this.scene.cameras.main.height
      );
      flash.setPosition(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2);
      
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 500,
        onComplete: () => flash.destroy(),
      });
    }
  }
}
