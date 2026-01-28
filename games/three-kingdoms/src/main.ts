import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { LoginScene } from './scenes/LoginScene';
import { MainScene } from './scenes/MainScene';
import { BattleScene } from './scenes/BattleScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { GachaScene } from './scenes/GachaScene';
import { GeneralListScene } from './scenes/GeneralListScene';
import { FormationScene } from './scenes/FormationScene';

// 게임 기본 해상도
const baseWidth = 450;
const baseHeight = 800;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: baseWidth,
  height: baseHeight,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false,
  },
  scene: [
    BootScene,
    PreloadScene,
    LoginScene,
    MainScene,
    BattleScene,
    StageSelectScene,
    GachaScene,
    GeneralListScene,
    FormationScene,
  ],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
};

const game = new Phaser.Game(config);

export default game;
