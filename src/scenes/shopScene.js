// shopScene：ショップ（雑魚2戦目後に1回）。
// チャーム3種提示（未実装はSOLD OUT）／HP回復＋15＝30チップ。
// 購入は run_manager の装備に追加（3スロット。満杯時は入替UI）。

// 提示チャーム（プロト固定。存在しないid・未実装はSOLD OUT表示で枠だけ見せる）。
const SHOP_OFFER_IDS = ['lucky_seven', 'healing_chip', 'god_hand'];
// レアリティ別価格。
const CHARM_PRICE = { common: 40, uncommon: 70, rare: 110, epic: 150, legendary: 200 };
const HEAL_PRICE = 30;
const HEAL_AMOUNT = 15;

class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  create() {
    this.run = this.registry.get('run');
    this.allCharms = this.cache.json.get('charms') || {};
    this.pendingBuyId = null; // 入替対象選択中のチャームid

    const cx = this.scale.width / 2;
    this.add
      .text(cx, 44, 'ショップ', { fontFamily: 'sans-serif', fontSize: '34px', color: '#f5e6d8' })
      .setOrigin(0.5);
    this.chipText = this.add
      .text(cx, 82, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffe27a' })
      .setOrigin(0.5);

    // チャーム3枠
    const startX = cx - 320;
    SHOP_OFFER_IDS.forEach((id, i) => {
      this._createCharmCard(startX + i * 320, 260, id);
    });

    // HP回復
    this.healBox = this.add
      .rectangle(cx, 430, 400, 60, 0x1e3a2a)
      .setStrokeStyle(2, 0x8ad0a0)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, 430, `HP +${HEAL_AMOUNT} 回復  （${HEAL_PRICE}チップ）`, {
        fontFamily: 'sans-serif', fontSize: '18px', color: '#d8f5e6',
      })
      .setOrigin(0.5);
    this.healBox.on('pointerdown', () => this._buyHeal());

    // 現在の装備スロット（入替UI用）
    this.slotObjs = [];
    this.add.text(cx - 200, 500, '装備:', { fontFamily: 'sans-serif', fontSize: '16px', color: '#b08cae' }).setOrigin(0, 0.5);
    for (let i = 0; i < 3; i++) {
      const sx = cx - 130 + i * 90;
      const box = this.add.rectangle(sx, 500, 80, 40, 0x2a1420).setStrokeStyle(2, 0x6e3b57)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(sx, 500, '−', { fontFamily: 'sans-serif', fontSize: '14px', color: '#e6d0dc' }).setOrigin(0.5);
      box.on('pointerdown', () => this._onSlotClicked(i));
      this.slotObjs.push({ box, label });
    }

    this.msgText = this.add.text(cx, 545, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffb0d0' }).setOrigin(0.5);

    // 退店
    const next = this.add
      .text(cx, this.scale.height - 44, '次へ ▶', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#ffe27a', backgroundColor: '#3a1a2c', padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    next.on('pointerdown', () => this._leave());

    this._refresh();
  }

  _leave() {
    this.run.advance();
    routeToCurrentStep(this);
  }

  _createCharmCard(x, y, id) {
    const c = this.allCharms[id];
    if (!c) {
      // 定義が無いidはSOLD OUT枠として表示
      this.add.rectangle(x, y, 280, 220, 0x2a1420).setStrokeStyle(2, 0x4a2438);
      this.add.text(x, y, 'SOLD OUT', { fontFamily: 'sans-serif', fontSize: '18px', color: '#8a5a6c' }).setOrigin(0.5);
      return;
    }
    const price = CHARM_PRICE[c.rarity] != null ? CHARM_PRICE[c.rarity] : 100;
    const buyable = !!c.implemented;

    this.add.rectangle(x, y, 280, 220, 0x2a1420).setStrokeStyle(2, buyable ? 0xffb0d0 : 0x4a2438);
    this.add.text(x, y - 80, c.name, { fontFamily: 'sans-serif', fontSize: '20px', color: '#f5e6d8' }).setOrigin(0.5);
    this.add.text(x, y - 48, `[${c.category}/${c.rarity}]`, { fontFamily: 'sans-serif', fontSize: '13px', color: '#b08cae' }).setOrigin(0.5);
    this.add.text(x, y, c.desc, { fontFamily: 'sans-serif', fontSize: '13px', color: '#e6d0dc', align: 'center', wordWrap: { width: 250 } }).setOrigin(0.5);

    if (buyable) {
      const btn = this.add
        .rectangle(x, y + 78, 200, 40, 0x3a1a2c)
        .setStrokeStyle(2, 0xffe27a)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, y + 78, `購入  ${price}チップ`, { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffe27a' }).setOrigin(0.5);
      btn.on('pointerdown', () => this._buyCharm(id, price));
    } else {
      this.add.text(x, y + 78, 'SOLD OUT', { fontFamily: 'sans-serif', fontSize: '18px', color: '#8a5a6c' }).setOrigin(0.5);
    }
  }

  _buyCharm(id, price) {
    if (this.run.charms.indexOf(id) >= 0) { this._msg('すでに装備しています'); return; }
    if (this.run.chips < price) { this._msg('チップが足りません'); return; }
    if (this.run.charms.length < 3) {
      this.run.spendChips(price);
      this.run.addCharm(id);
      this._msg(`${this.allCharms[id].name} を装備しました`);
      this._refresh();
    } else {
      // 満杯：入替UI（どのスロットと入替えるか選択）
      this.pendingBuyId = id;
      this.pendingPrice = price;
      this._msg('入れ替える装備スロットを選んでください');
    }
  }

  _onSlotClicked(i) {
    if (this.pendingBuyId == null) return;
    if (this.run.chips < this.pendingPrice) { this._msg('チップが足りません'); this.pendingBuyId = null; return; }
    this.run.spendChips(this.pendingPrice);
    this.run.replaceCharm(i, this.pendingBuyId);
    this._msg('入れ替えました');
    this.pendingBuyId = null;
    this._refresh();
  }

  _buyHeal() {
    if (this.run.hp >= this.run.maxHp) { this._msg('HPは満タンです'); return; }
    if (this.run.chips < HEAL_PRICE) { this._msg('チップが足りません'); return; }
    this.run.spendChips(HEAL_PRICE);
    this.run.healHp(HEAL_AMOUNT);
    this._msg(`HP +${HEAL_AMOUNT} 回復`);
    this._refresh();
  }

  _msg(t) { this.msgText.setText(t); }

  _refresh() {
    this.chipText.setText(`所持チップ: ${this.run.chips}   /   HP ${this.run.hp}/${this.run.maxHp}`);
    this.slotObjs.forEach(({ box, label }, i) => {
      const id = this.run.charms[i];
      label.setText(id ? this.allCharms[id].name.slice(0, 3) : '−');
      box.setStrokeStyle(2, this.pendingBuyId != null ? 0xffe27a : 0x6e3b57);
    });
  }
}
