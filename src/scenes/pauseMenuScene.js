// pauseMenuScene：ラン中メニュー（オーバーレイ）。
// 装備チャーム一覧／役一覧表／設定／リタイア。開いている間、親Sceneは一時停止。
class PauseMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseMenuScene' });
  }

  init(data) {
    this.parentKey = (data && data.parentKey) || 'BattleScene';
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.65);
    this.add.text(w / 2, 40, 'メニュー（一時停止中）', { fontFamily: 'sans-serif', fontSize: '28px', color: '#f5e6d8' }).setOrigin(0.5);

    // 装備チャーム一覧（効果説明付き）
    const allCharms = this.cache.json.get('charms') || {};
    const run = this.registry.get('run');
    const charmIds = run ? run.charms : [];
    this.add.text(120, 100, '装備チャーム', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ff9ecb' });
    if (charmIds.length === 0) {
      this.add.text(120, 132, '（なし）', { fontFamily: 'sans-serif', fontSize: '15px', color: '#8a6a7c' });
    } else {
      charmIds.forEach((id, i) => {
        const c = allCharms[id];
        this.add.text(120, 132 + i * 46, c ? `${c.name}` : id, { fontFamily: 'sans-serif', fontSize: '17px', color: '#f5e6d8' });
        this.add.text(120, 154 + i * 46, c ? c.desc : '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#b08cae' });
      });
    }

    // 役一覧表（hands_reference.json：表示とロジックが同じデータを参照）
    const hands = this.cache.json.get('hands_reference') || [];
    this.add.text(w - 520, 100, '役一覧', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ff9ecb' });
    this.add.text(w - 520, 128, '役名           条件                          倍率', { fontFamily: 'monospace', fontSize: '14px', color: '#8a6a7c' });
    hands.forEach((hh, i) => {
      const line = `${hh.name.padEnd(8, '　')}  ${hh.condition.padEnd(14, '　')}  ×${hh.multiplier.toFixed(1)}`;
      this.add.text(w - 520, 152 + i * 26, line, { fontFamily: 'monospace', fontSize: '14px', color: '#e6d0dc' });
    });

    // ボタン
    this._button(w / 2 - 200, h - 70, '設定を開く', () => this._openSettings());
    this._button(w / 2, h - 70, '閉じる', () => this._close());
    this._button(w / 2 + 200, h - 70, 'リタイア', () => this._confirmRetire(), '#ff8a8a');

    this.input.keyboard.on('keydown-ESC', () => this._close());
  }

  _button(x, y, label, onClick, color) {
    const b = this.add
      .text(x, y, label, { fontFamily: 'sans-serif', fontSize: '20px', color: color || '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 18, y: 10 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    b.on('pointerdown', onClick);
    return b;
  }

  _openSettings() {
    // 設定を上に重ね、メニュー自身も一時停止
    this.scene.launch('SettingsScene', { from: 'PauseMenuScene', resume: true });
    this.scene.pause();
  }

  _confirmRetire() {
    if (this.confirmOpen) return;
    this.confirmOpen = true;
    const w = this.scale.width;
    const h = this.scale.height;
    const g = [];
    g.push(this.add.rectangle(w / 2, h / 2, 460, 200, 0x2a1420).setStrokeStyle(2, 0xff8a8a).setDepth(300));
    g.push(this.add.text(w / 2, h / 2 - 50, 'リタイアしますか？', { fontFamily: 'sans-serif', fontSize: '22px', color: '#f5e6d8' }).setOrigin(0.5).setDepth(301));
    const yes = this.add.text(w / 2 - 90, h / 2 + 30, 'はい', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ff8a8a', backgroundColor: '#3a1a2c', padding: { x: 18, y: 8 } }).setOrigin(0.5).setDepth(301).setInteractive({ useHandCursor: true });
    const no = this.add.text(w / 2 + 90, h / 2 + 30, 'いいえ', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 18, y: 8 } }).setOrigin(0.5).setDepth(301).setInteractive({ useHandCursor: true });
    g.push(yes, no);
    yes.on('pointerdown', () => this._retire());
    no.on('pointerdown', () => { g.forEach((o) => o.destroy()); this.confirmOpen = false; });
  }

  _retire() {
    const run = this.registry.get('run');
    if (run) run.finish('defeat'); // チップは run.chips に精算済み
    this.scene.stop(this.parentKey);
    this.scene.start('ResultScene');
  }

  _close() {
    this.scene.stop();
    this.scene.resume(this.parentKey);
  }
}
