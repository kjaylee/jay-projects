import Phaser from 'phaser';
import { GameManager, UserData } from '../managers/GameManager';
import { IdleRewardPopupManager, IdleRewardData } from '../managers/IdleRewardPopupManager';
import { FormationManager } from '../managers/FormationManager';
import { OwnedGeneralsManager } from '../managers/OwnedGeneralsManager';
import { RewardManager, GeneralForExp } from '../managers/RewardManager';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { 
  drawGradientBackground, 
  createStarfieldParticles,
  drawPanelBackground,
  createResourceIcon,
  COLORS 
} from '../ui/effects';
import generalsData from '../data/generals.json';

export class MainScene extends Phaser.Scene {
  private gameManager!: GameManager;
  private idleRewardManager!: IdleRewardPopupManager;
  private userId!: string;
  private isGuest!: boolean;
  private userData!: UserData | null;

  // UI elements for updates
  private goldText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private staminaText!: Phaser.GameObjects.Text;
  private staminaBar!: Phaser.GameObjects.Graphics;
  private idleRewardModal!: Modal;

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { userId: string; isGuest: boolean }): void {
    this.userId = data.userId;
    this.isGuest = data.isGuest;
  }

  async create(): Promise<void> {
    // 페이드 인
    this.cameras.main.fadeIn(500);
    
    this.gameManager = GameManager.getInstance();
    await this.gameManager.init(this.userId, this.isGuest);
    this.userData = this.gameManager.getUserData();

    // 방치 보상 매니저 초기화
    this.idleRewardManager = new IdleRewardPopupManager(this.userId);

    this.createUI();
    
    // 방치 보상 팝업 모달 생성
    this.createIdleRewardModal();
    
    // 방치 보상 체크 및 표시
    this.checkAndShowIdleReward();
  }

  private createUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // === 동적 배경 ===
    this.createBackground(width, height);

    // === 상단 자원 바 ===
    this.createResourceBar(width);

    // === 메인 캐릭터 영역 ===
    this.createMainArea(width, height);

    // === 중앙 버튼들 ===
    this.createMainButtons(width);

    // === 하단 네비게이션 ===
    this.createNavigation(width, height);

    // === 환영 메시지 ===
    this.showWelcomeMessage(width);
  }

  private createBackground(width: number, height: number): void {
    // 그라디언트 배경
    drawGradientBackground(this, 0, 0, width, height, 0x1a1a2e, 0x0f0f1a);
    
    // 별 파티클 (적게)
    createStarfieldParticles(this, width, height, 30);
    
    // 중앙 원형 글로우 (성 배경)
    const glow = this.add.graphics();
    glow.fillStyle(0x3a1a5e, 0.3);
    glow.fillCircle(width / 2, 280, 120);
    glow.fillStyle(0x5a2a8e, 0.2);
    glow.fillCircle(width / 2, 280, 80);
  }

  private createResourceBar(width: number): void {
    // 배경 패널
    const barBg = drawPanelBackground(this, 0, 0, width, 65, {
      fillColor: 0x0a0a1a,
      fillAlpha: 0.95,
      borderColor: 0x333355,
      innerGlow: false,
    });

    const gold = this.userData?.gold ?? 10000;
    const gems = this.userData?.gems ?? 100;
    const stamina = this.userData?.stamina ?? 50;
    const maxStamina = 50;

    // 골드 - 이미지 아이콘 사용
    if (this.textures.exists('icon_gold')) {
      const goldIcon = this.add.image(18, 22, 'icon_gold').setScale(0.75);
    } else {
      createResourceIcon(this, 18, 22, '💰', 0x8b6914);
    }
    this.goldText = this.add.text(40, 15, gold.toLocaleString(), { 
      fontSize: '15px', 
      color: '#ffd700',
      fontStyle: 'bold',
    });
    
    // 보석 - 이미지 아이콘 사용
    if (this.textures.exists('icon_gem')) {
      const gemIcon = this.add.image(130, 22, 'icon_gem').setScale(0.75);
    } else {
      createResourceIcon(this, 130, 22, '💎', 0x146b8b);
    }
    this.gemsText = this.add.text(152, 15, gems.toString(), { 
      fontSize: '15px', 
      color: '#00ffff',
      fontStyle: 'bold',
    });
    
    // 스태미나 - 이미지 아이콘 사용
    if (this.textures.exists('icon_stamina')) {
      const staminaIcon = this.add.image(230, 22, 'icon_stamina').setScale(0.75);
    } else {
      createResourceIcon(this, 230, 22, '⚡', 0x148b14);
    }
    this.staminaText = this.add.text(252, 10, `${stamina}/${maxStamina}`, { 
      fontSize: '12px', 
      color: '#88ff88',
    });
    
    // 스태미나 바
    const barX = 252;
    const barY = 28;
    const barWidth = 80;
    const barHeight = 8;
    
    this.add.graphics()
      .fillStyle(0x333333, 1)
      .fillRoundedRect(barX, barY, barWidth, barHeight, 4);
    
    this.staminaBar = this.add.graphics();
    this.drawStaminaBar(stamina, maxStamina, barX, barY, barWidth, barHeight);

    // 레벨 표시
    const level = this.userData?.level ?? 1;
    this.add.text(width - 55, 15, `Lv.${level}`, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    // 설정 버튼
    new Button(this, width - 25, 35, '⚙️', {
      width: 38,
      height: 38,
      fontSize: '18px',
      variant: 'dark',
      useImage: false,
    }, () => console.log('Settings clicked'));

    // 하단 경계선
    this.add.graphics()
      .lineStyle(1, COLORS.UI.gold, 0.3)
      .lineBetween(0, 64, width, 64);
  }

  private drawStaminaBar(current: number, max: number, x: number, y: number, w: number, h: number): void {
    this.staminaBar.clear();
    const percent = current / max;
    const color = percent > 0.5 ? 0x00ff00 : percent > 0.25 ? 0xffff00 : 0xff4444;
    this.staminaBar.fillStyle(color, 1);
    this.staminaBar.fillRoundedRect(x, y, w * percent, h, 4);
  }

  private createMainArea(width: number, height: number): void {
    // 성 아이콘 (크고 화려하게)
    const castle = this.add.text(width / 2, 250, '🏯', { fontSize: '100px' }).setOrigin(0.5);
    
    // 성 떠다니는 애니메이션
    this.tweens.add({
      targets: castle,
      y: 240,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // 타이틀 (글로우 효과)
    const title = this.add.text(width / 2, 370, '천하를 정복하라!', {
      fontSize: '28px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    
    // 전투력 표시 (패널 스타일)
    const powerPanel = this.add.container(width / 2, 410);
    
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x000000, 0.5);
    panelBg.fillRoundedRect(-80, -14, 160, 28, 14);
    panelBg.lineStyle(1, 0xffd700, 0.5);
    panelBg.strokeRoundedRect(-80, -14, 160, 28, 14);
    
    const powerText = this.add.text(0, 0, '⚔️ 전투력: 계산중...', {
      fontSize: '13px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    
    powerPanel.add([panelBg, powerText]);
    
    // 전투력 계산 및 업데이트 (실제 로직 연동 필요)
    this.time.delayedCall(500, () => {
      const power = this.calculatePower();
      powerText.setText(`⚔️ 전투력: ${power.toLocaleString()}`);
      powerText.setColor('#ffffff');
    });
  }

  /**
   * 진형 장수 기반 실제 전투력 계산
   * 전투력 = Σ (attack + defense + intelligence + speed) × 등급배수 × 레벨배수
   */
  private calculatePower(): number {
    const formationManager = FormationManager.load(this.userId);
    const activeFormation = formationManager.getActiveFormation();
    const ownedGenerals = new OwnedGeneralsManager(this.userId);
    const unitIds = activeFormation.getAllUnits();

    if (unitIds.length === 0) return 0;

    const gradeMultiplier: Record<string, number> = {
      N: 1.0, R: 1.2, SR: 1.5, SSR: 1.8, UR: 2.2,
    };

    let totalPower = 0;

    for (const generalId of unitIds) {
      const general = (generalsData.generals as Array<{
        id: string;
        grade: string;
        baseStats: { attack: number; defense: number; intelligence: number; speed: number };
      }>).find(g => g.id === generalId);

      if (!general) continue;

      const { attack, defense, intelligence, speed } = general.baseStats;
      const statSum = attack + defense + intelligence + speed;
      const gradeMult = gradeMultiplier[general.grade] ?? 1.0;
      const level = ownedGenerals.getGeneralLevel(generalId);
      const levelMult = 1 + (level - 1) * 0.1;

      totalPower += Math.floor(statSum * gradeMult * levelMult);
    }

    return totalPower;
  }

  private createMainButtons(width: number): void {
    // 출전 버튼 (메인, 크게) - 이미지 기반
    const battleBtn = new Button(this, width / 2, 480, '⚔️  출전', {
      width: 260,
      height: 54,
      fontSize: '22px',
      variant: 'red',
    }, () => this.goToStageSelect());
    
    // 출전 버튼 강조 펄스
    this.time.delayedCall(1000, () => battleBtn.pulse());

    // 가챠 버튼 - 골드 스타일
    new Button(this, width / 2, 550, '🎰  장수 모집', {
      width: 260,
      height: 50,
      fontSize: '18px',
      variant: 'gold',
    }, () => this.goToGacha());

    // 하위 버튼 행 - 다크 스타일
    new Button(this, width / 2 - 68, 615, '📋 진형', {
      width: 120,
      height: 42,
      fontSize: '15px',
      variant: 'dark',
    }, () => this.goToFormation());

    new Button(this, width / 2 + 68, 615, '👥 장수', {
      width: 120,
      height: 42,
      fontSize: '15px',
      variant: 'dark',
    }, () => this.goToGeneralList());
  }

  private createNavigation(width: number, height: number): void {
    // 하단 네비게이션 배경
    const navY = 740;
    const navBg = drawPanelBackground(this, 0, 700, width, 100, {
      fillColor: 0x0a0a14,
      fillAlpha: 0.98,
      borderColor: 0x333355,
      cornerRadius: 0,
      innerGlow: false,
    });
    
    // 상단 경계선
    this.add.graphics()
      .lineStyle(1, COLORS.UI.gold, 0.3)
      .lineBetween(0, 700, width, 700);

    // 네비게이션 아이콘 매핑
    const navIconKeys: Record<string, string> = {
      '🏠': 'nav_home',
      '⚔️': 'nav_battle',
      '👥': 'nav_generals',
      '📋': 'nav_formation',
      '🎰': 'nav_gacha',
    };

    const navItems = [
      { x: 45, icon: '🏠', label: '홈', active: true, action: () => {} },
      { x: 135, icon: '⚔️', label: '전투', active: false, action: () => this.goToStageSelect() },
      { x: 225, icon: '👥', label: '장수', active: false, action: () => this.goToGeneralList() },
      { x: 315, icon: '📋', label: '진형', active: false, action: () => this.goToFormation() },
      { x: 405, icon: '🎰', label: '모집', active: false, action: () => this.goToGacha() },
    ];

    navItems.forEach(item => {
      const container = this.add.container(item.x, navY);
      
      // 활성 상태 배경
      if (item.active) {
        const activeBg = this.add.graphics();
        activeBg.fillStyle(COLORS.UI.gold, 0.15);
        activeBg.fillRoundedRect(-30, -25, 60, 50, 8);
        container.add(activeBg);
      }
      
      // 아이콘 - 이미지 또는 이모지
      const iconKey = navIconKeys[item.icon];
      let iconObj: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
      
      if (iconKey && this.textures.exists(iconKey)) {
        iconObj = this.add.image(0, -8, iconKey).setScale(0.7);
        container.add(iconObj);
        
        // 활성 상태면 틴트
        if (item.active) {
          iconObj.setTint(0xffd700);
        }
      } else {
        iconObj = this.add.text(0, -10, item.icon, { 
          fontSize: '26px',
        }).setOrigin(0.5);
        container.add(iconObj);
      }
      
      const label = this.add.text(0, 20, item.label, { 
        fontSize: '11px', 
        color: item.active ? '#ffd700' : '#888888',
        fontStyle: item.active ? 'bold' : 'normal',
      }).setOrigin(0.5);
      
      container.add(label);
      container.setSize(70, 55);
      container.setInteractive({ useHandCursor: true });
      
      container.on('pointerdown', item.action);
      
      container.on('pointerover', () => {
        if (!item.active) {
          label.setColor('#cccccc');
          if (iconObj instanceof Phaser.GameObjects.Image) {
            iconObj.setScale(0.8);
          } else {
            iconObj.setScale(1.15);
          }
        }
      });
      
      container.on('pointerout', () => {
        label.setColor(item.active ? '#ffd700' : '#888888');
        if (iconObj instanceof Phaser.GameObjects.Image) {
          iconObj.setScale(0.7);
        } else {
          iconObj.setScale(1);
        }
      });
    });
  }

  private showWelcomeMessage(width: number): void {
    if (!this.userData) return;
    
    const welcomeContainer = this.add.container(width / 2, 100);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(-100, -12, 200, 24, 12);
    
    const text = this.add.text(0, 0, `환영합니다, ${this.userData.nickname}!`, {
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5);
    
    welcomeContainer.add([bg, text]);
    
    this.tweens.add({
      targets: welcomeContainer,
      alpha: 0,
      y: 80,
      delay: 2500,
      duration: 1000,
      onComplete: () => welcomeContainer.destroy(),
    });
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

  updateResources(): void {
    this.userData = this.gameManager.getUserData();
    if (this.userData) {
      this.goldText.setText(this.userData.gold.toLocaleString());
      this.gemsText.setText(this.userData.gems.toString());
      this.staminaText.setText(`${this.userData.stamina}/50`);
      this.drawStaminaBar(this.userData.stamina, 50, 252, 28, 80, 8);
    }
  }

  private createIdleRewardModal(): void {
    this.idleRewardModal = new Modal(this, {
      title: '🎁 방치 보상',
      width: 350,
      height: 350,
    });
  }

  private checkAndShowIdleReward(): void {
    if (!this.idleRewardManager.shouldShowPopup()) {
      return;
    }

    const maxClearedStage = this.userData?.maxClearedStage ?? null;
    const reward = this.idleRewardManager.calculateReward(maxClearedStage);
    
    this.showIdleRewardPopup(reward);
  }

  private showIdleRewardPopup(reward: IdleRewardData): void {
    this.idleRewardModal.clearContent();
    const container = this.idleRewardModal.getContentContainer();

    // 경과 시간 표시
    const timeText = this.add.text(0, -80, `⏰ ${this.idleRewardManager.formatIdleTime()} 방치`, {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(timeText);

    // 보상 아이콘 및 수치
    const goldIcon = this.add.text(-50, -30, '💰', { fontSize: '32px' }).setOrigin(0.5);
    const goldAmount = this.add.text(10, -30, `+${reward.gold.toLocaleString()}`, {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add([goldIcon, goldAmount]);

    const expIcon = this.add.text(-50, 20, '✨', { fontSize: '32px' }).setOrigin(0.5);
    const expAmount = this.add.text(10, 20, `+${reward.exp.toLocaleString()} EXP`, {
      fontSize: '22px',
      color: '#88ff88',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add([expIcon, expAmount]);

    // 수령 버튼
    const claimBtn = new Button(this, 0, 90, '수령하기', {
      width: 180,
      height: 50,
      fontSize: '18px',
      variant: 'gold',
    }, () => this.claimIdleReward(reward));
    container.add(claimBtn);

    // 안내 문구
    const infoText = this.add.text(0, 140, '최대 12시간까지 누적됩니다', {
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5);
    container.add(infoText);

    this.idleRewardModal.show();
  }

  private async claimIdleReward(reward: IdleRewardData): Promise<void> {
    // 보상 지급
    await this.gameManager.addGold(reward.gold);

    // 경험치를 진형 장수들에게 균등 분배
    this.distributeExpToFormation(reward.exp);
    
    // 시간 리셋
    this.idleRewardManager.claimReward();
    
    // 모달 닫기
    this.idleRewardModal.hide();
    
    // UI 업데이트
    this.updateResources();
    
    // 획득 알림 표시
    this.showRewardToast(reward);
  }

  /**
   * 경험치를 현재 활성 진형의 장수들에게 균등 분배
   */
  private distributeExpToFormation(totalExp: number): void {
    if (totalExp <= 0) return;

    const formationManager = FormationManager.load(this.userId);
    const activeFormation = formationManager.getActiveFormation();
    const unitIds = activeFormation.getAllUnits();

    if (unitIds.length === 0) return;

    const ownedGenerals = new OwnedGeneralsManager(this.userId);

    // GeneralForExp 어댑터 생성
    const generals: GeneralForExp[] = unitIds
      .map(generalId => {
        const generalData = (generalsData.generals as Array<{
          id: string; name: string;
        }>).find(g => g.id === generalId);
        if (!generalData) return null;

        const level = ownedGenerals.getGeneralLevel(generalId);
        const exp = ownedGenerals.getGeneralExp(generalId);

        return {
          id: generalId,
          name: generalData.name,
          level,
          exp,
          addExp: (amount: number) => {
            const result = ownedGenerals.addExp(generalId, amount);
            if (result.leveled) {
              console.log(`🎉 ${generalData.name} 레벨업! → Lv.${result.newLevel}`);
            }
          },
        } as GeneralForExp;
      })
      .filter((g): g is GeneralForExp => g !== null);

    RewardManager.distributeExp(totalExp, generals);
  }

  private showRewardToast(reward: IdleRewardData): void {
    const { width } = this.cameras.main;
    
    const toastBg = this.add.graphics();
    toastBg.fillStyle(0x000000, 0.8);
    toastBg.fillRoundedRect(width / 2 - 120, 120, 240, 50, 10);
    toastBg.setDepth(100);

    const toastText = this.add.text(width / 2, 145, 
      `💰 ${reward.gold.toLocaleString()} 획득!`, {
      fontSize: '16px',
      color: '#ffd700',
    }).setOrigin(0.5).setDepth(101);

    this.tweens.add({
      targets: [toastBg, toastText],
      alpha: 0,
      y: '-=30',
      delay: 2000,
      duration: 500,
      onComplete: () => {
        toastBg.destroy();
        toastText.destroy();
      }
    });
  }
}
