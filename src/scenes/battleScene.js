// battleScene：戦闘シーン。
// TASK_000時点では「BATTLE SCENE」テキストのみの空Scene。
class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add
      .text(cx, cy, 'BATTLE SCENE', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#f5e6d8',
      })
      .setOrigin(0.5);
  }
}
