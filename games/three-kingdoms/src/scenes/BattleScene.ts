import Phaser from 'phaser';
import { BattleManager, BattleState } from '../managers/BattleManager';

export class BattleScene extends Phaser.Scene {
  private battleManager!: BattleManager;
  private userId!: string;
  private stageId!: string;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { userId: string; stageId: string }): void {
    this.userId = data.userId;
    this.stageId = data.stageId;
  }

  create(): void {
    this.battleManager = new BattleManager(this);
    
    this.createBattleUI();
    this.createUnits();
    
    // 3초 후 전투 시작
    this.time.delayedCall(1000, () => {
      this.battleManager.startBattle();
    });
  }

  private createBattleUI(): void {
    // 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2d1b4e, 0x2d1b4e, 0x1a0f2e, 0x1a0f2e, 1);
    bg.fillRect(0, 0, 450, 800);

    // 스테이지 정보
    this.add.text(225, 30, `스테이지 1-1`, {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 전투 영역 구분선
    this.add.graphics()
      .lineStyle(2, 0x444444)
      .lineBetween(0, 400, 450, 400);

    // 아군 레이블
    this.add.text(60, 420, '아군', { fontSize: '14px', color: '#00ff00' });
    // 적군 레이블
    this.add.text(60, 100, '적군', { fontSize: '14px', color: '#ff4444' });

    // 배속 버튼
    this.createSpeedButton();

    // 뒤로가기 버튼
    this.createBackButton();
  }

  private createUnits(): void {
    // 아군 진형 (3x3)
    const allyPositions = [
      { x: 120, y: 650 }, { x: 225, y: 650 }, { x: 330, y: 650 }, // 후열
      { x: 120, y: 550 }, { x: 225, y: 550 }, { x: 330, y: 550 }, // 중열
      { x: 120, y: 450 }, { x: 225, y: 450 }, { x: 330, y: 450 }, // 전열
    ];

    // 적군 진형 (3x3, 뒤집힘)
    const enemyPositions = [
      { x: 120, y: 150 }, { x: 225, y: 150 }, { x: 330, y: 150 }, // 후열
      { x: 120, y: 250 }, { x: 225, y: 250 }, { x: 330, y: 250 }, // 중열
      { x: 120, y: 350 }, { x: 225, y: 350 }, { x: 330, y: 350 }, // 전열
    ];

    // 샘플 아군 유닛
    const allyUnits = ['🗡️', '🛡️', '🏹'];
    allyUnits.forEach((unit, i) => {
      this.createUnit(allyPositions[i + 6].x, allyPositions[i + 6].y, unit, true);
    });

    // 샘플 적군 유닛
    const enemyUnits = ['👹', '👺', '💀'];
    enemyUnits.forEach((unit, i) => {
      this.createUnit(enemyPositions[i + 6].x, enemyPositions[i + 6].y, unit, false);
    });
  }

  private createUnit(x: number, y: number, emoji: string, isAlly: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    // 유닛 배경
    const bg = this.add.graphics();
    bg.fillStyle(isAlly ? 0x004400 : 0x440000, 1);
    bg.fillCircle(0, 0, 35);
    bg.lineStyle(2, isAlly ? 0x00ff00 : 0xff0000);
    bg.strokeCircle(0, 0, 35);

    // 유닛 아이콘
    const icon = this.add.text(0, 0, emoji, { fontSize: '32px' }).setOrigin(0.5);

    // HP 바
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x333333, 1);
    hpBg.fillRect(-30, 40, 60, 8);

    const hpBar = this.add.graphics();
    hpBar.fillStyle(0x00ff00, 1);
    hpBar.fillRect(-30, 40, 60, 8);

    container.add([bg, icon, hpBg, hpBar]);
    container.setData('hpBar', hpBar);
    container.setData('hp', 100);
    container.setData('maxHp', 100);

    return container;
  }

  private createSpeedButton(): void {
    let speed = 1;
    const btn = this.add.text(400, 30, '1x', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
      btn.setText(`${speed}x`);
      this.battleManager.setSpeed(speed);
    });
  }

  private createBackButton(): void {
    const btn = this.add.text(50, 30, '← 나가기', {
      fontSize: '14px',
      color: '#ffffff',
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.scene.start('MainScene', { userId: this.userId, isGuest: true });
    });
  }

  update(time: number, delta: number): void {
    this.battleManager.update(delta);
  }
}
