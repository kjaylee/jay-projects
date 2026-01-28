import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { GeneralCard } from '../ui/GeneralCard';
import { Viewport, Scrollbar } from '../ui/layout';
import { General, GeneralGrade, GeneralClass, Faction } from '../entities/General';
import { Formation } from '../entities/Formation';
import { FormationManager } from '../managers/FormationManager';
import { drawGradientBackground, drawPanelBackground, COLORS } from '../ui/effects';
import generalsData from '../data/generals.json';

interface OwnedGeneral {
  id: string;
  level: number;
  stars: number;
  exp: number;
}

export class FormationScene extends Phaser.Scene {
  private userId!: string;
  private formationManager!: FormationManager;
  private ownedGenerals: General[] = [];
  private generalMap: Map<string, General> = new Map();
  private gridCells: Phaser.GameObjects.Container[] = [];
  private selectedSlot: { row: number; col: number } | null = null;
  
  // Slot tabs
  private slotTabs: Phaser.GameObjects.Container[] = [];
  private slotNameTexts: Phaser.GameObjects.Text[] = [];
  
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
    drawGradientBackground(this, 0, 0, width, height, 0x1a1a2e, 0x0f0f1a);

    this.loadOwnedGenerals();
    this.formationManager = FormationManager.load(this.userId);

    this.createHeader(width);
    this.createSlotTabs(width);
    this.createFormationGrid(width);
    this.createGeneralList(width, height);

    // Save button (중앙)
    new Button(this, width / 2, height - 40, '💾 진형 저장', {
      width: 200,
      height: 44,
      variant: 'gold',
    }, () => this.saveFormation());
  }

  private createHeader(width: number): void {
    // Header background
    drawPanelBackground(this, 0, 0, width, 70, {
      fillColor: 0x0a0a14,
      cornerRadius: 0,
      innerGlow: false,
    });

    // Back button
    new Button(this, 45, 35, '←', {
      width: 50,
      height: 40,
      fontSize: '24px',
      variant: 'dark',
      useImage: false,
    }, () => {
      this.scene.start('MainScene', { userId: this.userId, isGuest: true });
    });

    // Title (중앙)
    this.add.text(width / 2, 25, '⚔️ 진형 편집', {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle (중앙)
    this.add.text(width / 2, 52, '장수를 그리드에 배치하세요', {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private createSlotTabs(width: number): void {
    const tabY = 95;
    const tabCount = 5;
    const tabTotalWidth = width - 60;
    const tabWidth = tabTotalWidth / tabCount;
    const tabHeight = 40;
    const startX = 30;

    for (let i = 0; i < tabCount; i++) {
      const x = startX + i * tabWidth + tabWidth / 2;
      const isActive = i === this.formationManager.getActiveSlotId();
      
      const tab = this.add.container(x, tabY);
      
      const bg = this.add.graphics();
      this.drawTabBackground(bg, tabWidth, tabHeight, isActive);
      tab.add(bg);
      
      const badge = this.add.text(-tabWidth / 2 + 12, 0, `${i + 1}`, {
        fontSize: '14px',
        color: isActive ? '#ffd700' : '#888888',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      tab.add(badge);
      
      const slot = this.formationManager.getSlot(i)!;
      const nameText = this.add.text(6, 0, this.truncateName(slot.slotName, 6), {
        fontSize: '12px',
        color: isActive ? '#ffffff' : '#aaaaaa',
      }).setOrigin(0.5);
      tab.add(nameText);
      this.slotNameTexts.push(nameText);
      
      const unitCount = slot.formation.getUnitCount();
      const countText = this.add.text(tabWidth / 2 - 14, 0, `[${unitCount}]`, {
        fontSize: '10px',
        color: unitCount > 0 ? '#00ff00' : '#666666',
      }).setOrigin(0.5);
      tab.add(countText);
      
      tab.setSize(tabWidth - 4, tabHeight);
      tab.setInteractive({ useHandCursor: true });
      
      tab.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown() || pointer.rightButtonReleased()) {
          this.editSlotName(i);
        } else {
          this.switchSlot(i);
        }
      });
      
      this.slotTabs.push(tab);
      tab.setData('badge', badge);
      tab.setData('nameText', nameText);
      tab.setData('countText', countText);
      tab.setData('bg', bg);
    }

    // Edit name button
    this.add.text(width - 30, tabY, '✏️', {
      fontSize: '18px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.editSlotName(this.formationManager.getActiveSlotId()));
  }

  private drawTabBackground(graphics: Phaser.GameObjects.Graphics, width: number, height: number, isActive: boolean): void {
    graphics.clear();
    graphics.fillStyle(isActive ? 0x2a4a2a : 0x1a1a2e, 1);
    graphics.fillRoundedRect(-width / 2 + 2, -height / 2, width - 4, height, 6);
    graphics.lineStyle(2, isActive ? 0x00ff00 : 0x333333);
    graphics.strokeRoundedRect(-width / 2 + 2, -height / 2, width - 4, height, 6);
  }

  private truncateName(name: string, maxLen: number): string {
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen - 1) + '…';
  }

  private switchSlot(slotId: number): void {
    if (slotId === this.formationManager.getActiveSlotId()) return;
    
    this.formationManager.setActiveSlot(slotId);
    this.refreshSlotTabs();
    this.refreshFormationGrid();
    this.refreshGeneralList();
    this.updatePowerDisplay();
  }

  private refreshSlotTabs(): void {
    const tabTotalWidth = this.cameras.main.width - 60;
    const tabWidth = tabTotalWidth / 5;
    const tabHeight = 40;
    
    this.slotTabs.forEach((tab, i) => {
      const isActive = i === this.formationManager.getActiveSlotId();
      const slot = this.formationManager.getSlot(i)!;
      
      const bg = tab.getData('bg') as Phaser.GameObjects.Graphics;
      this.drawTabBackground(bg, tabWidth, tabHeight, isActive);
      
      const badge = tab.getData('badge') as Phaser.GameObjects.Text;
      badge.setColor(isActive ? '#ffd700' : '#888888');
      
      const nameText = tab.getData('nameText') as Phaser.GameObjects.Text;
      nameText.setText(this.truncateName(slot.slotName, 6));
      nameText.setColor(isActive ? '#ffffff' : '#aaaaaa');
      
      const countText = tab.getData('countText') as Phaser.GameObjects.Text;
      const unitCount = slot.formation.getUnitCount();
      countText.setText(`[${unitCount}]`);
      countText.setColor(unitCount > 0 ? '#00ff00' : '#666666');
    });
  }

  private editSlotName(slotId: number): void {
    const slot = this.formationManager.getSlot(slotId);
    if (!slot) return;
    
    const currentName = slot.slotName;
    const newName = window.prompt('슬롯 이름을 입력하세요 (최대 20자):', currentName);
    
    if (newName !== null && newName.trim().length > 0) {
      if (this.formationManager.setSlotName(slotId, newName)) {
        this.refreshSlotTabs();
      }
    }
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

  private getCurrentFormation(): Formation {
    return this.formationManager.getActiveFormation();
  }

  private createFormationGrid(width: number): void {
    const gridSize = 3;
    const cellSize = 95;
    const gridWidth = gridSize * cellSize;
    const startX = (width - gridWidth) / 2;
    const startY = 140;

    const rowLabels = ['후열', '중열', '전열'];

    for (let row = 0; row < gridSize; row++) {
      // Row label (그리드 왼쪽)
      this.add.text(startX - 35, startY + row * cellSize + cellSize / 2, rowLabels[row], {
        fontSize: '12px',
        color: '#888888',
      }).setOrigin(0.5);

      for (let col = 0; col < gridSize; col++) {
        const x = startX + col * cellSize + cellSize / 2;
        const y = startY + row * cellSize + cellSize / 2;

        const cell = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x2a2a3e, 1);
        bg.fillRoundedRect(-cellSize / 2 + 4, -cellSize / 2 + 4, cellSize - 8, cellSize - 8, 8);
        bg.lineStyle(2, 0x444444);
        bg.strokeRoundedRect(-cellSize / 2 + 4, -cellSize / 2 + 4, cellSize - 8, cellSize - 8, 8);
        cell.add(bg);

        const idx = this.add.text(0, 0, '+', {
          fontSize: '24px',
          color: '#333333',
        }).setOrigin(0.5);
        cell.add(idx);

        cell.setSize(cellSize - 8, cellSize - 8);
        cell.setInteractive({ useHandCursor: true, dropZone: true });
        
        cell.on('pointerdown', () => this.onCellClick(row, col));
        cell.setData('row', row);
        cell.setData('col', col);

        this.gridCells.push(cell);

        const formation = this.getCurrentFormation();
        const generalId = formation.getUnitAt(row, col);
        if (generalId) {
          const general = this.generalMap.get(generalId);
          if (general) {
            this.placeCardInCell(cell, general);
          }
        }
      }
    }

    this.updatePowerDisplay();
  }

  private refreshFormationGrid(): void {
    const formation = this.getCurrentFormation();
    
    this.gridCells.forEach((cell, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      
      this.removeCardFromCell(cell);
      
      const generalId = formation.getUnitAt(row, col);
      if (generalId) {
        const general = this.generalMap.get(generalId);
        if (general) {
          this.placeCardInCell(cell, general);
        }
      }
    });
    
    this.selectedSlot = null;
    this.highlightSelectedSlot();
  }

  private placeCardInCell(cell: Phaser.GameObjects.Container, general: General): void {
    const existingCard = cell.getData('card') as GeneralCard | undefined;
    if (existingCard) {
      existingCard.destroy();
    }

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

    cell.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Text && (child as Phaser.GameObjects.Text).text === '+') {
        child.setVisible(true);
      }
    });
  }

  private onCellClick(row: number, col: number): void {
    const formation = this.getCurrentFormation();
    const generalId = formation.getUnitAt(row, col);
    
    if (generalId) {
      formation.removeUnit(row, col);
      const cell = this.gridCells[row * 3 + col];
      this.removeCardFromCell(cell);
      this.updatePowerDisplay();
      this.refreshGeneralList();
      this.refreshSlotTabs();
    } else {
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

  private createGeneralList(width: number, height: number): void {
    const listY = 450;
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

    this.generalListViewport = new Viewport(this, {
      x: 10,
      y: listY,
      width: width - 40,
      height: listHeight,
    });

    this.generalListScrollbar = new Scrollbar(this, this.generalListViewport, {
      x: width - 25,
      y: listY,
      width: 12,
      height: listHeight,
      trackColor: 0x333333,
      barColor: 0x888888,
    });

    this.generalListViewport.enableMouseWheelScroll(40);
    this.generalListScrollbar.syncWithViewport();

    this.refreshGeneralList();
  }

  private refreshGeneralList(): void {
    const width = this.cameras.main.width;
    
    this.generalListViewport.clearContent();
    this.generalCards = [];

    const cols = 4;
    const cardWidth = 80;
    const cardHeight = 100;
    const viewportWidth = width - 40;
    const spacing = (viewportWidth - cols * cardWidth) / (cols + 1);

    const formation = this.getCurrentFormation();
    const availableGenerals = this.ownedGenerals.filter(g => !formation.hasUnit(g.id));

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

    const totalHeight = rows * (cardHeight + 10) + 20;
    this.generalListViewport.setContentHeight(totalHeight);
    this.generalListScrollbar.refresh();
  }

  private onGeneralSelect(general: General): void {
    const formation = this.getCurrentFormation();
    
    if (!this.selectedSlot) {
      for (let row = 2; row >= 0; row--) {
        for (let col = 0; col < 3; col++) {
          if (!formation.getUnitAt(row, col)) {
            this.selectedSlot = { row, col };
            break;
          }
        }
        if (this.selectedSlot) break;
      }
    }

    if (this.selectedSlot) {
      const { row, col } = this.selectedSlot;
      
      if (formation.placeUnit(general.id, row, col)) {
        const cell = this.gridCells[row * 3 + col];
        this.placeCardInCell(cell, general);
        this.selectedSlot = null;
        this.highlightSelectedSlot();
        this.updatePowerDisplay();
        this.refreshGeneralList();
        this.refreshSlotTabs();
      }
    }
  }

  private updatePowerDisplay(): void {
    const width = this.cameras.main.width;
    const formation = this.getCurrentFormation();
    
    let totalPower = 0;
    formation.getAllUnits().forEach(generalId => {
      const general = this.generalMap.get(generalId);
      if (general) {
        totalPower += general.combatPower;
      }
    });

    const powerTextKey = 'powerText';
    let powerText = this.children.getByName(powerTextKey) as Phaser.GameObjects.Text;
    
    if (!powerText) {
      powerText = this.add.text(width / 2, 425, '', {
        fontSize: '16px',
        color: '#ffd700',
      }).setOrigin(0.5);
      powerText.setName(powerTextKey);
    }
    
    powerText.setText(`⚡ 총 전투력: ${totalPower}`);
  }

  private saveFormation(): void {
    this.formationManager.save();
    this.formationManager.saveActiveFormationLegacy();

    const { width, height } = this.cameras.main;
    const activeSlot = this.formationManager.getActiveSlot();
    const text = this.add.text(width / 2, height / 2, `✅ "${activeSlot.slotName}" 저장 완료!`, {
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
