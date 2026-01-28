import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { GeneralCard } from '../ui/GeneralCard';
import { Viewport, Scrollbar, Row } from '../ui/layout';
import { General, GeneralGrade, GeneralClass, Faction } from '../entities/General';
import { Formation, Position } from '../entities/Formation';
import generalsData from '../data/generals.json';

interface OwnedGeneral {
  id: string;
  level: number;
  stars: number;
  exp: number;
}

export class FormationScene extends Phaser.Scene {
  private userId!: string;
  private formation!: Formation;
  private ownedGenerals: General[] = [];
  private generalMap: Map<string, General> = new Map();
  private gridCells: Phaser.GameObjects.Container[] = [];
  private selectedSlot: { row: number; col: number } | null = null;
  
  // Layout components
  private generalListViewport!: Viewport;
  private generalListScrollbar!: Scrollbar;
  private generalCards: GeneralCard[] = [];

  constructor() {
    super({ key: 'FormationScene' });
  }

  init(data: { userId: string }): void {
    this.userId = data.userId;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    this.add.graphics()
      .fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f0f1a, 0x0f0f1a, 1)
      .fillRect(0, 0, width, height);

    // Load data
    this.loadOwnedGenerals();
    this.loadFormation();

    // Header
    this.createHeader();

    // Formation grid
    this.createFormationGrid();

    // General list with Viewport + Scrollbar
    this.createGeneralList();

    // Save button
    new Button(this, width / 2, height - 40, '💾 진형 저장', {
      width: 200,
      height: 44,
      backgroundColor: 0x006600,
    }, () => this.saveFormation());
  }

  private createHeader(): void {
    const { width } = this.cameras.main;

    this.add.graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(0, 0, width, 70);

    new Button(this, 50, 35, '←', {
      width: 50,
      height: 40,
      fontSize: '24px',
      backgroundColor: 0x333333,
    }, () => {
      this.scene.start('MainScene', { userId: this.userId, isGuest: true });
    });

    this.add.text(width / 2, 25, '⚔️ 진형 편집', {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 52, '장수를 그리드에 배치하세요', {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private loadOwnedGenerals(): void {
    const savedKey = `ownedGenerals_${this.userId}`;
    const saved = localStorage.getItem(savedKey);
    
    let ownedList: OwnedGeneral[] = [];
    
    if (saved) {
      ownedList = JSON.parse(saved);
    } else {
      ownedList = [
        { id: 'zhang_song', level: 1, stars: 1, exp: 0 },
        { id: 'mi_zhu', level: 1, stars: 1, exp: 0 },
        { id: 'sun_qian', level: 1, stars: 1, exp: 0 },
      ];
    }

    this.ownedGenerals = ownedList.map(owned => {
      const data = generalsData.generals.find(g => g.id === owned.id);
      if (!data) return null;

      const general = new General({
        id: data.id,
        name: data.name,
        grade: data.grade as GeneralGrade,
        generalClass: data.class as GeneralClass,
        faction: data.faction as Faction,
        baseStats: data.baseStats as any,
        level: owned.level,
        stars: owned.stars,
        exp: owned.exp,
      });

      this.generalMap.set(data.id, general);
      return general;
    }).filter((g): g is General => g !== null);
  }

  private loadFormation(): void {
    const savedKey = `formation_${this.userId}`;
    const saved = localStorage.getItem(savedKey);
    
    if (saved) {
      const json = JSON.parse(saved);
      this.formation = Formation.fromJSON(json);
    } else {
      this.formation = new Formation(this.userId);
      // Place default generals
      if (this.ownedGenerals.length > 0) {
        this.formation.placeUnit(this.ownedGenerals[0].id, 2, 1);
      }
      if (this.ownedGenerals.length > 1) {
        this.formation.placeUnit(this.ownedGenerals[1].id, 1, 0);
      }
      if (this.ownedGenerals.length > 2) {
        this.formation.placeUnit(this.ownedGenerals[2].id, 1, 2);
      }
    }
  }

  private createFormationGrid(): void {
    const { width } = this.cameras.main;
    const gridSize = 3;
    const cellSize = 95;
    const gridWidth = gridSize * cellSize;
    const startX = (width - gridWidth) / 2;
    const startY = 100;

    // Row labels
    const rowLabels = ['후열', '중열', '전열'];

    for (let row = 0; row < gridSize; row++) {
      // Row label
      this.add.text(startX - 40, startY + row * cellSize + cellSize / 2, rowLabels[row], {
        fontSize: '12px',
        color: '#888888',
      }).setOrigin(0.5);

      for (let col = 0; col < gridSize; col++) {
        const x = startX + col * cellSize + cellSize / 2;
        const y = startY + row * cellSize + cellSize / 2;

        const cell = this.add.container(x, y);
        
        // Cell background
        const bg = this.add.graphics();
        bg.fillStyle(0x2a2a3e, 1);
        bg.fillRoundedRect(-cellSize / 2 + 4, -cellSize / 2 + 4, cellSize - 8, cellSize - 8, 8);
        bg.lineStyle(2, 0x444444);
        bg.strokeRoundedRect(-cellSize / 2 + 4, -cellSize / 2 + 4, cellSize - 8, cellSize - 8, 8);
        cell.add(bg);

        // Cell index (for reference)
        const idx = this.add.text(0, 0, '+', {
          fontSize: '24px',
          color: '#333333',
        }).setOrigin(0.5);
        cell.add(idx);

        // Make interactive
        cell.setSize(cellSize - 8, cellSize - 8);
        cell.setInteractive({ useHandCursor: true, dropZone: true });
        
        cell.on('pointerdown', () => this.onCellClick(row, col));
        cell.setData('row', row);
        cell.setData('col', col);

        this.gridCells.push(cell);

        // Place existing unit if any
        const generalId = this.formation.getUnitAt(row, col);
        if (generalId) {
          const general = this.generalMap.get(generalId);
          if (general) {
            this.placeCardInCell(cell, general);
          }
        }
      }
    }

    // Total power display
    this.updatePowerDisplay();
  }

  private placeCardInCell(cell: Phaser.GameObjects.Container, general: General): void {
    // Remove existing card if any
    const existingCard = cell.getData('card') as GeneralCard | undefined;
    if (existingCard) {
      existingCard.destroy();
    }

    // Clear the '+' sign
    cell.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Text && (child as Phaser.GameObjects.Text).text === '+') {
        child.setVisible(false);
      }
    });

    const card = new GeneralCard(this, 0, 0, general, {
      width: 75,
      height: 85,
      showLevel: true,
      showStars: false,
      interactive: false,
    });
    cell.add(card);
    cell.setData('card', card);
  }

  private removeCardFromCell(cell: Phaser.GameObjects.Container): void {
    const existingCard = cell.getData('card') as GeneralCard | undefined;
    if (existingCard) {
      existingCard.destroy();
      cell.setData('card', null);
    }

    // Show '+' sign again
    cell.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Text && (child as Phaser.GameObjects.Text).text === '+') {
        child.setVisible(true);
      }
    });
  }

  private onCellClick(row: number, col: number): void {
    const generalId = this.formation.getUnitAt(row, col);
    
    if (generalId) {
      // Remove unit from formation
      this.formation.removeUnit(row, col);
      const cell = this.gridCells[row * 3 + col];
      this.removeCardFromCell(cell);
      this.updatePowerDisplay();
      this.refreshGeneralList();
    } else {
      // Mark as selected for placing
      this.selectedSlot = { row, col };
      this.highlightSelectedSlot();
    }
  }

  private highlightSelectedSlot(): void {
    this.gridCells.forEach((cell, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const isSelected = this.selectedSlot?.row === row && this.selectedSlot?.col === col;
      
      const bg = cell.getAt(0) as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(isSelected ? 0x004400 : 0x2a2a3e, 1);
      bg.fillRoundedRect(-43, -43, 87, 87, 8);
      bg.lineStyle(2, isSelected ? 0x00ff00 : 0x444444);
      bg.strokeRoundedRect(-43, -43, 87, 87, 8);
    });
  }

  private createGeneralList(): void {
    const { width, height } = this.cameras.main;
    const listY = 420;
    const listHeight = height - listY - 90;
    
    // Background
    this.add.graphics()
      .fillStyle(0x000000, 0.6)
      .fillRect(0, listY - 30, width, height - listY + 30);

    // Title
    this.add.text(20, listY - 20, '📜 보유 장수', {
      fontSize: '14px',
      color: '#ffd700',
    });

    // Viewport for scrollable general list
    this.generalListViewport = new Viewport(this, {
      x: 10,
      y: listY,
      width: width - 40,
      height: listHeight,
    });

    // Scrollbar
    this.generalListScrollbar = new Scrollbar(this, this.generalListViewport, {
      x: width - 25,
      y: listY,
      width: 12,
      height: listHeight,
      trackColor: 0x333333,
      barColor: 0x888888,
    });

    // Enable mouse wheel scroll
    this.generalListViewport.enableMouseWheelScroll(40);
    this.generalListScrollbar.syncWithViewport();

    this.refreshGeneralList();
  }

  private refreshGeneralList(): void {
    const { width } = this.cameras.main;
    
    // Clear existing cards
    this.generalListViewport.clearContent();
    this.generalCards = [];

    const cols = 4;
    const cardWidth = 80;
    const cardHeight = 100;
    const viewportWidth = width - 40;
    const spacing = (viewportWidth - cols * cardWidth) / (cols + 1);

    // Filter out generals already in formation
    const availableGenerals = this.ownedGenerals.filter(g => !this.formation.hasUnit(g.id));

    // Create cards in rows
    const rows = Math.ceil(availableGenerals.length / cols);
    const contentContainer = this.generalListViewport.getContent();

    availableGenerals.forEach((general, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = spacing + cardWidth / 2 + col * (cardWidth + spacing);
      const y = row * (cardHeight + 10) + cardHeight / 2;

      const card = new GeneralCard(this, x, y, general, {
        width: cardWidth,
        height: cardHeight,
      });

      card.on('pointerdown', () => this.onGeneralSelect(general));

      contentContainer.add(card);
      this.generalCards.push(card);
    });

    // Update content height and scrollbar
    const totalHeight = rows * (cardHeight + 10) + 20;
    this.generalListViewport.setContentHeight(totalHeight);
    this.generalListScrollbar.refresh();
  }

  private onGeneralSelect(general: General): void {
    if (!this.selectedSlot) {
      // Auto-select first empty slot
      for (let row = 2; row >= 0; row--) {
        for (let col = 0; col < 3; col++) {
          if (!this.formation.getUnitAt(row, col)) {
            this.selectedSlot = { row, col };
            break;
          }
        }
        if (this.selectedSlot) break;
      }
    }

    if (this.selectedSlot) {
      const { row, col } = this.selectedSlot;
      
      if (this.formation.placeUnit(general.id, row, col)) {
        const cell = this.gridCells[row * 3 + col];
        this.placeCardInCell(cell, general);
        this.selectedSlot = null;
        this.highlightSelectedSlot();
        this.updatePowerDisplay();
        this.refreshGeneralList();
      }
    }
  }

  private updatePowerDisplay(): void {
    const { width } = this.cameras.main;
    
    // Calculate total power
    let totalPower = 0;
    this.formation.getAllUnits().forEach(generalId => {
      const general = this.generalMap.get(generalId);
      if (general) {
        totalPower += general.combatPower;
      }
    });

    // Update or create power text
    const powerTextKey = 'powerText';
    let powerText = this.children.getByName(powerTextKey) as Phaser.GameObjects.Text;
    
    if (!powerText) {
      powerText = this.add.text(width - 20, 390, '', {
        fontSize: '16px',
        color: '#ffd700',
      }).setOrigin(1, 0.5);
      powerText.setName(powerTextKey);
    }
    
    powerText.setText(`⚡ 총 전투력: ${totalPower}`);
  }

  private saveFormation(): void {
    const json = this.formation.toJSON();
    localStorage.setItem(`formation_${this.userId}`, JSON.stringify(json));

    // Show save confirmation
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 2, '✅ 진형이 저장되었습니다!', {
      fontSize: '20px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: height / 2 - 50,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }
}
