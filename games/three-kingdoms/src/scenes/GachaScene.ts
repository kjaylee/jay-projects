import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { GeneralCard } from '../ui/GeneralCard';
import { GachaManager, GachaResult, GachaPool, SINGLE_COST, MULTI_COST, GeneralGrade as GachaGrade } from '../managers/GachaManager';
import { GachaAnimationManager, GRADE_EFFECTS } from '../managers/GachaAnimationManager';
import { General, GeneralGrade } from '../entities/General';
import { GameManager } from '../managers/GameManager';
import generalsData from '../data/generals.json';

export class GachaScene extends Phaser.Scene {
  private userId!: string;
  private gachaManager!: GachaManager;
  private gameManager!: GameManager;
  private animationManager!: GachaAnimationManager;
  private resultModal!: Modal;
  private gems: number = 100;

  // UI elements
  private gemsText!: Phaser.GameObjects.Text;
  private pityText!: Phaser.GameObjects.Text;
  private skipButton!: Button;
  private isAnimating: boolean = false;

  // Animation state
  private revealContainer!: Phaser.GameObjects.Container;
  private currentResults: GachaResult[] = [];
  private revealedCards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'GachaScene' });
  }

  init(data: { userId: string }): void {
    this.userId = data.userId;
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Get GameManager instance
    this.gameManager = GameManager.getInstance();
    const userData = this.gameManager.getUserData();
    this.gems = userData?.gems ?? 100;

    // Create gacha pool from generals data
    const pool = this.createGachaPool();
    this.gachaManager = new GachaManager(pool);

    // Animation manager
    this.animationManager = new GachaAnimationManager(this);
    this.animationManager.setOnSkipCallback(() => this.onAnimationSkipped());

    // Background
    this.createBackground();

    // Header
    this.createHeader();

    // Banner area
    this.createBannerArea();

    // Gacha buttons
    this.createGachaButtons();

    // Rates info
    this.createRatesInfo();

    // Result modal
    this.resultModal = new Modal(this, {
      title: '🎉 뽑기 결과',
      width: 420,
      height: 550,
    });

    // Reveal container (for animation)
    this.revealContainer = this.add.container(width / 2, height / 2);
    this.revealContainer.setDepth(50);
    this.revealContainer.setVisible(false);
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    
    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2d1b4e, 0x2d1b4e, 0x1a0f2e, 0x1a0f2e, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative particles
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(100, height - 200);
      const star = this.add.text(x, y, '✨', { fontSize: `${Phaser.Math.Between(10, 20)}px` });
      star.setAlpha(0.3 + Math.random() * 0.4);
      
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        y: y - 50,
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private createHeader(): void {
    const { width } = this.cameras.main;

    // Header background
    this.add.graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(0, 0, width, 70);

    // Back button
    new Button(this, 50, 35, '←', {
      width: 50,
      height: 40,
      fontSize: '24px',
      backgroundColor: 0x333333,
    }, () => {
      if (!this.isAnimating) {
        this.scene.start('MainScene', { userId: this.userId, isGuest: true });
      }
    });

    // Title
    this.add.text(width / 2, 25, '🎰 장수 모집', {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Gems display
    this.gemsText = this.add.text(width - 20, 25, `💎 ${this.gems}`, {
      fontSize: '18px',
      color: '#00ffff',
    }).setOrigin(1, 0.5);

    // Pity counter
    this.pityText = this.add.text(width / 2, 52, `천장까지: ${this.gachaManager.getUntilPity()}회`, {
      fontSize: '12px',
      color: '#ff88ff',
    }).setOrigin(0.5);
  }

  private createBannerArea(): void {
    const { width } = this.cameras.main;

    // Banner frame
    const bannerY = 180;
    this.add.graphics()
      .fillStyle(0x3a2a5e, 1)
      .fillRoundedRect(30, bannerY - 80, width - 60, 200, 12)
      .lineStyle(3, 0xffd700)
      .strokeRoundedRect(30, bannerY - 80, width - 60, 200, 12);

    // Banner title
    this.add.text(width / 2, bannerY - 50, '⭐ 황건토벌 기념 픽업! ⭐', {
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Featured generals
    this.add.text(width / 2, bannerY, '🌟 조조 · 유비 · 손권 확률 UP! 🌟', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // SSR rate
    this.add.text(width / 2, bannerY + 50, 'SSR 확률: 1.8% (80회 보장)', {
      fontSize: '14px',      color: '#ff8800',
    }).setOrigin(0.5);

    // UR rate
    this.add.text(width / 2, bannerY + 75, 'UR 확률: 0.2%', {
      fontSize: '12px',
      color: '#ff0088',
    }).setOrigin(0.5);
  }

  private createGachaButtons(): void {
    const { width } = this.cameras.main;
    const btnY = 400;

    // Single pull button
    new Button(this, width / 2 - 110, btnY, `단차 💎${SINGLE_COST}`, {
      width: 180,
      height: 50,
      fontSize: '16px',
      backgroundColor: 0x6a3093,
    }, () => this.doSinglePull());

    // Multi pull button  
    new Button(this, width / 2 + 110, btnY, `10연차 💎${MULTI_COST}`, {
      width: 180,
      height: 50,
      fontSize: '16px',
      backgroundColor: 0x8b0000,
    }, () => this.doMultiPull());

    // Free pull (daily)
    new Button(this, width / 2, btnY + 70, '🎁 무료 뽑기 (1일 1회)', {
      width: 220,
      height: 44,
      fontSize: '14px',
      backgroundColor: 0x006600,
    }, () => this.doFreePull());
  }

  private createRatesInfo(): void {
    const { width, height } = this.cameras.main;
    
    const ratesY = height - 100;
    this.add.text(width / 2, ratesY, '📋 확률 안내', {
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.add.text(width / 2, ratesY + 25, 'N:60% | R:30% | SR:8% | SSR:1.8% | UR:0.2%', {
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5);

    this.add.text(width / 2, ratesY + 45, '10연차 SR 이상 1장 보장 · 80회 SSR 천장', {
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5);
  }

  private createGachaPool(): GachaPool {
    const pool: GachaPool = { N: [], R: [], SR: [], SSR: [], UR: [] };
    
    generalsData.generals.forEach((g: { id: string; grade: string }) => {
      const grade = g.grade as GachaGrade;
      if (pool[grade]) {
        pool[grade].push(g.id);
      }
    });

    return pool;
  }

  private doSinglePull(): void {
    if (this.isAnimating) return;
    
    if (this.gems < SINGLE_COST) {
      this.showNotEnoughGems();
      return;
    }

    this.gems -= SINGLE_COST;
    this.updateGemsDisplay();
    
    const result = this.gachaManager.pull();
    this.playSinglePullAnimation([result]);
  }

  private doMultiPull(): void {
    if (this.isAnimating) return;
    
    if (this.gems < MULTI_COST) {
      this.showNotEnoughGems();
      return;
    }

    this.gems -= MULTI_COST;
    this.updateGemsDisplay();
    
    const results = this.gachaManager.pullMulti(10);
    this.playMultiPullAnimation(results);
  }

  private doFreePull(): void {
    if (this.isAnimating) return;
    
    // TODO: Check daily limit
    const result = this.gachaManager.pull();
    this.playSinglePullAnimation([result]);
  }

  private updateGemsDisplay(): void {
    this.gemsText.setText(`💎 ${this.gems}`);
    this.pityText.setText(`천장까지: ${this.gachaManager.getUntilPity()}회`);
  }

  private showNotEnoughGems(): void {
    const { width, height } = this.cameras.main;
    
    const text = this.add.text(width / 2, height / 2, '💎 보석이 부족합니다!', {
      fontSize: '20px',
      color: '#ff4444',
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

  /** 단차 연출 애니메이션 */
  private async playSinglePullAnimation(results: GachaResult[]): Promise<void> {
    this.isAnimating = true;
    this.currentResults = results;
    this.animationManager.setSkipped(false);

    const { width, height } = this.cameras.main;
    const result = results[0];
    const grade = result.grade as GachaGrade;

    // 화면 어둡게
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(40);

    // 스킵 버튼 표시
    this.showSkipButton();

    // 카드 생성 (뒷면 상태)
    const generalData = generalsData.generals.find(g => g.id === result.generalId);
    if (!generalData) {
      this.finishAnimation(overlay);
      return;
    }

    const general = this.createGeneralFromData(generalData);
    const card = new GeneralCard(this, 0, 0, general, {
      width: 150,
      height: 200,
      interactive: false,
    });
    
    this.revealContainer.add(card);
    this.revealContainer.setVisible(true);
    this.revealContainer.setPosition(width / 2, height / 2);

    // 등급별 연출 실행
    await this.animationManager.playSingleReveal(card, grade, width / 2, height / 2);

    // 연출 완료 후 대기
    await this.delay(1000);

    // 결과 모달 표시
    this.revealContainer.setVisible(false);
    this.revealContainer.removeAll(true);
    this.finishAnimation(overlay);
    this.showResults(results);
  }

  /** 10연차 연출 애니메이션 */
  private async playMultiPullAnimation(results: GachaResult[]): Promise<void> {
    this.isAnimating = true;
    this.currentResults = results;
    this.animationManager.setSkipped(false);

    const { width, height } = this.cameras.main;

    // 화면 어둡게
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(40);

    // 스킵 버튼
    this.showSkipButton();

    // 카드 배치 설정
    const cols = 5;
    const rows = 2;
    const cardWidth = 65;
    const cardHeight = 85;
    const spacingX = 75;
    const spacingY = 100;
    const startX = -((cols - 1) * spacingX) / 2;
    const startY = -((rows - 1) * spacingY) / 2 - 20;

    // 모든 카드 생성 (뒷면 상태)
    const cards: Phaser.GameObjects.Container[] = [];
    const grades: GachaGrade[] = [];

    results.forEach((result, index) => {
      const generalData = generalsData.generals.find(g => g.id === result.generalId);
      if (!generalData) return;

      const general = this.createGeneralFromData(generalData);
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const card = new GeneralCard(this, x, y, general, {
        width: cardWidth,
        height: cardHeight,
        interactive: false,
      });

      // 초기 상태: 숨김
      card.setScale(0, 1);
      card.setAlpha(0);

      this.revealContainer.add(card);
      cards.push(card);
      grades.push(result.grade as GachaGrade);
    });

    this.revealContainer.setVisible(true);
    this.revealContainer.setPosition(width / 2, height / 2);

    // 순차적 공개 애니메이션
    await this.animationManager.playMultiReveal(cards, grades, (index) => {
      // 각 카드 공개 시 콜백 (NEW 배지 등)
      this.addNewBadgeToCard(cards[index], results[index], startX, startY, cols, index);
    });

    // 연출 완료 후 대기
    if (!this.animationManager.skipped) {
      await this.delay(1500);
    }

    // 결과 모달 표시
    this.revealContainer.setVisible(false);
    this.revealContainer.removeAll(true);
    this.finishAnimation(overlay);
    this.showResults(results);
  }

  /** NEW 배지 추가 */
  private addNewBadgeToCard(
    card: Phaser.GameObjects.Container,
    result: GachaResult,
    startX: number,
    startY: number,
    cols: number,
    index: number
  ): void {
    if (!result.isNew) return;

    const cardWidth = 65;
    const cardHeight = 85;
    const spacingX = 75;
    const spacingY = 100;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * spacingX;
    const y = startY + row * spacingY;

    const newBadge = this.add.text(
      x + cardWidth / 2 - 5,
      y - cardHeight / 2,
      'NEW',
      {
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#ff0000',
        padding: { x: 2, y: 1 },
      }
    ).setOrigin(1, 0);
    
    this.revealContainer.add(newBadge);
  }

  /** 스킵 버튼 표시 */
  private showSkipButton(): void {
    const { width, height } = this.cameras.main;
    
    // 스킵 버튼 생성
    this.skipButton = new Button(
      this,
      width - 60,
      height - 40,
      '⏭ 스킵',
      {
        width: 80,
        height: 35,
        fontSize: '14px',
        backgroundColor: 0x444444,
      },
      () => this.onSkipPressed()
    );
    this.skipButton.setDepth(200);
  }

  /** 스킵 버튼 클릭 */
  private onSkipPressed(): void {
    this.animationManager.setSkipped(true);
  }

  /** 스킵 콜백 */
  private onAnimationSkipped(): void {
    // 애니메이션 매니저가 스킵을 처리함
  }

  /** 애니메이션 완료 처리 */
  private finishAnimation(overlay: Phaser.GameObjects.Graphics): void {
    this.isAnimating = false;
    overlay.destroy();
    
    if (this.skipButton) {
      this.skipButton.destroy();
    }
  }

  /** General 객체 생성 헬퍼 */
  private createGeneralFromData(generalData: any): General {
    return new General({
      id: generalData.id,
      name: generalData.name,
      grade: generalData.grade as GeneralGrade,
      generalClass: generalData.class as any,
      faction: generalData.faction as any,
      baseStats: generalData.baseStats as any,
    });
  }

  /** 지연 헬퍼 */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  /** 결과 모달 표시 */
  private showResults(results: GachaResult[]): void {
    this.resultModal.clearContent();
    const container = this.resultModal.getContentContainer();
    
    // Create cards for results
    const cols = results.length > 1 ? 5 : 1;
    const cardWidth = results.length > 1 ? 70 : 100;
    const cardHeight = results.length > 1 ? 90 : 120;
    const spacing = results.length > 1 ? 80 : 0;
    const startX = -(cols - 1) * spacing / 2;
    const startY = results.length > 1 ? -80 : -40;

    results.forEach((result, index) => {
      const generalData = generalsData.generals.find(g => g.id === result.generalId);
      if (!generalData) return;

      const general = this.createGeneralFromData(generalData);

      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * spacing;
      const y = startY + row * (cardHeight + 10);

      const card = new GeneralCard(this, x, y, general, {
        width: cardWidth,
        height: cardHeight,
        interactive: false,
      });

      // 등급별 하이라이트 (결과 모달에서)
      const gradeConfig = GRADE_EFFECTS[result.grade as GachaGrade];
      if (result.grade === 'SSR' || result.grade === 'UR') {
        // 골드/무지개 테두리 효과
        this.tweens.add({
          targets: card,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 300,
          yoyo: true,
          repeat: 2,
        });
      }

      container.add(card);

      // New badge
      if (result.isNew) {
        const newBadge = this.add.text(x + cardWidth / 2 - 5, y - cardHeight / 2, 'NEW', {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#ff0000',
          padding: { x: 2, y: 1 },
        }).setOrigin(1, 0);
        container.add(newBadge);
      }
    });

    // Summary text
    const urCount = results.filter(r => r.grade === 'UR').length;
    const ssrCount = results.filter(r => r.grade === 'SSR').length;
    const srCount = results.filter(r => r.grade === 'SR').length;
    
    let summaryText = `총 ${results.length}장`;
    if (urCount > 0) summaryText = `🔴 UR: ${urCount}  |  ` + summaryText;
    if (ssrCount > 0) summaryText = `🟨 SSR: ${ssrCount}  |  ` + summaryText;
    if (srCount > 0) summaryText = `🟪 SR: ${srCount}  |  ` + summaryText;

    const summary = this.add.text(0, 130, summaryText, {
      fontSize: '13px',
      color: '#ffd700',
    }).setOrigin(0.5);
    container.add(summary);

    this.resultModal.show();
  }
}
