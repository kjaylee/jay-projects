import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { GeneralCard } from '../ui/GeneralCard';
import { General, GeneralGrade, GeneralClass, Faction } from '../entities/General';
import generalsData from '../data/generals.json';

interface OwnedGeneral {
  id: string;
  level: number;
  stars: number;
  exp: number;
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
    this.add.graphics()
      .fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f0f1a, 0x0f0f1a, 1)
      .fillRect(0, 0, width, height);

    // Header
    this.createHeader();

    // Card grid container
    this.cardContainer = this.add.container(0, 100);
    this.createCardGrid();

    // Detail panel (right side for selected general)
    this.detailContainer = this.add.container(0, 0);
    this.detailContainer.setVisible(false);

    // Scroll handling
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (this.detailContainer.visible) return;
      
      const rows = Math.ceil(this.ownedGenerals.length / 4);
      const maxScroll = Math.max(0, rows * 110 - (height - 160));
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, maxScroll);
      this.cardContainer.y = 100 - this.scrollY;
    });
  }

  private createHeader(): void {
    const { width } = this.cameras.main;

    // Header background
    this.add.graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(0, 0, width, 80);

    // Back button
    new Button(this, 50, 40, '←', {
      width: 50,
      height: 40,
      fontSize: '24px',
      backgroundColor: 0x333333,
    }, () => {
      this.scene.start('MainScene', { userId: this.userId, isGuest: true });
    });

    // Title
    this.add.text(width / 2, 30, '👥 장수 목록', {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // General count
    this.add.text(width / 2, 58, `보유: ${this.ownedGenerals.length}명`, {
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Formation button
    new Button(this, width - 70, 40, '진형', {
      width: 70,
      height: 36,
      fontSize: '14px',
      backgroundColor: 0x006600,
    }, () => {
      this.scene.start('FormationScene', { userId: this.userId });
    });
  }

  private loadOwnedGenerals(): void {
    // Load from localStorage (guest mode)
    const savedKey = `ownedGenerals_${this.userId}`;
    const saved = localStorage.getItem(savedKey);
    
    let ownedList: OwnedGeneral[] = [];
    
    if (saved) {
      ownedList = JSON.parse(saved);
    } else {
      // Default starting generals for new players
      ownedList = [
        { id: 'zhang_song', level: 1, stars: 1, exp: 0 },
        { id: 'mi_zhu', level: 1, stars: 1, exp: 0 },
        { id: 'sun_qian', level: 1, stars: 1, exp: 0 },
      ];
      localStorage.setItem(savedKey, JSON.stringify(ownedList));
    }

    // Convert to General objects
    this.ownedGenerals = ownedList.map(owned => {
      const data = generalsData.generals.find(g => g.id === owned.id);
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
      });
    }).filter((g): g is General => g !== null);

    // Sort by grade (UR > SSR > SR > R > N)
    const gradeOrder: Record<GeneralGrade, number> = { UR: 5, SSR: 4, SR: 3, R: 2, N: 1 };
    this.ownedGenerals.sort((a, b) => gradeOrder[b.grade] - gradeOrder[a.grade]);
  }

  private createCardGrid(): void {
    const { width } = this.cameras.main;
    const cols = 4;
    const cardWidth = 90;
    const cardHeight = 110;
    const spacing = (width - cols * cardWidth) / (cols + 1);

    this.ownedGenerals.forEach((general, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = spacing + cardWidth / 2 + col * (cardWidth + spacing);
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

    // Detail panel
    const panelWidth = 360;
    const panelHeight = 500;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a2e, 1);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 12);
    panel.lineStyle(2, general.getGradeColor() as unknown as number);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 12);
    this.detailContainer.add(panel);

    // Close button
    const closeBtn = new Button(this, panelX + panelWidth - 30, panelY + 25, '✕', {
      width: 36,
      height: 36,
      fontSize: '20px',
      backgroundColor: 0x333333,
    }, () => {
      this.detailContainer.setVisible(false);
    });
    this.detailContainer.add(closeBtn);

    // Grade & Name
    const centerX = width / 2;
    this.detailContainer.add(
      this.add.text(centerX, panelY + 30, `[${general.grade}] ${general.name}`, {
        fontSize: '22px',
        color: general.getGradeColor(),
        fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    // Large card
    const largeCard = new GeneralCard(this, centerX, panelY + 130, general, {
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

    // Combat power
    this.detailContainer.add(
      this.add.text(centerX, statsY + 140, `⚡ 전투력: ${general.combatPower}`, {
        fontSize: '18px',
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    // Level up button
    const levelUpBtn = new Button(this, centerX - 80, panelY + panelHeight - 50, '레벨업', {
      width: 120,
      height: 40,
      fontSize: '14px',
      backgroundColor: 0x006600,
    }, () => {
      // TODO: Implement level up
      console.log('Level up:', general.name);
    });
    this.detailContainer.add(levelUpBtn);

    // Upgrade button
    const upgradeBtn = new Button(this, centerX + 80, panelY + panelHeight - 50, '승급', {
      width: 120,
      height: 40,
      fontSize: '14px',
      backgroundColor: 0x884400,
    }, () => {
      // TODO: Implement upgrade
      console.log('Upgrade:', general.name);
    });
    this.detailContainer.add(upgradeBtn);

    this.detailContainer.setVisible(true);
  }
}
