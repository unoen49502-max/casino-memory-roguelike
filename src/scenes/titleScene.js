// titleScene：タイトル表示。クリックでBattleSceneへ遷移する。
class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add
      .text(cx, cy, 'CASINO ROGUELIKE (PROTOTYPE)', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#f5e6d8',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 60, 'クリックでスタート', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#b08cae',
      })
      .setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.scene.start('BattleScene');
    });
  }
}
