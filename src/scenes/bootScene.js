// bootScene：起動時のアセット読込用。
// 現状は読み込むアセットが無いため、即座にTitleSceneへ遷移する。
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 将来：ここで共通アセットをロードする
  }

  create() {
    this.scene.start('TitleScene');
  }
}
