import Phaser from 'phaser';
import { BattleManager } from '../managers/BattleManager';
import { GameManager } from '../managers/GameManager';
import { Formation } from '../entities/Formation';
import { FormationManager } from '../managers/FormationManager';
import { Button } from '../ui/Button';
import { 
  drawGradientBackground, 
  drawPanelBackground,
  showDamagePopup,
  flashScreen,
  COLORS 
} from '../ui/effects';
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
  private speedBtn!: Phaser.GameObjects.Container;
  private currentSpeed: number = 1;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { userId: string; stageId: string; stageData?: StageData; formationSlotId?: number }): void {
    this.userId = data.userId;
    this.stageId = data.stageId;
    this.formationSlotId = data.formationSlotId;
    
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
    this.cameras.main.fadeIn(300);
    
    this.gameManager = GameManager.getInstance();
    this.battleManager = new BattleManager(this);
    this.battleManager.setGameManager(this.gameManager);

    this.loadFormation();
    this.createBattleUI();
    this.createUnits();
    this.showStoryText();

    this.time.delayedCall(2000, () => {
      if (this.formation.isValid()) {
        this.battleManager.startBattle(this.formation, this.stageId);
      } else {
        this.showNoFormationError();
      }
    });
  }

  private loadFormation(): void {
    const formationManager = FormationManager.load(this.userId);
    
    if (this.formationSlotId !== undefined) {
      const slot = formationManager.getSlot(this.formationSlotId);
      if (slot && slot.formation.isValid()) {
        this.formation = slot.formation;
        return;
      }
    }
    
    const activeSlot = formationManager.getActiveSlot();
    if (activeSlot.formation.isValid()) {
      this.formation = activeSlot.formation;
      return;
    }
    
    const savedKey = `formation_${this.userId}`;
    const saved = localStorage.getItem(savedKey);
    
    if (saved) {
      const json = JSON.parse(saved);
      this.formation = Formation.fromJSON(json);
      return;
    }
    
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
    
    const storyContainer = this.add.container(width / 2, height / 2);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-200, -40, 400, 80, 12);
    bg.lineStyle(2, COLORS.UI.gold, 0.5);
    bg.strokeRoundedRect(-200, -40, 400, 80, 12);
    
    const storyText = this.add.text(0, 0, this.stageData.storyText, {
      fontSize: '15px',
      color: '#ffffff',
      wordWrap: { width: 380 },
      align: 'center',
    }).setOrigin(0.5);

    storyContainer.add([bg, storyText]);
    storyContainer.setDepth(100);

    // 타이핑 효과 시뮬레이션
    storyText.setAlpha(0);
    this.tweens.add({
      targets: storyText,
      alpha: 1,
      duration: 500,
    });

    this.tweens.add({
      targets: storyContainer,
      alpha: 0,
      y: height / 2 - 50,
      delay: 1500,
      duration: 500,
      onComplete: () => storyContainer.destroy(),
    });
  }

  private showNoFormationError(): void {
    const { width, height } = this.cameras.main;
    
    const container = this.add.container(width / 2, height / 2);
    
    const bg = drawPanelBackground(this, -160, -60, 320, 120);
    
    const text = this.add.text(0, -20, '⚠️ 진형에 장수가 없습니다!', {
      fontSize: '18px',
      color: '#ff4444',
      align: 'center',
    }).setOrigin(0.5);
    
    const subText = this.add.text(0, 10, '진형 편집에서 장수를 배치하세요.', {
      fontSize: '13px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    container.add([bg, text, subText]);

    new Button(this, width / 2, height / 2 + 100, '📋 진형 편집으로', {
      width: 200,
      height: 44,
      variant: 'dark',
    }, () => {
      this.scene.start('FormationScene', { userId: this.userId });
    });
  }

  private createBattleUI(): void {
    const { width, height } = this.cameras.main;

    // === 동적 배경 ===
    this.createBattleBackground(width, height);

    // === 헤더 ===
    this.createHeader(width);

    // === 전장 영역 구분 ===
    this.createBattleAreas(width, height);

    // === 컨트롤 버튼들 ===
    this.createControls(width);
  }

  private createBattleBackground(width: number, height: number): void {
    // 기본 그라디언트 (전장 분위기)
    drawGradientBackground(this, 0, 0, width, height, 0x2d1b4e, 0x0a0514);
    
    // 전장 분위기 파티클
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(80, height);
      const size = Phaser.Math.Between(1, 2);
      
      const particle = this.add.graphics();
      particle.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.3));
      particle.fillCircle(x, y, size);
      
      // 천천히 떠오르는 효과
      this.tweens.add({
        targets: particle,
        y: particle.y - 100,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => {
          particle.x = Phaser.Math.Between(0, width);
          particle.y = height + 10;
          particle.alpha = Phaser.Math.FloatBetween(0.1, 0.3);
        },
      });
    }
    
    // 중앙 분리선 (전장 효과)
    const dividerY = 400;
    const divider = this.add.graphics();
    divider.lineStyle(3, 0x8b0000, 0.8);
    divider.lineBetween(0, dividerY, width, dividerY);
    
    // 분리선 글로우
    divider.lineStyle(8, 0xff0000, 0.1);
    divider.lineBetween(0, dividerY, width, dividerY);
    
    // VS 텍스트
    const vsText = this.add.text(width / 2, dividerY, 'VS', {
      fontSize: '20px',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: vsText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createHeader(width: number): void {
    // 헤더 배경
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x000000, 0.85);
    headerBg.fillRect(0, 0, width, 70);
    headerBg.lineStyle(1, COLORS.UI.gold, 0.3);
    headerBg.lineBetween(0, 70, width, 70);

    // 스테이지 정보
    const stageName = this.stageData?.stageName ?? this.stageId;
    const chapterName = this.stageData?.chapterName ?? '';
    
    // 보스 스테이지 표시
    if (this.stageData?.isBoss) {
      this.add.text(width / 2, 5, '👹 BOSS', {
        fontSize: '11px',
        color: '#ff4444',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0);
    }
    
    this.add.text(width / 2, 28, stageName, {
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(width / 2, 52, chapterName, {
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5);
  }

  private createBattleAreas(width: number, height: number): void {
    // 적군 영역 라벨
    const enemyLabel = this.add.container(30, 95);
    const enemyBg = this.add.graphics();
    enemyBg.fillStyle(0x440000, 0.6);
    enemyBg.fillRoundedRect(0, -10, 70, 24, 4);
    const enemyText = this.add.text(35, 2, '👹 적군', { 
      fontSize: '13px', 
      color: '#ff6666',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enemyLabel.add([enemyBg, enemyText]);

    // 아군 영역 라벨
    const allyLabel = this.add.container(30, 420);
    const allyBg = this.add.graphics();
    allyBg.fillStyle(0x004400, 0.6);
    allyBg.fillRoundedRect(0, -10, 70, 24, 4);
    const allyText = this.add.text(35, 2, '⚔️ 아군', { 
      fontSize: '13px', 
      color: '#66ff66',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    allyLabel.add([allyBg, allyText]);
  }

  private createControls(width: number): void {
    // 뒤로 가기 버튼
    new Button(this, 50, 35, '← 포기', {
      width: 80,
      height: 36,
      fontSize: '13px',
      variant: 'dark',
      useImage: false,
    }, () => {
      this.scene.start('StageSelectScene', { 
        userId: this.userId,
        clearedStages: this.gameManager.getUserData()?.clearedStages ?? [],
      });
    });

    // 스피드 버튼
    this.createSpeedButton(width);

    // AUTO 표시
    const autoContainer = this.add.container(width - 45, 55);
    const autoBg = this.add.graphics();
    autoBg.fillStyle(0x006666, 0.6);
    autoBg.fillRoundedRect(-25, -10, 50, 20, 10);
    const autoText = this.add.text(0, 0, '🤖 AUTO', {
      fontSize: '10px',
      color: '#00ffff',
    }).setOrigin(0.5);
    autoContainer.add([autoBg, autoText]);
    
    // 깜빡임 효과
    this.tweens.add({
      targets: autoContainer,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  private createSpeedButton(width: number): void {
    this.speedBtn = this.add.container(width - 110, 35);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x333355, 1);
    bg.fillRoundedRect(-30, -16, 60, 32, 8);
    bg.lineStyle(2, COLORS.UI.gold, 0.5);
    bg.strokeRoundedRect(-30, -16, 60, 32, 8);
    
    const speedText = this.add.text(0, 0, `${this.currentSpeed}x`, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    this.speedBtn.add([bg, speedText]);
    this.speedBtn.setSize(60, 32);
    this.speedBtn.setInteractive({ useHandCursor: true });
    
    this.speedBtn.on('pointerdown', () => {
      this.currentSpeed = this.currentSpeed === 1 ? 2 : this.currentSpeed === 2 ? 4 : 1;
      speedText.setText(`${this.currentSpeed}x`);
      this.battleManager.setSpeed(this.currentSpeed);
      
      // 클릭 피드백
      this.tweens.add({
        targets: this.speedBtn,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 50,
        yoyo: true,
      });
    });
    
    this.speedBtn.on('pointerover', () => {
      this.tweens.add({
        targets: this.speedBtn,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
      });
    });
    
    this.speedBtn.on('pointerout', () => {
      this.tweens.add({
        targets: this.speedBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });
  }

  private createUnits(): void {
    const { width } = this.cameras.main;

    const cellWidth = 100;
    const cellHeight = 85;
    const startX = (width - 3 * cellWidth) / 2 + cellWidth / 2;

    const enemyStartY = 160;
    const playerStartY = 470;

    // 적 유닛 생성
    if (this.stageData?.enemies) {
      this.stageData.enemies.forEach((enemy, index) => {
        const enemyData = stagesData.enemyGenerals.find(g => g.id === enemy.generalId);
        if (enemyData) {
          const x = startX + enemy.position.col * cellWidth;
          const y = enemyStartY + enemy.position.row * cellHeight;
          const container = this.createUnit(x, y, enemyData.name, '👹', false, enemy.level);
          this.enemyUnitContainers.set(`${enemy.position.row}_${enemy.position.col}`, container);
          
          // 등장 애니메이션
          container.setAlpha(0);
          container.setScale(0.5);
          this.tweens.add({
            targets: container,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            delay: index * 100,
            ease: 'Back.easeOut',
          });
        }
      });
    }

    // 아군 유닛 생성
    const formationData = this.formation.toJSON();
    formationData.positions.forEach((pos, index) => {
      const generalData = generalsData.generals.find(g => g.id === pos.generalId);
      if (generalData) {
        const x = startX + pos.col * cellWidth;
        const visualRow = 2 - pos.row;
        const y = playerStartY + visualRow * cellHeight;
        const emoji = this.getClassEmoji(generalData.class);
        const container = this.createUnit(x, y, generalData.name, emoji, true, 1);
        this.playerUnitContainers.set(`${pos.row}_${pos.col}`, container);
        
        // 등장 애니메이션
        container.setAlpha(0);
        container.y += 50;
        this.tweens.add({
          targets: container,
          alpha: 1,
          y: y,
          duration: 400,
          delay: index * 100 + 200,
          ease: 'Power2',
        });
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
    
    // 그림자
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillEllipse(0, 38, 50, 15);
    container.add(shadow);
    
    // 외곽 글로우
    const glow = this.add.graphics();
    glow.fillStyle(isAlly ? 0x00ff00 : 0xff0000, 0.15);
    glow.fillCircle(0, 0, 38);
    container.add(glow);
    
    // 메인 원형 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      isAlly ? 0x006600 : 0x660000,
      isAlly ? 0x006600 : 0x660000,
      isAlly ? 0x003300 : 0x330000,
      isAlly ? 0x003300 : 0x330000,
      1
    );
    bg.fillCircle(0, 0, 32);
    bg.lineStyle(3, isAlly ? 0x00ff00 : 0xff4444);
    bg.strokeCircle(0, 0, 32);
    container.add(bg);

    // 유닛 아이콘
    const icon = this.add.text(0, -2, emoji, { fontSize: '30px' }).setOrigin(0.5);
    container.add(icon);

    // HP 바 배경
    const hpBgWidth = 54;
    const hpBarY = 40;
    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x333333, 1);
    hpBg.fillRoundedRect(-hpBgWidth / 2, hpBarY, hpBgWidth, 8, 4);
    hpBg.lineStyle(1, 0x555555);
    hpBg.strokeRoundedRect(-hpBgWidth / 2, hpBarY, hpBgWidth, 8, 4);
    container.add(hpBg);

    // HP 바
    const hpBar = this.add.graphics();
    hpBar.fillStyle(0x00ff00, 1);
    hpBar.fillRoundedRect(-hpBgWidth / 2 + 1, hpBarY + 1, hpBgWidth - 2, 6, 3);
    container.add(hpBar);

    // 이름
    const nameText = this.add.text(0, 55, name, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(nameText);

    // 레벨 뱃지
    const lvBadge = this.add.container(28, -28);
    const lvBg = this.add.graphics();
    lvBg.fillStyle(0x000000, 0.8);
    lvBg.fillCircle(0, 0, 12);
    lvBg.lineStyle(1, COLORS.UI.gold, 0.5);
    lvBg.strokeCircle(0, 0, 12);
    const lvText = this.add.text(0, 0, `${level}`, {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    lvBadge.add([lvBg, lvText]);
    container.add(lvBadge);

    container.setData('hpBar', hpBar);
    container.setData('hpBgWidth', hpBgWidth);
    container.setData('hpBarY', hpBarY);
    container.setData('hp', 100);
    container.setData('maxHp', 100);
    container.setData('isAlive', true);
    container.setData('icon', icon);

    return container;
  }

  update(time: number, delta: number): void {
    this.battleManager.update(delta);
    this.updateUnitDisplays();
  }

  private updateUnitDisplays(): void {
    // 플레이어 유닛 업데이트
    const playerUnits = this.battleManager.getPlayerUnits();
    playerUnits.forEach(unit => {
      const key = `${unit.position.row}_${unit.position.col}`;
      const container = this.playerUnitContainers.get(key);
      if (container) {
        this.updateUnitHP(container, unit.stats.currentHp, unit.stats.maxHp, unit.isAlive);
      }
    });

    // 적 유닛 업데이트
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
    const hpBarY = container.getData('hpBarY') as number;
    const wasAlive = container.getData('isAlive') as boolean;

    if (hpBar) {
      hpBar.clear();
      
      if (!isAlive) {
        if (wasAlive) {
          // 사망 애니메이션
          container.setData('isAlive', false);
          this.tweens.add({
            targets: container,
            alpha: 0.2,
            scaleX: 0.8,
            scaleY: 0.8,
            angle: 15,
            duration: 300,
          });
        }
        return;
      }

      const hpPercent = currentHp / maxHp;
      const prevHp = container.getData('hp') as number;
      
      // HP 감소 시 데미지 표시
      if (prevHp > currentHp) {
        const damage = prevHp - currentHp;
        const actualDamage = Math.floor(damage * maxHp / 100);
        showDamagePopup(this, container.x, container.y - 40, actualDamage, damage > 20);
        
        // 피격 효과
        this.tweens.add({
          targets: container,
          x: container.x + 5,
          duration: 50,
          yoyo: true,
          repeat: 2,
        });
      }
      
      container.setData('hp', currentHp);
      
      // HP 바 색상
      let color: number;
      if (hpPercent > 0.5) {
        color = 0x00ff00;
      } else if (hpPercent > 0.25) {
        color = 0xffff00;
      } else {
        color = 0xff4444;
      }
      
      hpBar.fillStyle(color, 1);
      hpBar.fillRoundedRect(-hpBgWidth / 2 + 1, hpBarY + 1, (hpBgWidth - 2) * hpPercent, 6, 3);
    }
  }

  // 스킬 발동 효과 (BattleManager에서 호출)
  showSkillEffect(unitContainer: Phaser.GameObjects.Container, skillName: string): void {
    const { width, height } = this.cameras.main;
    
    // 화면 플래시
    flashScreen(this, 0xffffff, 150);
    
    // 스킬명 표시
    const skillText = this.add.text(width / 2, height / 2 - 100, skillName, {
      fontSize: '28px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(200);
    
    skillText.setScale(0.5);
    this.tweens.add({
      targets: skillText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: skillText,
          alpha: 0,
          y: skillText.y - 30,
          duration: 500,
          onComplete: () => skillText.destroy(),
        });
      },
    });
    
    // 유닛 강조 효과
    const icon = unitContainer.getData('icon') as Phaser.GameObjects.Text;
    if (icon) {
      this.tweens.add({
        targets: icon,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 200,
        yoyo: true,
      });
    }
  }
}
