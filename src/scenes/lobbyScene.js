// lobbyScene：ロビー（最小実装）。「ラン開始」ボタンのみ。
// 会話・永続要素はプロト対象外。
class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add
      .text(cx, cy - 120, 'ロビー', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#f5e6d8',
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(cx, cy, 'ラン開始 ▶', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        color: '#ffe27a',
        backgroundColor: '#3a1a2c',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.startBtn = btn;
    btn.on('pointerdown', () => this._startRun());
  }

  _startRun() {
    // ラン初期化（HP50・チップ0・チャーム空）。開始時刻を記録。
    const run = this.registry.get('run') || this._newRun();
    run.reset(this._nowMs());
    this.registry.set('run', run);
    routeToCurrentStep(this);
  }

  _newRun() {
    const run = new RunManager();
    this.registry.set('run', run);
    return run;
  }

  // 時刻取得（テスト時に固定できるようregistryを優先）。
  _nowMs() {
    const forced = this.registry.get('nowMs');
    return forced != null ? forced : Date.now();
  }
}
