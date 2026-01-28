import Phaser from 'phaser';
import { Button } from '../ui/Button';
import stagesData from '../data/stages.json';

interface StageData {
  id: string;
  chapter: number;
  chapterName: string;
  stageName: string;
  difficulty: string;
  recommendedPower: number;
  isBoss?: boolean;
  storyText: string;
  rewards: {
    gold: number;
    exp: number;
  };
  unlockCondition: { type: string; stageId: string } | null;
}

export class StageSelectScene extends Phaser.Scene {
  private userId!: string;
  private stages: StageData[] = [];
  private clearedStages: string[] = [];
  private scrollY: number = 0;
  private stageContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'StageSelectScene' });
  }

  init(data: { userId: string; clearedStages?: string[] }): void {
    this.userId = data.userId;
    this.clearedStages = data.clearedStages || [];
    this.stages = stagesData.stages as StageData[];
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.add.graphics()
      .fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f0f1a, 0x0f0f1a, 1)
      .fillRect(0, 0, width, height);

    // Header
    this.createHeader();

    // Stage list container (scrollable)
    this.stageContainer = this.add.container(0, 100);
    this.createStageList();

    // Scroll handling
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      const maxScroll = Math.max(0, this.stages.length * 90 - (height - 150));
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, maxScroll);
      this.stageContainer.y = 100 - this.scrollY;
    });
  }

  private createHeader(): void {
    const { width } = this.cameras.main;

    // Header background
    this.add.graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(0, 0, width, 80);

    // Back button
    const backBtn = new Button(this, 50, 40, '←', {
      width: 50,
      height: 40,
      fontSize: '24px',
      backgroundColor: 0x333333,
    }, () => {
      this.scene.start('MainScene', { userId: this.userId, isGuest: true });
    });

    // Title
    this.add.text(width / 2, 30, '⚔️ 스테이지 선택', {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Chapter name
    this.add.text(width / 2, 58, '챕터 1: 황건의 난', {
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private createStageList(): void {
    const { width } = this.cameras.main;

    this.stages.forEach((stage, index) => {
      const y = index * 90;
      const isCleared = this.clearedStages.includes(stage.id);
      const isUnlocked = this.isStageUnlocked(stage);

      // Stage card background
      const cardBg = this.add.graphics();
      cardBg.fillStyle(isCleared ? 0x1a3a1a : (isUnlocked ? 0x2a2a3e : 0x1a1a1a), 1);
      cardBg.fillRoundedRect(20, y, width - 40, 80, 8);
      cardBg.lineStyle(2, this.getDifficultyColor(stage.difficulty, stage.isBoss));
      cardBg.strokeRoundedRect(20, y, width - 40, 80, 8);

      // Stage ID badge
      this.add.text(40, y + 12, stage.id, {
        fontSize: '14px',
        color: '#ffd700',
        fontStyle: 'bold',
      });

      // Stage name
      this.add.text(40, y + 32, stage.stageName, {
        fontSize: '16px',
        color: isUnlocked ? '#ffffff' : '#666666',
      });

      // Difficulty badge
      const diffText = stage.isBoss ? '🔥 BOSS' : stage.difficulty.toUpperCase();
      this.add.text(width - 60, y + 12, diffText, {
        fontSize: '12px',
        color: stage.isBoss ? '#ff4444' : '#aaaaaa',
      }).setOrigin(1, 0);

      // Recommended power
      this.add.text(40, y + 55, `⚔️ ${stage.recommendedPower}`, {
        fontSize: '12px',
        color: '#888888',
      });

      // Rewards
      this.add.text(150, y + 55, `💰${stage.rewards.gold} 📊${stage.rewards.exp}EXP`, {
        fontSize: '12px',
        color: '#888888',
      });

      // Cleared badge
      if (isCleared) {
        this.add.text(width - 60, y + 55, '✅ 클리어', {
          fontSize: '12px',
          color: '#00ff00',
        }).setOrigin(1, 0);
      } else if (!isUnlocked) {
        this.add.text(width - 60, y + 55, '🔒 잠김', {
          fontSize: '12px',
          color: '#666666',
        }).setOrigin(1, 0);
      }

      // Add to container
      this.stageContainer.add(cardBg);

      // Make clickable if unlocked
      if (isUnlocked) {
        const hitArea = this.add.zone(width / 2, y + 40, width - 40, 80)
          .setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => {
          this.startBattle(stage);
        });

        this.stageContainer.add(hitArea);
      }
    });
  }

  private isStageUnlocked(stage: StageData): boolean {
    if (!stage.unlockCondition) return true;
    if (stage.unlockCondition.type === 'clear') {
      return this.clearedStages.includes(stage.unlockCondition.stageId);
    }
    return false;
  }

  private getDifficultyColor(difficulty: string, isBoss?: boolean): number {
    if (isBoss) return 0xff4444;
    switch (difficulty) {
      case 'normal': return 0x00aa00;
      case 'hard': return 0xffaa00;
      case 'boss': return 0xff4444;
      default: return 0x888888;
    }
  }

  private startBattle(stage: StageData): void {
    this.scene.start('BattleScene', {
      userId: this.userId,
      stageId: stage.id,
      stageData: stage,
    });
  }
}
