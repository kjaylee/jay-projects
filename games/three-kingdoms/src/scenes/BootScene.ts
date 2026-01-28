import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 로딩에 필요한 최소 에셋만 로드
    this.load.setPath('assets/');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
