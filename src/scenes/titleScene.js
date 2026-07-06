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

    // 設定・ギャラリーボタン（クリックはこれらより後ろに伝播しないようボタンで処理）
    const settingsBtn = this.add
      .text(cx - 90, cy + 130, '設定', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 16, y: 8 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', (p, lx, ly, ev) => { if (ev) ev.stopPropagation(); this.scene.launch('SettingsScene', { from: 'TitleScene' }); });

    const galleryBtn = this.add
      .text(cx + 90, cy + 130, 'ギャラリー', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 16, y: 8 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    galleryBtn.on('pointerdown', (p, lx, ly, ev) => { if (ev) ev.stopPropagation(); this.scene.start('GalleryScene'); });

    // 画面クリックでロビーへ（ボタン以外）
    this.input.on('pointerdown', (pointer, over) => {
      if (over && over.length > 0) return; // ボタン上は無視
      this.scene.start('LobbyScene');
    });
  }
}
