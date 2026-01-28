import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { FormationManager } from '../managers/FormationManager';
import { drawGradientBackground, drawPanelBackground, COLORS } from '../ui/effects';
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
  
  private formationManager!: FormationManager;
  private selectedSlotId: number = 0;
  private slotButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'StageSelectScene' });
  }

  init(data: { userId: string; clearedStages?: string[]; selectedSlotId?: number }): void {
    this.userId = data.userId;
    this.clearedStages = data.clearedStages || [];
    this.stages = stagesData.stages as StageData[];
    this.selectedSlotId = data.selectedSlotId ?? 0;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.formationManager = FormationManager.load(this.userId);
    this.selectedSlotId = this.formationManager.getActiveSlotId();

    // Background
    drawGradientBackground(this, 0, 0, width, height, 0x1a1a2e, 0x0f0f1a);

    this.createHeader(width);
    this.createSlotSelector(width);

    // Stage list container
    this.stageContainer = this.add.container(0, 170);
    this.createStageList(width);

    // Scroll handling
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      const maxScroll = Math.max(0, this.stages.length * 90 - (height - 220));
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, maxScroll);
      this.stageContainer.y = 170 - this.scrollY;
    });
  }

  private createHeader(width: number): void {
    // Header background
    drawPanelBackground(this, 0, 0, width, 80, {
      fillColor: 0x0a0a14,
      cornerRadius: 0,
      innerGlow: false,
    });

    // Back button
    new Button(this, 45, 40, '←', {
      width: 50,
      height: 40,
      fontSize: '24px',
      backgroundColor: 0x333333,
      glowOnHover: false,
    }, () => {
      this.scene.start('MainScene', { userId: this.userId, isGuest: true });
    });

    // Title (중앙)
    this.add.text(width / 2, 30, '⚔️ 스테이지 선택', {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Chapter name (중앙)
    this.add.text(width / 2, 58, '챕터 1: 황건의 난', {
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private createSlotSelector(width: number): void {
    const selectorY = 110;

    // Background
    drawPanelBackground(this, 10, selectorY - 20, width - 20, 60, {
      fillColor: 0x1a2a3a,
      borderColor: 0x2a4a5a,
      cornerRadius: 8,
    });

    // Label
    this.add.text(20, selectorY - 8, '📋 출전 진형:', {
      fontSize: '12px',
      color: '#aaaaaa',
    });

    // Slot buttons
    const slotCount = FormationManager.getMaxSlots();
    const buttonAreaWidth = width - 140;
    const buttonWidth = buttonAreaWidth / slotCount;
    const buttonStartX = 100;

    for (let i = 0; i < slotCount; i++) {
      const slot = this.formationManager.getSlot(i)!;
      const isActive = i === this.selectedSlotId;
      const isValid = slot.formation.isValid();
      
      const x = buttonStartX + i * buttonWidth + buttonWidth / 2;
      
      const btn = this.add.container(x, selectorY + 10);
      
      const bg = this.add.graphics();
      this.drawSlotButton(bg, buttonWidth - 8, 32, isActive, isValid);
      btn.add(bg);
      
      const numText = this.add.text(0, -2, `${i + 1}`, {
        fontSize: '14px',
        color: isValid ? (isActive ? '#ffd700' : '#ffffff') : '#666666',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      btn.add(numText);
      
      const unitCount = slot.formation.getUnitCount();
      const countText = this.add.text(0, 10, `(${unitCount}명)`, {
        fontSize: '9px',
        color: isValid ? '#00ff00' : '#444444',
      }).setOrigin(0.5);
      btn.add(countText);
      
      btn.setSize(buttonWidth - 8, 32);
      btn.setInteractive({ useHandCursor: isValid });
      
      if (isValid) {
        btn.on('pointerdown', () => this.selectSlot(i));
        btn.on('pointerover', () => {
          if (i !== this.selectedSlotId) {
            bg.clear();
            this.drawSlotButton(bg, buttonWidth - 8, 32, false, true, true);
          }
        });
        btn.on('pointerout', () => {
          bg.clear();
          this.drawSlotButton(bg, buttonWidth - 8, 32, i === this.selectedSlotId, true);
        });
      }
      
      btn.setData('bg', bg);
      btn.setData('numText', numText);
      btn.setData('countText', countText);
      btn.setData('slot', slot);
      
      this.slotButtons.push(btn);
    }

    // Edit formation button
    this.add.text(width - 30, selectorY + 10, '✏️', {
      fontSize: '20px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('FormationScene', { userId: this.userId }));
  }

  private drawSlotButton(graphics: Phaser.GameObjects.Graphics, width: number, height: number, isActive: boolean, isValid: boolean, isHover: boolean = false): void {
    let fillColor = 0x2a2a3e;
    let strokeColor = 0x444444;
    
    if (isValid) {
      if (isActive) {
        fillColor = 0x2a4a2a;
        strokeColor = 0x00ff00;
      } else if (isHover) {
        fillColor = 0x3a3a4e;
        strokeColor = 0x666666;
      }
    } else {
      fillColor = 0x1a1a1a;
      strokeColor = 0x333333;
    }
    
    graphics.fillStyle(fillColor, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    graphics.lineStyle(2, strokeColor);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
  }

  private selectSlot(slotId: number): void {
    const slot = this.formationManager.getSlot(slotId);
    if (!slot || !slot.formation.isValid()) return;
    
    this.selectedSlotId = slotId;
    this.formationManager.setActiveSlot(slotId);
    this.formationManager.save();
    this.formationManager.saveActiveFormationLegacy();
    
    this.refreshSlotButtons();
  }

  private refreshSlotButtons(): void {
    const width = this.cameras.main.width;
    const buttonAreaWidth = width - 140;
    const buttonWidth = buttonAreaWidth / 5;
    
    this.slotButtons.forEach((btn, i) => {
      const slot = this.formationManager.getSlot(i)!;
      const isActive = i === this.selectedSlotId;
      const isValid = slot.formation.isValid();
      
      const bg = btn.getData('bg') as Phaser.GameObjects.Graphics;
      bg.clear();
      this.drawSlotButton(bg, buttonWidth - 8, 32, isActive, isValid);
      
      const numText = btn.getData('numText') as Phaser.GameObjects.Text;
      numText.setColor(isValid ? (isActive ? '#ffd700' : '#ffffff') : '#666666');
    });
  }

  private createStageList(width: number): void {
    const cardWidth = width - 40;
    const cardX = 20;

    this.stages.forEach((stage, index) => {
      const y = index * 90;
      const isCleared = this.clearedStages.includes(stage.id);
      const isUnlocked = this.isStageUnlocked(stage);

      // Stage card background
      const cardBg = this.add.graphics();
      cardBg.fillStyle(isCleared ? 0x1a3a1a : (isUnlocked ? 0x2a2a3e : 0x1a1a1a), 1);
      cardBg.fillRoundedRect(cardX, y, cardWidth, 80, 8);
      cardBg.lineStyle(2, this.getDifficultyColor(stage.difficulty, stage.isBoss));
      cardBg.strokeRoundedRect(cardX, y, cardWidth, 80, 8);
      this.stageContainer.add(cardBg);

      // Stage ID badge
      this.stageContainer.add(
        this.add.text(cardX + 20, y + 12, stage.id, {
          fontSize: '14px',
          color: '#ffd700',
          fontStyle: 'bold',
        })
      );

      // Stage name
      this.stageContainer.add(
        this.add.text(cardX + 20, y + 32, stage.stageName, {
          fontSize: '16px',
          color: isUnlocked ? '#ffffff' : '#666666',
        })
      );

      // Difficulty badge (우측 상단)
      const diffText = stage.isBoss ? '🔥 BOSS' : stage.difficulty.toUpperCase();
      this.stageContainer.add(
        this.add.text(cardX + cardWidth - 20, y + 12, diffText, {
          fontSize: '12px',
          color: stage.isBoss ? '#ff4444' : '#aaaaaa',
        }).setOrigin(1, 0)
      );

      // Recommended power
      this.stageContainer.add(
        this.add.text(cardX + 20, y + 55, `⚔️ ${stage.recommendedPower}`, {
          fontSize: '12px',
          color: '#888888',
        })
      );

      // Rewards (중앙)
      this.stageContainer.add(
        this.add.text(width / 2, y + 55, `💰${stage.rewards.gold} 📊${stage.rewards.exp}EXP`, {
          fontSize: '12px',
          color: '#888888',
        }).setOrigin(0.5, 0)
      );

      // Status badge (우측 하단)
      if (isCleared) {
        this.stageContainer.add(
          this.add.text(cardX + cardWidth - 20, y + 55, '✅ 클리어', {
            fontSize: '12px',
            color: '#00ff00',
          }).setOrigin(1, 0)
        );
      } else if (!isUnlocked) {
        this.stageContainer.add(
          this.add.text(cardX + cardWidth - 20, y + 55, '🔒 잠김', {
            fontSize: '12px',
            color: '#666666',
          }).setOrigin(1, 0)
        );
      }

      // Make clickable if unlocked
      if (isUnlocked) {
        const hitArea = this.add.zone(width / 2, y + 40, cardWidth, 80)
          .setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => this.startBattle(stage));
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
    const slot = this.formationManager.getSlot(this.selectedSlotId);
    if (!slot || !slot.formation.isValid()) {
      this.showNoFormationWarning();
      return;
    }
    
    this.scene.start('BattleScene', {
      userId: this.userId,
      stageId: stage.id,
      stageData: stage,
      formationSlotId: this.selectedSlotId,
    });
  }

  private showNoFormationWarning(): void {
    const { width, height } = this.cameras.main;
    
    const warning = this.add.text(width / 2, height / 2, '⚠️ 선택한 진형에 장수가 없습니다!\n다른 진형을 선택하거나 편집하세요.', {
      fontSize: '16px',
      color: '#ff4444',
      backgroundColor: '#000000',
      padding: { x: 20, y: 15 },
      align: 'center',
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: warning,
      alpha: 0,
      y: height / 2 - 30,
      delay: 2000,
      duration: 500,
      onComplete: () => warning.destroy(),
    });
  }
}
