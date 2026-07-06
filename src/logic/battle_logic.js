// battle_logic.js
// 戦闘のゲームロジック本体。Phaser非依存（独自の軽量イベント通知を持つ）。
// battleSceneは resolve() を呼び、発火するイベント（pair_success / pair_fail /
// damage_dealt / board_clear）を購読して「表示するだけ」にする。
//
// 依存（グローバル）：isPair, makePair（pair_logic.js）, evaluateHand（hand_logic.js）,
//                     comboMultiplier, nextComboCount（combo_logic.js）,
//                     calcDamage（damage_calc.js）

class BattleLogic {
  constructor() {
    // これまでの連続成功ターン数（0始まり）。
    this.comboCount = 0;
    this._handlers = {};
  }

  // --- 軽量イベント通知（Phaser非依存） ---
  on(eventName, handler) {
    (this._handlers[eventName] || (this._handlers[eventName] = [])).push(handler);
    return this;
  }

  _emit(eventName, payload) {
    (this._handlers[eventName] || []).forEach((h) => h(payload));
  }

  /**
   * めくった2枚を解決し、結果イベントを発火する。
   * @param {{rank:string,suit:string}} cardA
   * @param {{rank:string,suit:string}} cardB
   * @returns {boolean} ペア成立したか
   */
  resolve(cardA, cardB) {
    if (isPair(cardA, cardB)) {
      const pairs = [makePair(cardA, cardB)];
      const hand = evaluateHand(pairs);
      const comboMult = comboMultiplier(this.comboCount);
      const damage = calcDamage(pairs, { hand: hand.multiplier, combo: comboMult });

      // 成功：コンボを進める
      this.comboCount = nextComboCount(this.comboCount, true);

      const result = {
        pairs,
        hand,
        combo: { count: this.comboCount, multiplier: comboMult },
        damage,
        cards: [cardA, cardB],
      };
      this._emit('pair_success', result);
      this._emit('damage_dealt', { damage, hand, combo: result.combo });
      return true;
    }

    // 失敗：コンボをリセット
    this.comboCount = nextComboCount(this.comboCount, false);
    this._emit('pair_fail', { cards: [cardA, cardB] });
    return false;
  }

  // 盤面全消去の通知（Scene側が全消滅を検知して呼ぶ）。
  notifyBoardClear() {
    this._emit('board_clear', {});
  }
}
