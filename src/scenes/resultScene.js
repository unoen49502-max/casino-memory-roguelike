// resultScene：結果画面。勝敗／獲得チップ合計／今回の装備チャーム一覧を表示。
// ボタン2つ：「ロビーへ」「もう1ラン直行」。
class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create() {
    const run = this.registry.get('run');
    const allCharms = this.cache.json.get('charms') || {};
    const cx = this.scale.width / 2;

    const cleared = run.outcome === 'clear';
    // 所要時間（目標5〜8分の検証用）をコンソールに出力
    const elapsed = run.elapsedMs(this._nowMs());
    console.log(`[RUN] result=${run.outcome} chips=${run.chips} elapsed=${(elapsed / 1000).toFixed(1)}s`);

    this.add
      .text(cx, 90, cleared ? 'RUN CLEAR' : 'DEFEAT', {
        fontFamily: 'sans-serif', fontSize: '56px', fontStyle: 'bold',
        color: cleared ? '#ffe27a' : '#ff6a6a', stroke: '#000000', strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 170, `獲得チップ合計：${run.chips}`, { fontFamily: 'sans-serif', fontSize: '26px', color: '#f5e6d8' })
      .setOrigin(0.5);
    // チップ→お菓子変換は表示だけ（未実装のプレースホルダー文言）
    this.add
      .text(cx, 205, `お菓子 +${run.chips}（未実装）`, { fontFamily: 'sans-serif', fontSize: '16px', color: '#8a6a7c' })
      .setOrigin(0.5);

    // 装備チャーム一覧
    this.add
      .text(cx, 260, '今回の装備チャーム', { fontFamily: 'sans-serif', fontSize: '18px', color: '#ff9ecb' })
      .setOrigin(0.5);
    const charmNames = run.charms.length
      ? run.charms.map((id) => (allCharms[id] ? allCharms[id].name : id)).join(' / ')
      : '（なし）';
    this.add
      .text(cx, 292, charmNames, { fontFamily: 'sans-serif', fontSize: '18px', color: '#e6d0dc' })
      .setOrigin(0.5);

    // ボタン2つ
    const toLobby = this.add
      .text(cx - 150, this.scale.height - 90, 'ロビーへ', {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#f5e6d8', backgroundColor: '#3a1a2c', padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    toLobby.on('pointerdown', () => this._toLobby());

    const again = this.add
      .text(cx + 150, this.scale.height - 90, 'もう1ラン直行', {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => this._again());
  }

  _toLobby() {
    this.scene.start('LobbyScene');
  }

  _again() {
    // ロビーを経由せず新ランを開始（状態リセット）
    const run = this.registry.get('run');
    run.reset(this._nowMs());
    routeToCurrentStep(this);
  }

  _nowMs() {
    const forced = this.registry.get('nowMs');
    return forced != null ? forced : Date.now();
  }
}
