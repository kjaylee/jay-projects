import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';

export class MainScene extends Phaser.Scene {
  private gameManager!: GameManager;
  private userId!: string;
  private isGuest!: boolean;

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { userId: string; isGuest: boolean }): void {
    this.userId = data.userId;
    this.isGuest = data.isGuest;
  }

  create(): void {
    this.gameManager = GameManager.getInstance();
    this.gameManager.init(this.userId, this.isGuest);

    this.createUI();
  }

  private createUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 상단 자원 바
    this.createResourceBar();

    // 메인 캐릭터 영역
    this.add.text(width / 2, 300, '🏯', { fontSize: '80px' }).setOrigin(0.5);
    this.add.text(width / 2, 400, '천하를 정복하라!', {
      fontSize: '24px',
      color: '#ffd700',
    }).setOrigin(0.5);

    // 하단 네비게이션
    this.createNavigation();

    // 중앙 버튼들
    this.createMainButtons();
  }

  private createResourceBar(): void {
    const barBg = this.add.graphics();
    barBg.fillStyle(0x000000, 0.7);
    barBg.fillRect(0, 0, 450, 60);

    // 골드
    this.add.text(20, 20, '💰 10,000', { fontSize: '16px', color: '#ffd700' });
    // 보석
    this.add.text(150, 20, '💎 100', { fontSize: '16px', color: '#00ffff' });
    // 스태미나
    this.add.text(280, 20, '⚡ 50/50', { fontSize: '16px', color: '#00ff00' });
  }

  private createNavigation(): void {
    const navY = 740;
    const navItems = [
      { x: 45, icon: '🏠', label: '홈' },
      { x: 135, icon: '⚔️', label: '전투' },
      { x: 225, icon: '👥', label: '장수' },
      { x: 315, icon: '🏪', label: '상점' },
      { x: 405, icon: '📊', label: '더보기' },
    ];

    const navBg = this.add.graphics();
    navBg.fillStyle(0x000000, 0.8);
    navBg.fillRect(0, 700, 450, 100);

    navItems.forEach(item => {
      const container = this.add.container(item.x, navY);
      
      const icon = this.add.text(0, -10, item.icon, { fontSize: '28px' }).setOrigin(0.5);
      const label = this.add.text(0, 20, item.label, { 
        fontSize: '12px', 
        color: '#888888' 
      }).setOrigin(0.5);
      
      container.add([icon, label]);
      container.setSize(80, 60);
      container.setInteractive({ useHandCursor: true });
      
      container.on('pointerdown', () => {
        this.onNavClick(item.label);
      });
    });
  }

  private createMainButtons(): void {
    // 출전 버튼
    const battleBtn = this.createButton(225, 550, '⚔️ 출전', () => {
      this.scene.start('BattleScene', { 
        userId: this.userId,
        stageId: 'stage_1_1',
      });
    });

    // 가챠 버튼
    const gachaBtn = this.createButton(225, 620, '🎰 장수 모집', () => {
      console.log('가챠 오픈');
    });
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x8b0000, 1);
    bg.fillRoundedRect(-100, -22, 200, 44, 8);
    bg.lineStyle(2, 0xffd700);
    bg.strokeRoundedRect(-100, -22, 200, 44, 8);
    
    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    button.add([bg, label]);
    button.setSize(200, 44);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', callback);

    return button;
  }

  private onNavClick(label: string): void {
    console.log('Nav clicked:', label);
    // TODO: 화면 전환 구현
  }
}
