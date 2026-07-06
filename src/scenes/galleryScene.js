// galleryScene：ギャラリー（最小実装）。
// CGサムネイル枠1個。未解放時はシルエット＋「???」。クリックで全画面、クリックで戻る。
// 解放条件は仮：registry 'galleryUnlocked' フラグ（デバッグ）で切替。
class GalleryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GalleryScene' });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.text(w / 2, 50, 'ギャラリー', { fontFamily: 'sans-serif', fontSize: '32px', color: '#f5e6d8' }).setOrigin(0.5);

    this.unlocked = !!this.registry.get('galleryUnlocked');

    // サムネイル枠1個
    const tx = w / 2;
    const ty = h / 2 - 20;
    this._makePlaceholderTexture();
    this.thumb = this.add.image(tx, ty, 'gallery_cg_placeholder').setDisplaySize(240, 320).setInteractive({ useHandCursor: true });
    this.silhouette = this.add.rectangle(tx, ty, 240, 320, 0x1a0a14).setStrokeStyle(2, 0x6e3b57);
    this.qMark = this.add.text(tx, ty, '???', { fontFamily: 'sans-serif', fontSize: '48px', color: '#5a3a4c' }).setOrigin(0.5);

    this.thumb.on('pointerdown', () => { if (this.unlocked) this._openFull(); });

    this._refresh();

    const back = this.add
      .text(w / 2, h - 50, '戻る', { fontFamily: 'sans-serif', fontSize: '22px', color: '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 20, y: 10 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('TitleScene'));
  }

  // 未解放/解放の表示切替（デバッグ：registryフラグ）。
  setUnlocked(v) {
    this.unlocked = !!v;
    this.registry.set('galleryUnlocked', this.unlocked);
    this._refresh();
  }

  _refresh() {
    this.thumb.setVisible(this.unlocked);
    this.silhouette.setVisible(!this.unlocked);
    this.qMark.setVisible(!this.unlocked);
  }

  _openFull() {
    const w = this.scale.width;
    const h = this.scale.height;
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.9).setDepth(200).setInteractive();
    const full = this.add.image(w / 2, h / 2, 'gallery_cg_placeholder').setDisplaySize(h * 0.85 * 0.75, h * 0.85).setDepth(201);
    dim.on('pointerdown', () => { dim.destroy(); full.destroy(); });
  }

  _makePlaceholderTexture() {
    if (this.textures.exists('gallery_cg_placeholder')) return;
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x6e3b57, 1);
    g.fillRect(0, 0, 240, 320);
    g.fillStyle(0xb0668e, 1);
    g.fillCircle(120, 110, 60);
    g.fillRoundedRect(50, 170, 140, 150, 30);
    g.generateTexture('gallery_cg_placeholder', 240, 320);
    g.destroy();
  }
}
