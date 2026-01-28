import Phaser from 'phaser';
import { GameManager, UserData } from '../managers/GameManager';
import { Button } from '../ui/Button';

export class MainScene extends Phaser.Scene {
  private gameManager!: GameManager;
  private userId!: string;
  private isGuest!: boolean;
  private userData!: UserData | null;

  // UI elements for updates
  private goldText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private staminaText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { userId: string; isGuest: boolean }): void {
    this.userId = data.userId;
    this.isGuest = data.isGuest;
  }

  async create(): Promise<void> {
    this.gameManager = GameManager.getInstance();
    await this.gameManager.init(this.userId, this.isGuest);
    this.userData = this.gameManager.getUserData();

    this.createUI();
  }

  private createUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.graphics()
      .fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f0f1a, 0x0f0f1a, 1)
      .fillRect(0, 0, width, height);

    // 상단 자원 바
    this.createResourceBar();

    // 메인 캐릭터 영역
    this.createMainArea();

    // 하단 네비게이션
    this.createNavigation();

    // 중앙 버튼들
    this.createMainButtons();

    // 환영 메시지
    if (this.userData) {
      const welcomeText = this.add.text(width / 2, 150, `환영합니다, ${this.userData.nickname}!`, {
        fontSize: '14px',
        color: '#aaaaaa',
      }).setOrigin(0.5);
      
      this.tweens.add({
        targets: welcomeText,
        alpha: 0,
        delay: 3000,
        duration: 1000,
      });
    }
  }

  private createResourceBar(): void {
    const barBg = this.add.graphics();
    barBg.fillStyle(0x000000, 0.8);
    barBg.fillRect(0, 0, 450, 60);

    const gold = this.userData?.gold ?? 10000;
    const gems = this.userData?.gems ?? 100;
    const stamina = this.userData?.stamina ?? 50;

    // 골드
    this.goldText = this.add.text(20, 20, `💰 ${gold.toLocaleString()}`, { 
      fontSize: '16px', 
      color: '#ffd700' 
    });
    
    // 보석
    this.gemsText = this.add.text(150, 20, `💎 ${gems}`, { 
      fontSize: '16px', 
      color: '#00ffff' 
    });
    
    // 스태미나
    this.staminaText = this.add.text(280, 20, `⚡ ${stamina}/50`, { 
      fontSize: '16px', 
      color: '#00ff00' 
    });

    // 설정 버튼
    new Button(this, 420, 30, '⚙️', {
      width: 40,
      height: 40,
      fontSize: '20px',
      backgroundColor: 0x333333,
      borderColor: 0x555555,
    }, () => {
      console.log('Settings clicked');
    });
  }

  private createMainArea(): void {
    const width = this.cameras.main.width;

    // 성 이미지
    this.add.text(width / 2, 280, '🏯', { fontSize: '100px' }).setOrigin(0.5);
    
    // 타이틀
    this.add.text(width / 2, 390, '천하를 정복하라!', {
      fontSize: '26px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 레벨/전투력 표시
    const level = this.userData?.level ?? 1;
    this.add.text(width / 2, 420, `Lv.${level} | 전투력: 계산중...`, {
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private createNavigation(): void {
    const navY = 740;
    const navItems = [
      { x: 45, icon: '🏠', label: '홈', action: () => {} },
      { x: 135, icon: '⚔️', label: '전투', action: () => this.goToStageSelect() },
      { x: 225, icon: '👥', label: '장수', action: () => this.goToGeneralList() },
      { x: 315, icon: '📋', label: '진형', action: () => this.goToFormation() },
      { x: 405, icon: '📊', label: '더보기', action: () => console.log('More') },
    ];

    const navBg = this.add.graphics();
    navBg.fillStyle(0x000000, 0.9);
    navBg.fillRect(0, 700, 450, 100);

    navItems.forEach(item => {
      const container = this.add.container(item.x, navY);
      
      const icon = this.add.text(0, -10, item.icon, { fontSize: '28px' }).setOrigin(0.5);
      const label = this.add.text(0, 20, item.label, { 
        fontSize: '12px', 
        color: item.label === '홈' ? '#ffd700' : '#888888',
      }).setOrigin(0.5);
      
      container.add([icon, label]);
      container.setSize(80, 60);
      container.setInteractive({ useHandCursor: true });
      
      container.on('pointerdown', item.action);
      
      container.on('pointerover', () => {
        label.setColor('#ffffff');
      });
      
      container.on('pointerout', () => {
        label.setColor(item.label === '홈' ? '#ffd700' : '#888888');
      });
    });
  }

  private createMainButtons(): void {
    const width = this.cameras.main.width;

    // 출전 버튼
    new Button(this, width / 2, 500, '⚔️ 출전', {
      width: 240,
      height: 50,
      fontSize: '20px',
      backgroundColor: 0x8b0000,
    }, () => this.goToStageSelect());

    // 가챠 버튼
    new Button(this, width / 2, 570, '🎰 장수 모집', {
      width: 240,
      height: 50,
      fontSize: '20px',
      backgroundColor: 0x6a3093,
    }, () => this.goToGacha());

    // 진형 편집 버튼
    new Button(this, width / 2 - 70, 640, '📋 진형', {
      width: 120,
      height: 44,
      fontSize: '16px',
      backgroundColor: 0x1a5a1a,
    }, () => this.goToFormation());

    // 장수 목록 버튼
    new Button(this, width / 2 + 70, 640, '👥 장수', {
      width: 120,
      height: 44,
      fontSize: '16px',
      backgroundColor: 0x1a3a5a,
    }, () => this.goToGeneralList());
  }

  private goToStageSelect(): void {
    const clearedStages = this.userData?.clearedStages ?? [];
    this.scene.start('StageSelectScene', { 
      userId: this.userId,
      clearedStages,
    });
  }

  private goToGacha(): void {
    this.scene.start('GachaScene', { userId: this.userId });
  }

  private goToFormation(): void {
    this.scene.start('FormationScene', { userId: this.userId });
  }

  private goToGeneralList(): void {
    this.scene.start('GeneralListScene', { userId: this.userId });
  }

  // Update resource display (called after battles, gacha, etc.)
  updateResources(): void {
    this.userData = this.gameManager.getUserData();
    if (this.userData) {
      this.goldText.setText(`💰 ${this.userData.gold.toLocaleString()}`);
      this.gemsText.setText(`💎 ${this.userData.gems}`);
      this.staminaText.setText(`⚡ ${this.userData.stamina}/50`);
    }
  }
}
