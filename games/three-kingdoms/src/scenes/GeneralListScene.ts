import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { GeneralCard } from '../ui/GeneralCard';
import { General, GeneralGrade, GeneralClass, Faction, AwakenData } from '../entities/General';
import { AwakenManager } from '../managers/AwakenManager';
import { drawGradientBackground, drawPanelBackground, COLORS } from '../ui/effects';
import generalsData from '../data/generals.json';

interface OwnedGeneral {
  id: string;
  level: number;
  stars: number;
  exp: number;
  awakened?: boolean;
}

export class GeneralListScene extends Phaser.Scene {
  private userId!: string;
  private ownedGenerals: General[] = [];
  private selectedGeneral: General | null = null;
  private cardContainer!: Phaser.GameObjects.Container;
  private detailContainer!: Phaser.GameObjects.Container;
  private scrollY: number = 0;

  constructor() {
    super({ key: 'GeneralListScene' });
  }

  init(data: { userId: string }): void {
    this.userId = data.userId;
    this.loadOwnedGenerals();
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Background
    drawGradientBackground(this, 0, 0, width, height, 0x1a1a2e, 0x0f0f1a);

    this.createHeader(width);

    this.cardContainer = this.add.container(0, 100);
    this.createCardGrid(width);

    this.detailContainer = this.add.container(0, 0);
    this.detailContainer.setVisible(false);

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (this.detailContainer.visible) return;
      
      const rows = Math.ceil(this.ownedGenerals.length / 4);
      const maxScroll = Math.max(0, rows * 120 - (height - 160));
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, maxScroll);
      this.cardContainer.y = 100 - this.scrollY;
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
      variant: 'dark',
      useImage: false,
    }, () => {
      this.scene.start('MainScene', { userId: this.userId, isGuest: true });
    });

    // Title (중앙)
    this.add.text(width / 2, 30, '👥 장수 목록', {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // General count (중앙)
    this.add.text(width / 2, 58, `보유: ${this.ownedGenerals.length}명`, {
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Formation button
    new Button(this, width - 55, 40, '진형', {
      width: 70,
      height: 36,
      fontSize: '14px',
      variant: 'gold',
      useImage: false,
    }, () => {
      this.scene.start('FormationScene', { userId: this.userId });
    });
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
      localStorage.setItem(savedKey, JSON.stringify(ownedList));
    }

    this.ownedGenerals = ownedList.map(owned => {
      const data = generalsData.generals.find(g => g.id === owned.id) as any;
      if (!data) return null;

      return new General({
        id: data.id,
        name: data.name,
        grade: data.grade as GeneralGrade,
        generalClass: data.class as GeneralClass,
        faction: data.faction as Faction,
        baseStats: data.baseStats as any,
        level: owned.level,
        stars: owned.stars,
        exp: owned.exp,
        awakened: owned.awakened,
        awakenData: data.awakenData as AwakenData | undefined,
      });
    }).filter((g): g is General => g !== null);

    const gradeOrder: Record<GeneralGrade, number> = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };
    this.ownedGenerals.sort((a, b) => gradeOrder[b.grade] - gradeOrder[a.grade]);
  }

  private createCardGrid(width: number): void {
    const cols = 4;
    const cardWidth = 90;
    const cardHeight = 110;
    const totalGridWidth = cols * cardWidth + (cols - 1) * 15;
    const startX = (width - totalGridWidth) / 2 + cardWidth / 2;

    this.ownedGenerals.forEach((general, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + 15);
      const y = row * (cardHeight + 10) + cardHeight / 2;

      const card = new GeneralCard(this, x, y, general, {
        width: cardWidth,
        height: cardHeight,
      });

      card.on('pointerdown', () => {
        this.showGeneralDetail(general, card);
      });

      this.cardContainer.add(card);
    });
  }

  private showGeneralDetail(general: General, card: GeneralCard): void {
    const { width, height } = this.cameras.main;
    
    this.selectedGeneral = general;
    this.detailContainer.removeAll(true);

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.detailContainer.add(overlay);

    // Detail panel (중앙)
    const panelWidth = 360;
    const panelHeight = 500;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    const panel = drawPanelBackground(this, panelX, panelY, panelWidth, panelHeight, {
      fillColor: 0x1a1a2e,
      borderColor: general.getGradeColor() as unknown as number,
      cornerRadius: 12,
    });
    this.detailContainer.add(panel);

    // Close button
    const closeBtn = new Button(this, panelX + panelWidth - 25, panelY + 25, '✕', {
      width: 32,
      height: 32,
      fontSize: '18px',
      backgroundColor: 0x550000,
      backgroundColorDark: 0x330000,
      borderColor: 0x880000,
      glowOnHover: false,
    }, () => {
      this.detailContainer.setVisible(false);
    });
    this.detailContainer.add(closeBtn);

    // Grade & Name (중앙)
    this.detailContainer.add(
      this.add.text(width / 2, panelY + 30, `[${general.grade}] ${general.name}`, {
        fontSize: '22px',
        color: general.getGradeColor(),
        fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    // Large card (중앙)
    const largeCard = new GeneralCard(this, width / 2, panelY + 130, general, {
      width: 120,
      height: 150,
      interactive: false,
    });
    this.detailContainer.add(largeCard);

    // Stats
    const stats = general.calculateStats();
    const statsY = panelY + 230;
    const statsText = [
      `⚔️ 공격: ${Math.floor(stats.attack)}`,
      `🛡️ 방어: ${Math.floor(stats.defense)}`,
      `📜 지력: ${Math.floor(stats.intelligence)}`,
      `💨 속도: ${Math.floor(stats.speed)}`,
      `🏛️ 정치: ${Math.floor(stats.politics)}`,
    ];

    statsText.forEach((text, i) => {
      this.detailContainer.add(
        this.add.text(panelX + 40, statsY + i * 25, text, {
          fontSize: '14px',
          color: '#ffffff',
        })
      );
    });

    // Combat power (중앙)
    this.detailContainer.add(
      this.add.text(width / 2, statsY + 140, `⚡ 전투력: ${general.combatPower}`, {
        fontSize: '18px',
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    // 각성 상태 표시 (UR 장수만)
    if (general.grade === 'UR') {
      const awakenStatus = general.awakened ? '✨ 각성 완료' : '⭐ 각성 가능';
      const awakenColor = general.awakened ? '#ff00ff' : '#ffaa00';
      this.detailContainer.add(
        this.add.text(width / 2, statsY + 165, awakenStatus, {
          fontSize: '14px',
          color: awakenColor,
          fontStyle: 'bold',
        }).setOrigin(0.5)
      );
    }

    // Level up button (중앙 왼쪽)
    const levelUpBtn = new Button(this, width / 2 - 70, panelY + panelHeight - 90, '레벨업', {
      width: 100,
      height: 36,
      fontSize: '13px',
      backgroundColor: 0x006600,
      backgroundColorDark: 0x003300,
      borderColor: 0x00aa00,
    }, () => {
      console.log('Level up:', general.name);
    });
    this.detailContainer.add(levelUpBtn);

    // Upgrade button (중앙 오른쪽)
    const upgradeBtn = new Button(this, width / 2 + 70, panelY + panelHeight - 90, '승급', {
      width: 100,
      height: 36,
      fontSize: '13px',
      backgroundColor: 0x884400,
      backgroundColorDark: 0x552200,
      borderColor: 0xaa6600,
    }, () => {
      console.log('Upgrade:', general.name);
    });
    this.detailContainer.add(upgradeBtn);

    // 각성 버튼 (UR 장수만, 중앙)
    if (general.grade === 'UR' && !general.awakened) {
      const awakenBtn = new Button(this, width / 2, panelY + panelHeight - 45, '🌟 각성', {
        width: 220,
        height: 40,
        fontSize: '16px',
        backgroundColor: general.canAwaken() ? 0x990099 : 0x333333,
        backgroundColorDark: general.canAwaken() ? 0x660066 : 0x222222,
        borderColor: general.canAwaken() ? 0xcc00cc : 0x444444,
      }, () => {
        this.showAwakenConfirm(general);
      });
      this.detailContainer.add(awakenBtn);
    }

    this.detailContainer.setVisible(true);
  }

  private showAwakenConfirm(general: General): void {
    const { width, height } = this.cameras.main;
    const awakenManager = AwakenManager.getInstance();

    const resources = { gold: 200000, awakenStones: 100 };
    const check = awakenManager.checkAwaken(general, resources);

    const confirmContainer = this.add.container(0, 0);

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    confirmContainer.add(overlay);

    // Popup panel (중앙)
    const popupWidth = 320;
    const popupHeight = 350;
    const popupX = (width - popupWidth) / 2;
    const popupY = (height - popupHeight) / 2;

    const popup = drawPanelBackground(this, popupX, popupY, popupWidth, popupHeight, {
      fillColor: 0x1a1a2e,
      borderColor: 0xff00ff,
      cornerRadius: 12,
    });
    confirmContainer.add(popup);

    // Title (중앙)
    confirmContainer.add(
      this.add.text(width / 2, popupY + 30, `🌟 ${general.name} 각성`, {
        fontSize: '20px',
        color: '#ff00ff',
        fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    // 각성 효과 미리보기
    if (general.awakenData) {
      const bonus = general.awakenData.awakenStats;
      const bonusText = [
        `⚔️ 공격 +${bonus.attack ?? 0}`,
        `🛡️ 방어 +${bonus.defense ?? 0}`,
        `📜 지력 +${bonus.intelligence ?? 0}`,
        `💨 속도 +${bonus.speed ?? 0}`,
      ];

      // 각성 보너스 (중앙)
      confirmContainer.add(
        this.add.text(width / 2, popupY + 65, '각성 보너스', {
          fontSize: '14px',
          color: '#ffaa00',
        }).setOrigin(0.5)
      );

      bonusText.forEach((text, i) => {
        confirmContainer.add(
          this.add.text(popupX + 40, popupY + 90 + i * 22, text, {
            fontSize: '13px',
            color: '#00ff00',
          })
        );
      });

      // 새로운 스킬
      confirmContainer.add(
        this.add.text(popupX + 40, popupY + 180, `🔮 신규 스킬: ${general.awakenData.awakenSkillId}`, {
          fontSize: '12px',
          color: '#00ffff',
        })
      );

      // 비용
      const cost = general.awakenData.awakenCost;
      confirmContainer.add(
        this.add.text(popupX + 40, popupY + 210, `💰 골드: ${cost.gold.toLocaleString()}`, {
          fontSize: '12px',
          color: '#ffffff',
        })
      );
      confirmContainer.add(
        this.add.text(popupX + 40, popupY + 232, `💎 각성석: ${cost.awakenStones}`, {
          fontSize: '12px',
          color: '#ffffff',
        })
      );
    }

    // 가능 여부 표시 (중앙)
    if (!check.canAwaken) {
      confirmContainer.add(
        this.add.text(width / 2, popupY + 265, check.reasons[0], {
          fontSize: '11px',
          color: '#ff4444',
        }).setOrigin(0.5)
      );
    }

    // Cancel button (중앙 왼쪽)
    const cancelBtn = new Button(this, width / 2 - 70, popupY + popupHeight - 40, '취소', {
      width: 100,
      height: 36,
      fontSize: '14px',
      backgroundColor: 0x666666,
    }, () => {
      confirmContainer.destroy();
    });
    confirmContainer.add(cancelBtn);

    // Confirm button (중앙 오른쪽)
    const confirmBtn = new Button(this, width / 2 + 70, popupY + popupHeight - 40, '각성!', {
      width: 100,
      height: 36,
      fontSize: '14px',
      backgroundColor: check.canAwaken ? 0x990099 : 0x333333,
    }, () => {
      if (!check.canAwaken) return;
      
      const result = awakenManager.executeAwaken(general, resources);
      if (result.success) {
        this.showAwakenAnimation(general, confirmContainer);
      }
    });
    confirmContainer.add(confirmBtn);
  }

  private showAwakenAnimation(general: General, container: Phaser.GameObjects.Container): void {
    const { width, height } = this.cameras.main;
    
    container.removeAll(true);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 1);
    overlay.fillRect(0, 0, width, height);
    container.add(overlay);

    // 빛나는 원 이펙트 (중앙)
    const circle = this.add.graphics();
    circle.fillStyle(0xff00ff, 0.5);
    circle.fillCircle(width / 2, height / 2, 10);
    container.add(circle);

    this.tweens.add({
      targets: circle,
      scaleX: 30,
      scaleY: 30,
      alpha: 0,
      duration: 1500,
      ease: 'Expo.easeOut',
    });

    // 이름 텍스트 (중앙)
    const nameText = this.add.text(width / 2, height / 2 - 50, general.name, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    container.add(nameText);

    // 각성 완료 텍스트 (중앙)
    const awakenText = this.add.text(width / 2, height / 2 + 20, '✨ 각성 완료! ✨', {
      fontSize: '28px',
      color: '#ff00ff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    container.add(awakenText);

    this.tweens.add({
      targets: [nameText, awakenText],
      alpha: 1,
      duration: 500,
      delay: 800,
    });

    this.time.delayedCall(3000, () => {
      container.destroy();
      this.detailContainer.setVisible(false);
      
      this.saveOwnedGenerals();
      this.refreshCardGrid();
    });
  }

  private saveOwnedGenerals(): void {
    const savedKey = `ownedGenerals_${this.userId}`;
    const ownedList = this.ownedGenerals.map(g => ({
      id: g.id,
      level: g.level,
      stars: g.stars,
      exp: g.exp,
      awakened: g.awakened,
    }));
    localStorage.setItem(savedKey, JSON.stringify(ownedList));
  }

  private refreshCardGrid(): void {
    const width = this.cameras.main.width;
    this.cardContainer.removeAll(true);
    this.loadOwnedGenerals();
    this.createCardGrid(width);
  }
}
