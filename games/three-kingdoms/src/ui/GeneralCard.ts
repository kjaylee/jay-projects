import Phaser from 'phaser';
import { General, GeneralGrade } from '../entities/General';

export interface GeneralCardConfig {
  width?: number;
  height?: number;
  showLevel?: boolean;
  showStars?: boolean;
  interactive?: boolean;
  selected?: boolean;
}

const DEFAULT_CONFIG: GeneralCardConfig = {
  width: 80,
  height: 100,
  showLevel: true,
  showStars: true,
  interactive: true,
  selected: false,
};

const GRADE_COLORS: Record<GeneralGrade, number> = {
  N: 0x888888,
  R: 0x00aa00,
  SR: 0x0088ff,
  SSR: 0xff8800,
  UR: 0xff0088,
};

const GRADE_BG_COLORS: Record<GeneralGrade, number> = {
  N: 0x333333,
  R: 0x1a3a1a,
  SR: 0x1a2a4a,
  SSR: 0x4a2a1a,
  UR: 0x4a1a3a,
};

export class GeneralCard extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private border: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private gradeText: Phaser.GameObjects.Text;
  private levelText?: Phaser.GameObjects.Text;
  private starsText?: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Text; // Using emoji as placeholder
  private config: GeneralCardConfig;
  private _selected: boolean = false;
  private general: General;

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

    const { width, height } = this.config;
    const halfW = width! / 2;
    const halfH = height! / 2;

    // Background
    this.bg = scene.add.graphics();
    this.drawBackground();
    this.add(this.bg);

    // Border
    this.border = scene.add.graphics();
    this.drawBorder();
    this.add(this.border);

    // Portrait (emoji placeholder based on class)
    const classEmoji = this.getClassEmoji(general.generalClass);
    this.portrait = scene.add.text(0, -15, classEmoji, {
      fontSize: '32px',
    }).setOrigin(0.5);
    this.add(this.portrait);

    // Grade badge
    this.gradeText = scene.add.text(-halfW + 5, -halfH + 5, general.grade, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#' + GRADE_COLORS[general.grade].toString(16).padStart(6, '0'),
      padding: { x: 3, y: 1 },
    });
    this.add(this.gradeText);

    // Name
    this.nameText = scene.add.text(0, halfH - 25, general.name, {
      fontSize: '11px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.add(this.nameText);

    // Level
    if (this.config.showLevel) {
      this.levelText = scene.add.text(halfW - 5, halfH - 10, `Lv.${general.level}`, {
        fontSize: '10px',
        color: '#aaaaaa',
      }).setOrigin(1, 1);
      this.add(this.levelText);
    }

    // Stars
    if (this.config.showStars) {
      const stars = '★'.repeat(general.stars) + '☆'.repeat(5 - general.stars);
      this.starsText = scene.add.text(0, halfH - 10, stars, {
        fontSize: '8px',
        color: '#ffd700',
      }).setOrigin(0.5, 1);
      this.add(this.starsText);
    }

    // Interactivity
    if (this.config.interactive) {
      this.setSize(width!, height!);
      this.setInteractive({ useHandCursor: true });
    }

    scene.add.existing(this);
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

  private drawBackground(): void {
    const { width, height } = this.config;
    const halfW = width! / 2;
    const halfH = height! / 2;

    this.bg.clear();
    this.bg.fillStyle(GRADE_BG_COLORS[this.general.grade], 1);
    this.bg.fillRoundedRect(-halfW, -halfH, width!, height!, 6);
  }

  private drawBorder(): void {
    const { width, height } = this.config;
    const halfW = width! / 2;
    const halfH = height! / 2;

    this.border.clear();
    const borderColor = this._selected ? 0x00ff00 : GRADE_COLORS[this.general.grade];
    const borderWidth = this._selected ? 3 : 2;
    this.border.lineStyle(borderWidth, borderColor);
    this.border.strokeRoundedRect(-halfW, -halfH, width!, height!, 6);
  }

  setSelected(selected: boolean): void {
    this._selected = selected;
    this.drawBorder();
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
    if (this.starsText) {
      const stars = '★'.repeat(this.general.stars) + '☆'.repeat(5 - this.general.stars);
      this.starsText.setText(stars);
    }
  }
}
