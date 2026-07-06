// bootScene：起動時のアセット・データ読込用。
// 読み込み完了後、TitleSceneへ遷移する。
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 定義データ（JSON）。パスはindex.html（src/）基準。
    this.load.json('enemies', 'data/enemies.json');
    this.load.json('characters', 'data/characters.json');
    this.load.json('reactions', 'data/reactions.json');
    this.load.json('charms', 'data/charms.json');
    this.load.json('rewards', 'data/rewards.json');
    this.load.json('special_cards', 'data/special_cards.json');
    this.load.json('modifiers', 'data/modifiers.json');
  }

  create() {
    this.scene.start('TitleScene');
  }
}
