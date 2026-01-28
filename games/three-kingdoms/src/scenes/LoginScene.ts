import Phaser from 'phaser';
import { supabase, isOnline } from '../services/SupabaseClient';
import { AuthService } from '../services/AuthService';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 타이틀
    this.add.text(width / 2, 150, '⚔️ 삼국지 패왕전', {
      fontSize: '36px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 200, 'Three Kingdoms: Warlord', {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);

    // 게스트 로그인 버튼
    const guestButton = this.createButton(width / 2, 400, '🎮 게스트로 시작', () => {
      this.startAsGuest();
    });

    // Google 로그인 버튼 (온라인 모드)
    if (isOnline()) {
      this.createButton(width / 2, 480, '🔵 Google 로그인', () => {
        this.loginWithGoogle();
      });
    }

    // 오프라인 모드 표시
    if (!isOnline()) {
      this.add.text(width / 2, 700, '⚠️ 오프라인 모드', {
        fontSize: '14px',
        color: '#ff6b6b',
      }).setOrigin(0.5);
    }
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x8b0000, 1);
    bg.fillRoundedRect(-140, -25, 280, 50, 10);
    bg.lineStyle(2, 0xffd700);
    bg.strokeRoundedRect(-140, -25, 280, 50, 10);
    
    const label = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    button.add([bg, label]);
    button.setSize(280, 50);
    button.setInteractive({ useHandCursor: true });
    
    button.on('pointerover', () => bg.setAlpha(0.8));
    button.on('pointerout', () => bg.setAlpha(1));
    button.on('pointerdown', callback);

    return button;
  }

  private async startAsGuest(): Promise<void> {
    // 게스트 모드로 시작 (로컬 저장)
    const guestId = localStorage.getItem('guestId') || `guest_${Date.now()}`;
    localStorage.setItem('guestId', guestId);
    
    this.scene.start('MainScene', { userId: guestId, isGuest: true });
  }

  private async loginWithGoogle(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (err) {
      console.error('Login error:', err);
    }
  }
}
