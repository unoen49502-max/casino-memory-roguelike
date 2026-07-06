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
    this.load.json('hands_reference', 'data/hands_reference.json');
  }

  create() {
    // 役倍率は hands_reference.json を唯一の出典にする（表示とロジックの不整合防止）。
    const hr = this.cache.json.get('hands_reference') || [];
    hr.forEach((h) => { HAND_MULTIPLIERS[h.key] = h.multiplier; });

    // 設定の読込（Electronのみ。ブラウザ等では既定値）。
    loadSettings();
    applyAudioSettings(this.game);

    this.scene.start('TitleScene');
  }
}
