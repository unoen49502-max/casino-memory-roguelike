// charmSelectScene：デバッグ用チャーム装備画面（仮UI）。
// 全チャームを一覧し、最大3個を選んで装備してバトルへ進む。
// 正式なショップ入手はTASK_006。ここは動作確認用の暫定画面。
const MAX_EQUIP = 3;

class CharmSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharmSelectScene' });
  }

  create() {
    const charmsObj = this.cache.json.get('charms') || {};
    this.charmIds = Object.keys(charmsObj);
    this.charms = charmsObj;

    // 既定で「実装済み3個」を装備状態に
    this.selected = this.charmIds.filter((id) => charmsObj[id].implemented).slice(0, MAX_EQUIP);

    const w = this.scale.width;
    this.add
      .text(w / 2, 40, 'チャーム装備（デバッグ）  ※最大3個', {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        color: '#f5e6d8',
      })
      .setOrigin(0.5);

    this.rows = [];
    const startY = 100;
    const rowH = 46;
    this.charmIds.forEach((id, i) => {
      const c = this.charms[id];
      const y = startY + i * rowH;
      const box = this.add
        .rectangle(w / 2, y, 720, rowH - 8, 0x2a1420)
        .setStrokeStyle(2, 0x6e3b57)
        .setInteractive({ useHandCursor: true });
      const impl = c.implemented ? '' : '（未実装）';
      const text = this.add
        .text(w / 2 - 348, y, `${c.name}  [${c.category}/${c.rarity}]${impl}  ${c.desc}`, {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#e6d0dc',
        })
        .setOrigin(0, 0.5);
      box.on('pointerdown', () => this._toggle(id));
      this.rows.push({ id, box, text });
    });

    this.startBtn = this.add
      .text(w / 2, this.scale.height - 44, '', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#ffe27a',
        backgroundColor: '#3a1a2c',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.startBtn.on('pointerdown', () => {
      this.registry.set('equippedCharms', this.selected.slice());
      this.scene.start('BattleScene');
    });

    this._refresh();
  }

  _toggle(id) {
    const idx = this.selected.indexOf(id);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
    } else if (this.selected.length < MAX_EQUIP) {
      this.selected.push(id);
    }
    this._refresh();
  }

  _refresh() {
    this.rows.forEach(({ id, box }) => {
      const on = this.selected.indexOf(id) >= 0;
      box.setFillStyle(on ? 0x5a2a44 : 0x2a1420);
      box.setStrokeStyle(2, on ? 0xffb0d0 : 0x6e3b57);
    });
    this.startBtn.setText(`この${this.selected.length}個で戦闘開始 ▶`);
  }
}
