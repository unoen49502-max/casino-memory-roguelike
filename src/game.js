// Phaser初期化・Scene登録
// 解像度1280×720、背景色は暗い赤紫系（#1a0a14）
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a0a14',
  scene: [
    BootScene,
    TitleScene,
    LobbyScene,
    CharmSelectScene,
    RewardScene,
    ShopScene,
    BattleScene,
    ResultScene,
    PauseMenuScene,
    SettingsScene,
    GalleryScene,
  ],
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);
