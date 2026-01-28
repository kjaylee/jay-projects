import Phaser from 'phaser';
import { drawGradientBackground, createGlowText } from '../ui/effects';
import generalsIndex from '../../assets/generals/index.json';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private percentText!: Phaser.GameObjects.Text;
  private assetText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.createLoadingUI();
    this.setupLoadingEvents();
    this.loadAssets();
  }

  private createLoadingUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    drawGradientBackground(this, 0, 0, width, height, 0x1a0f2e, 0x0a0514);

    // 타이틀 로고
    createGlowText(this, width / 2, height / 2 - 100, '삼국지 패왕전', '36px', '#ffd700', 0xffa500);

    // 진행 바 컨테이너
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222233, 0.9);
    this.progressBox.fillRoundedRect(width / 2 - 160, height / 2 + 20, 320, 40, 10);
    this.progressBox.lineStyle(2, 0x3a3a5e);
    this.progressBox.strokeRoundedRect(width / 2 - 160, height / 2 + 20, 320, 40, 10);

    // 진행 바
    this.progressBar = this.add.graphics();

    // 퍼센트 텍스트
    this.percentText = this.add.text(width / 2, height / 2 + 40, '0%', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 로딩 중 텍스트
    const loadingText = this.add.text(width / 2, height / 2 + 90, '장수들을 소환하는 중...', {
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5);

    // 로딩 텍스트 애니메이션
    this.tweens.add({
      targets: loadingText,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // 현재 로딩 중인 에셋
    this.assetText = this.add.text(width / 2, height / 2 + 120, '', {
      fontSize: '11px',
      color: '#555555',
    }).setOrigin(0.5);

    // 하단 팁
    const tips = [
      '💡 진형을 잘 배치하면 전투가 유리해집니다!',
      '💡 장수의 스킬을 확인해보세요!',
      '💡 SSR 이상 장수는 각성이 가능합니다!',
      '💡 진형 시너지를 활용하세요!',
    ];
    const randomTip = tips[Phaser.Math.Between(0, tips.length - 1)];
    
    this.add.text(width / 2, height - 50, randomTip, {
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);
  }

  private setupLoadingEvents(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      
      // 그라디언트 효과 진행 바
      this.progressBar.fillGradientStyle(0xffd700, 0xffa500, 0xffd700, 0xffa500, 1);
      this.progressBar.fillRoundedRect(
        width / 2 - 155,
        height / 2 + 25,
        310 * value,
        30,
        8
      );
      
      this.percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.assetText.setText(file.key);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.percentText.destroy();
      this.assetText.destroy();
    });
  }

  private loadAssets(): void {
    // ==================== UI 에셋 로드 ====================
    
    // 버튼
    this.load.svg('btn_red', 'assets/ui/buttons/btn_red.svg', { width: 200, height: 50 });
    this.load.svg('btn_red_pressed', 'assets/ui/buttons/btn_red_pressed.svg', { width: 200, height: 50 });
    this.load.svg('btn_gold', 'assets/ui/buttons/btn_gold.svg', { width: 200, height: 50 });
    this.load.svg('btn_dark', 'assets/ui/buttons/btn_dark.svg', { width: 200, height: 50 });
    
    // 패널
    this.load.svg('panel_dark', 'assets/ui/panels/panel_dark.svg', { width: 300, height: 400 });
    this.load.svg('panel_header', 'assets/ui/panels/panel_header.svg', { width: 280, height: 50 });
    this.load.svg('modal_bg', 'assets/ui/panels/modal_bg.svg', { width: 350, height: 250 });
    
    // 카드 프레임
    this.load.svg('card_frame_n', 'assets/ui/cards/card_frame_n.svg', { width: 100, height: 140 });
    this.load.svg('card_frame_r', 'assets/ui/cards/card_frame_r.svg', { width: 100, height: 140 });
    this.load.svg('card_frame_sr', 'assets/ui/cards/card_frame_sr.svg', { width: 100, height: 140 });
    this.load.svg('card_frame_ssr', 'assets/ui/cards/card_frame_ssr.svg', { width: 100, height: 140 });
    this.load.svg('card_frame_ur', 'assets/ui/cards/card_frame_ur.svg', { width: 100, height: 140 });
    
    // 아이콘
    this.load.svg('icon_gold', 'assets/ui/icons/icon_gold.svg', { width: 32, height: 32 });
    this.load.svg('icon_gem', 'assets/ui/icons/icon_gem.svg', { width: 32, height: 32 });
    this.load.svg('icon_stamina', 'assets/ui/icons/icon_stamina.svg', { width: 32, height: 32 });
    this.load.svg('icon_attack', 'assets/ui/icons/icon_attack.svg', { width: 32, height: 32 });
    this.load.svg('icon_defense', 'assets/ui/icons/icon_defense.svg', { width: 32, height: 32 });
    this.load.svg('icon_speed', 'assets/ui/icons/icon_speed.svg', { width: 32, height: 32 });
    
    // 바
    this.load.svg('bar_health_bg', 'assets/ui/bars/bar_health_bg.svg', { width: 200, height: 20 });
    this.load.svg('bar_health_fill', 'assets/ui/bars/bar_health_fill.svg', { width: 196, height: 16 });
    this.load.svg('bar_exp_fill', 'assets/ui/bars/bar_exp_fill.svg', { width: 196, height: 16 });
    this.load.svg('bar_rage_fill', 'assets/ui/bars/bar_rage_fill.svg', { width: 196, height: 16 });
    
    // 네비게이션 아이콘
    this.load.svg('nav_home', 'assets/ui/nav/nav_home.svg', { width: 48, height: 48 });
    this.load.svg('nav_battle', 'assets/ui/nav/nav_battle.svg', { width: 48, height: 48 });
    this.load.svg('nav_generals', 'assets/ui/nav/nav_generals.svg', { width: 48, height: 48 });
    this.load.svg('nav_gacha', 'assets/ui/nav/nav_gacha.svg', { width: 48, height: 48 });
    this.load.svg('nav_formation', 'assets/ui/nav/nav_formation.svg', { width: 48, height: 48 });

    // ==================== 장수 초상화 로드 ====================
    generalsIndex.portraits.forEach(portrait => {
      this.load.image(
        `portrait_${portrait.id}`,
        `assets/generals/${portrait.file}`
      );
    });

    // 기타 에셋들
    // this.load.image('background_battle', 'assets/images/backgrounds/battle.png');
    // this.load.image('background_castle', 'assets/images/backgrounds/castle.png');
    
    // 오디오 (나중에 추가)
    // this.load.audio('bgm_main', 'assets/audio/bgm_main.mp3');
    // this.load.audio('sfx_click', 'assets/audio/sfx_click.mp3');
    // this.load.audio('sfx_skill', 'assets/audio/sfx_skill.mp3');
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 로딩 완료 메시지
    const completeText = this.add.text(width / 2, height / 2 + 40, '✅ 준비 완료!', {
      fontSize: '20px',
      color: '#00ff00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 페이드 아웃 후 로그인 씬으로
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('LoginScene');
      });
    });
  }
}
