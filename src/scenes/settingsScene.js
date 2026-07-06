// settingsScene：設定オーバーレイ。BGM/SE音量・演出速度・画面モード。
// タイトル・ロビー・ラン中メニューから呼び出し可能。閉じると呼び出し元へ戻る。
class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data) {
    this.fromKey = (data && data.from) || null;
    this.resumeOnClose = data && data.resume; // 呼び出し元をpauseしている場合resume
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6);
    this.add.rectangle(w / 2, h / 2, 640, 460, 0x241019).setStrokeStyle(2, 0x8a4c6e);
    this.add.text(w / 2, h / 2 - 190, '設定', { fontFamily: 'sans-serif', fontSize: '30px', color: '#f5e6d8' }).setOrigin(0.5);

    this._slider(h / 2 - 110, 'BGM音量', () => GAME_SETTINGS.bgmVolume, (v) => this.setBgmVolume(v));
    this._slider(h / 2 - 40, 'SE音量', () => GAME_SETTINGS.seVolume, (v) => this.setSeVolume(v));

    // 演出速度トグル
    this.fxBtn = this._toggleRow(h / 2 + 30, '演出速度', () => (GAME_SETTINGS.fxFast ? '高速' : '通常'), () => this.toggleFx());
    // 画面モードトグル
    this.fsBtn = this._toggleRow(h / 2 + 90, '画面モード', () => (GAME_SETTINGS.fullscreen ? 'フルスクリーン' : 'ウィンドウ'), () => this.toggleFullscreen());

    const close = this.add
      .text(w / 2, h / 2 + 180, '閉じる', { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 20, y: 10 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this._close());
    this.input.keyboard.on('keydown-ESC', () => this._close());
  }

  _slider(y, label, getVal, setVal) {
    const cx = this.scale.width / 2;
    const trackX = cx - 60;
    const trackW = 260;
    this.add.text(cx - 220, y, label, { fontFamily: 'sans-serif', fontSize: '18px', color: '#e6d0dc' }).setOrigin(0, 0.5);
    const track = this.add.rectangle(trackX, y, trackW, 8, 0x4a2438).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    const fill = this.add.rectangle(trackX, y, trackW * getVal(), 8, 0xffb0d0).setOrigin(0, 0.5);
    const valText = this.add.text(trackX + trackW + 16, y, '', { fontFamily: 'sans-serif', fontSize: '16px', color: '#f5e6d8' }).setOrigin(0, 0.5);
    const refresh = () => { fill.width = trackW * getVal(); valText.setText(`${Math.round(getVal() * 100)}%`); };
    const setFromX = (px) => { const v = Math.max(0, Math.min(1, (px - trackX) / trackW)); setVal(Math.round(v * 100) / 100); refresh(); };
    track.on('pointerdown', (p) => setFromX(p.x));
    track.on('pointermove', (p) => { if (p.isDown) setFromX(p.x); });
    refresh();
    return { refresh };
  }

  _toggleRow(y, label, getText, onToggle) {
    const cx = this.scale.width / 2;
    this.add.text(cx - 220, y, label, { fontFamily: 'sans-serif', fontSize: '18px', color: '#e6d0dc' }).setOrigin(0, 0.5);
    const btn = this.add
      .text(cx - 60, y, getText(), { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 16, y: 6 } })
      .setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => { onToggle(); btn.setText(getText()); });
    return btn;
  }

  // --- 設定変更API（UI・テスト共通の入口）---
  setBgmVolume(v) {
    GAME_SETTINGS.bgmVolume = v;
    applyAudioSettings(this.game); // 即時反映
    saveSettings();
  }

  setSeVolume(v) {
    GAME_SETTINGS.seVolume = v;
    saveSettings();
  }

  toggleFx() {
    GAME_SETTINGS.fxFast = !GAME_SETTINGS.fxFast;
    saveSettings();
  }

  toggleFullscreen() {
    GAME_SETTINGS.fullscreen = !GAME_SETTINGS.fullscreen;
    try {
      if (GAME_SETTINGS.fullscreen) this.scale.startFullscreen();
      else this.scale.stopFullscreen();
    } catch (e) { /* 環境により不可の場合はフラグのみ */ }
    saveSettings();
  }

  _close() {
    this.scene.stop();
    if (this.resumeOnClose && this.fromKey) this.scene.resume(this.fromKey);
  }
}
