import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.createProgressBar();
    
    // 로딩 이벤트
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffd700, 1);
      this.progressBar.fillRect(75, 390, 300 * value, 20);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
    });

    // TODO: 실제 에셋 로드
    // this.load.image('general_guanyu', 'images/generals/guanyu.png');
  }

  private createProgressBar(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(70, 385, 310, 30);

    this.progressBar = this.add.graphics();

    const loadingText = this.add.text(width / 2, height / 2 - 50, '삼국지 패왕전', {
      fontSize: '32px',
      color: '#ffd700',
      fontStyle: 'bold',
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2 + 30, '로딩 중...', {
      fontSize: '18px',
      color: '#ffffff',
    });
    percentText.setOrigin(0.5, 0.5);
  }

  create(): void {
    this.scene.start('LoginScene');
  }
}
