import Phaser from 'phaser';
import { BattleManager, BattleState } from '../managers/BattleManager';
import { GameManager } from '../managers/GameManager';
import { Formation } from '../entities/Formation';
import { FormationManager } from '../managers/FormationManager';
import { Button } from '../ui/Button';
import stagesData from '../data/stages.json';
import generalsData from '../data/generals.json';

interface StageData {
  id: string;
  stageName: string;
  chapterName: string;
  storyText: string;
  enemies: Array<{
    generalId: string;
    level: number;
    position: { row: number; col: number };
  }>;
  rewards: {
    gold: number;
    exp: number;
  };
  isBoss?: boolean;
}

export class BattleScene extends Phaser.Scene {
  private battleManager!: BattleManager;
  private gameManager!: GameManager;
  private userId!: string;
  private stageId!: string;
  private stageData!: StageData;
  private formation!: Formation;
  private formationSlotId?: number;

  // UI containers for units
  private playerUnitContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private enemyUnitContainers: Map<string, Phaser.GameObjects.Container> = new Map();

  // Speed button
  private speedBtn!: Phaser.GameObjects.Text;
  private currentSpeed: number = 1;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { userId: string; stageId: string; stageData?: StageData; formationSlotId?: number }): void {
    this.userId = data.userId;
    this.stageId = data.stageId;
    this.formationSlotId = data.formationSlotId;
    
    // Load stage data
    if (data.stageData) {
      this.stageData = data.stageData;
    } else {
      const stage = stagesData.stages.find(s => s.id === data.stageId);
      if (stage) {
        this.stageData = stage as unknown as StageData;
      }
    }
  }

  create(): void {
    this.gameManager = GameManager.getInstance();
    this.battleManager = new BattleManager(this);
    this.battleManager.setGameManager(this.gameManager);

    // Load player formation (선택된 슬롯 또는 활성 슬롯 사용)
    this.loadFormation();

    // Create UI
    this.createBattleUI();
    this.createUnits();

    // Show stage story
    this.showStoryText();

    // Start battle after delay
    this.time.delayedCall(2000, () => {
      if (this.formation.isValid()) {
        this.battleManager.startBattle(this.formation, this.stageId);
      } else {
        this.showNoFormationError();
      }
    });
  }

  private loadFormation(): void {
    // FormationManager를 통해 진형 로드
    const formationManager = FormationManager.load(this.userId);
    
    // 전달된 슬롯 ID가 있으면 해당 슬롯 사용, 아니면 활성 슬롯 사용
    if (this.formationSlotId !== undefined) {
      const slot = formationManager.getSlot(this.formationSlotId);
      if (slot && slot.formation.isValid()) {
        this.formation = slot.formation;
        return;
      }
    }
    
    // 활성 슬롯 사용
    const activeSlot = formationManager.getActiveSlot();
    if (activeSlot.formation.isValid()) {
      this.formation = activeSlot.formation;
      return;
    }
    
    // 폴백: 기존 레거시 형식 시도
    const savedKey = `formation_${this.userId}`;
    const saved = localStorage.getItem(savedKey);
    
    if (saved) {
      const json = JSON.parse(saved);
      this.formation = Formation.fromJSON(json);
      return;
    }
    
    // 최종 폴백: 기본 진형 생성
    this.formation = new Formation(this.userId);
    const ownedKey = `ownedGenerals_${this.userId}`;
    const ownedSaved = localStorage.getItem(ownedKey);
    
    if (ownedSaved) {
      const owned = JSON.parse(ownedSaved);
      if (owned.length > 0) this.formation.placeUnit(owned[0].id, 2, 1);
      if (owned.length > 1) this.formation.placeUnit(owned[1].id, 1, 0);
      if (owned.length > 2) this.formation.placeUnit(owned[2].id, 1, 2);
    }
  }

  private showStoryText(): void {
    if (!this.stageData) return;

    const { width, height } = this.cameras.main;
    
    const storyBg = this.add.graphics();
    storyBg.fillStyle(0x000000, 0.8);
    storyBg.fillRoundedRect(30, height / 2 - 50, width - 60, 100, 10);

    const storyText = this.add.text(width / 2, height / 2, this.stageData.storyText, {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: width - 80 },
      align: 'center',
    }).setOrigin(0.5);

    // Fade out after 2 seconds
    this.tweens.add({
      targets: [storyBg, storyText],
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => {
        storyBg.destroy();
        storyText.destroy();
      },
    });
  }

  private showNoFormationError(): void {
    const { width, height } = this.cameras.main;
    
    this.add.text(width / 2, height / 2, '⚠️ 진형에 장수가 없습니다!\n진형 편집에서 장수를 배치하세요.', {
      fontSize: '18px',
      color: '#ff4444',
      align: 'center',
    }).setOrigin(0.5);

    new Button(this, width / 2, height / 2 + 80, '진형 편집으로', {
      width: 200,
      height: 44,
    }, () => {
      this.scene.start('FormationScene', { userId: this.userId });
    });
  }

  private createBattleUI(): void {
    const { width, height } = this.cameras.main;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2d1b4e, 0x2d1b4e, 0x1a0f2e, 0x1a0f2e, 1);
    bg.fillRect(0, 0, width, height);

    // Header
    this.add.graphics()
      .fillStyle(0x000000, 0.7)
      .fillRect(0, 0, width, 70);

    // Stage info
    const stageName = this.stageData?.stageName ?? this.stageId;
    const chapterName = this.stageData?.chapterName ?? '';
    
    this.add.text(width / 2, 25, stageName, {
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 50, chapterName, {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Battle area divider
    this.add.graphics()
      .lineStyle(2, 0x444444)
      .lineBetween(0, 400, width, 400);

    // Labels
    this.add.text(30, 110, '👹 적군', { fontSize: '14px', color: '#ff4444' });
    this.add.text(30, 420, '⚔️ 아군', { fontSize: '14px', color: '#00ff00' });

    // Speed button
    this.createSpeedButton();

    // Back button
    this.createBackButton();

    // Auto button
    this.add.text(width - 80, 55, '🤖 AUTO', {
      fontSize: '12px',
      color: '#00ffff',
    }).setOrigin(0.5);
  }

  private createUnits(): void {
    const { width } = this.cameras.main;

    // Grid positions
    const cellWidth = 100;
    const cellHeight = 80;
    const startX = (width - 3 * cellWidth) / 2 + cellWidth / 2;

    // Enemy positions (rows 0-2 from top)
    const enemyStartY = 150;
    
    // Player positions (rows 0-2 from top, but visually bottom)
    const playerStartY = 450;

    // Create enemy units from stage data
    if (this.stageData?.enemies) {
      this.stageData.enemies.forEach(enemy => {
        const enemyData = stagesData.enemyGenerals.find(g => g.id === enemy.generalId);
        if (enemyData) {
          const x = startX + enemy.position.col * cellWidth;
          const y = enemyStartY + enemy.position.row * cellHeight;
          const container = this.createUnit(x, y, enemyData.name, '👹', false, enemy.level);
          this.enemyUnitContainers.set(`${enemy.position.row}_${enemy.position.col}`, container);
        }
      });
    }

    // Create player units from formation
    const formationData = this.formation.toJSON();
    formationData.positions.forEach(pos => {
      const generalData = generalsData.generals.find(g => g.id === pos.generalId);
      if (generalData) {
        const x = startX + pos.col * cellWidth;
        // Flip row for player (row 0 = front = bottom visually)
        const visualRow = 2 - pos.row;
        const y = playerStartY + visualRow * cellHeight;
        const emoji = this.getClassEmoji(generalData.class);
        const container = this.createUnit(x, y, generalData.name, emoji, true, 1);
        this.playerUnitContainers.set(`${pos.row}_${pos.col}`, container);
      }
    });
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

  private createUnit(x: number, y: number, name: string, emoji: string, isAlly: boolean, level: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // Unit background
    const bg = this.add.graphics();
    bg.fillStyle(isAlly ? 0x004400 : 0x440000, 1);
    bg.fillCircle(0, 0, 32);
    bg.lineStyle(2, isAlly ? 0x00ff00 : 0xff0000);
    bg.strokeCircle(0, 0, 32);

    // Unit icon
    const icon = this.add.text(0, -3, emoji, { fontSize: '28px' }).setOrigin(0.5);

    // HP bar background
    const hpBgWidth = 50;
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x333333, 1);
    hpBg.fillRect(-hpBgWidth / 2, 36, hpBgWidth, 6);

    // HP bar
    const hpBar = this.add.graphics();
    hpBar.fillStyle(0x00ff00, 1);
    hpBar.fillRect(-hpBgWidth / 2, 36, hpBgWidth, 6);

    // Name
    const nameText = this.add.text(0, 50, name, {
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Level badge
    const lvText = this.add.text(25, -30, `${level}`, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5);

    container.add([bg, icon, hpBg, hpBar, nameText, lvText]);
    container.setData('hpBar', hpBar);
    container.setData('hpBgWidth', hpBgWidth);
    container.setData('hp', 100);
    container.setData('maxHp', 100);
    container.setData('isAlive', true);

    return container;
  }

  private createSpeedButton(): void {
    this.speedBtn = this.add.text(400, 30, `${this.currentSpeed}x`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.speedBtn.on('pointerdown', () => {
      this.currentSpeed = this.currentSpeed === 1 ? 2 : this.currentSpeed === 2 ? 4 : 1;
      this.speedBtn.setText(`${this.currentSpeed}x`);
      this.battleManager.setSpeed(this.currentSpeed);
    });
  }

  private createBackButton(): void {
    const btn = this.add.text(50, 30, '← 포기', {
      fontSize: '14px',
      color: '#888888',
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.scene.start('StageSelectScene', { 
        userId: this.userId,
        clearedStages: this.gameManager.getUserData()?.clearedStages ?? [],
      });
    });
  }

  update(time: number, delta: number): void {
    this.battleManager.update(delta);
    this.updateUnitDisplays();
  }

  private updateUnitDisplays(): void {
    // Update player units
    const playerUnits = this.battleManager.getPlayerUnits();
    playerUnits.forEach(unit => {
      const key = `${unit.position.row}_${unit.position.col}`;
      const container = this.playerUnitContainers.get(key);
      if (container) {
        this.updateUnitHP(container, unit.stats.currentHp, unit.stats.maxHp, unit.isAlive);
      }
    });

    // Update enemy units
    const enemyUnits = this.battleManager.getEnemyUnits();
    enemyUnits.forEach(unit => {
      const key = `${unit.position.row}_${unit.position.col}`;
      const container = this.enemyUnitContainers.get(key);
      if (container) {
        this.updateUnitHP(container, unit.stats.currentHp, unit.stats.maxHp, unit.isAlive);
      }
    });
  }

  private updateUnitHP(container: Phaser.GameObjects.Container, currentHp: number, maxHp: number, isAlive: boolean): void {
    const hpBar = container.getData('hpBar') as Phaser.GameObjects.Graphics;
    const hpBgWidth = container.getData('hpBgWidth') as number;

    if (hpBar) {
      hpBar.clear();
      
      if (!isAlive) {
        container.setAlpha(0.3);
        return;
      }

      const hpPercent = currentHp / maxHp;
      const color = hpPercent > 0.5 ? 0x00ff00 : hpPercent > 0.25 ? 0xffff00 : 0xff0000;
      
      hpBar.fillStyle(color, 1);
      hpBar.fillRect(-hpBgWidth / 2, 36, hpBgWidth * hpPercent, 6);
    }
  }
}
