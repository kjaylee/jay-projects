import Phaser from 'phaser';
import { supabase, isOnline } from '../services/SupabaseClient';
import { Button } from '../ui/Button';
import { 
  drawGradientBackground, 
  createStarfieldParticles, 
  createFloatingClouds,
  createGlowText,
  COLORS 
} from '../ui/effects';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // === 동적 배경 ===
    this.createAnimatedBackground(width, height);

    // === 타이틀 로고 ===
    this.createTitle(width);

    // === 버튼 영역 ===
    this.createButtons(width, height);

    // === 하단 상태 ===
    this.createStatusInfo(width, height);
  }

  private createAnimatedBackground(width: number, height: number): void {
    // 기본 그라디언트 배경 (진한 보라색 계열)
    drawGradientBackground(this, 0, 0, width, height, 0x1a0f2e, 0x0a0514);
    
    // 별 파티클
    createStarfieldParticles(this, width, height, 60);
    
    // 떠다니는 구름/안개
    createFloatingClouds(this, width, height, 4);
    
    // 하단 안개 효과
    const fog = this.add.graphics();
    fog.fillGradientStyle(0x1a0f2e, 0x1a0f2e, 0x0a0514, 0x0a0514, 0.5, 0.5, 0, 0);
    fog.fillRect(0, height - 150, width, 150);
  }

  private createTitle(width: number): void {
    // 메인 타이틀 (글로우 효과)
    const titleContainer = createGlowText(
      this, 
      width / 2, 
      120, 
      '삼국지 패왕전', 
      '42px', 
      '#ffd700', 
      0xffa500
    );
    
    // 검 아이콘 (양쪽)
    const swordLeft = this.add.text(width / 2 - 160, 120, '⚔️', { fontSize: '32px' }).setOrigin(0.5);
    const swordRight = this.add.text(width / 2 + 160, 120, '⚔️', { fontSize: '32px' }).setOrigin(0.5);
    
    // 검 흔들림 애니메이션
    this.tweens.add({
      targets: swordLeft,
      angle: -15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: swordRight,
      angle: 15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // 서브타이틀
    this.add.text(width / 2, 175, 'Three Kingdoms: Warlord', {
      fontSize: '16px',
      color: '#888888',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    
    // 장식 라인
    const line = this.add.graphics();
    line.lineStyle(2, 0xffd700, 0.5);
    line.lineBetween(width / 2 - 120, 200, width / 2 + 120, 200);
    line.fillStyle(0xffd700, 1);
    line.fillCircle(width / 2 - 120, 200, 4);
    line.fillCircle(width / 2 + 120, 200, 4);
    line.fillCircle(width / 2, 200, 6);
  }

  private createButtons(width: number, height: number): void {
    // 중앙 영웅 실루엣 (배경 장식)
    this.add.text(width / 2, 320, '🏯', { fontSize: '80px' }).setOrigin(0.5).setAlpha(0.3);
    
    // 게스트 로그인 버튼 (메인) - 빨간색 스타일
    const guestButton = new Button(this, width / 2, 430, '🎮  게스트로 시작', {
      width: 280,
      height: 54,
      fontSize: '20px',
      variant: 'red',
    }, () => this.startAsGuest());
    
    // 펄스 효과로 주목
    guestButton.pulse();
    
    // Google 로그인 버튼 (온라인 모드) - 다크 스타일
    if (isOnline()) {
      new Button(this, width / 2, 510, '🔵  Google 로그인', {
        width: 280,
        height: 54,
        fontSize: '18px',
        variant: 'dark',
      }, () => this.loginWithGoogle());
    }
    
    // 하단 안내 텍스트
    this.add.text(width / 2, 590, '계정 없이도 즉시 플레이 가능!', {
      fontSize: '13px',
      color: '#666666',
    }).setOrigin(0.5);
  }

  private createStatusInfo(width: number, height: number): void {
    // 버전 정보
    this.add.text(10, height - 25, 'v0.1.0 beta', {
      fontSize: '11px',
      color: '#444444',
    });
    
    // 온라인/오프라인 상태
    if (isOnline()) {
      const onlineIndicator = this.add.container(width - 80, height - 25);
      const dot = this.add.graphics();
      dot.fillStyle(0x00ff00, 1);
      dot.fillCircle(0, 5, 4);
      const text = this.add.text(10, 0, '온라인', {
        fontSize: '11px',
        color: '#00ff00',
      });
      onlineIndicator.add([dot, text]);
    } else {
      const offlineContainer = this.add.container(width / 2, height - 50);
      
      const bg = this.add.graphics();
      bg.fillStyle(0x442222, 0.8);
      bg.fillRoundedRect(-100, -12, 200, 24, 12);
      
      const text = this.add.text(0, 0, '⚠️ 오프라인 모드', {
        fontSize: '13px',
        color: '#ff6b6b',
      }).setOrigin(0.5);
      
      offlineContainer.add([bg, text]);
    }
  }

  private async startAsGuest(): Promise<void> {
    // 페이드 아웃 전환
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const guestId = localStorage.getItem('guestId') || `guest_${Date.now()}`;
      localStorage.setItem('guestId', guestId);
      
      this.scene.start('MainScene', { userId: guestId, isGuest: true });
    });
  }

  private async loginWithGoogle(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (err) {
      console.error('Login error:', err);
      // 에러 표시
      const errorText = this.add.text(
        this.cameras.main.width / 2, 
        640, 
        '로그인 실패. 다시 시도해주세요.', 
        { fontSize: '14px', color: '#ff4444' }
      ).setOrigin(0.5);
      
      this.time.delayedCall(3000, () => errorText.destroy());
    }
  }
}
