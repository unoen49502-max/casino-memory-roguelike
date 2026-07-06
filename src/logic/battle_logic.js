// battle_logic.js
// 戦闘のゲームロジック本体。Phaser非依存（独自の軽量イベント通知を持つ）。
// battleSceneは resolve()/enemyAttack() 等を呼び、発火するイベントを購読して
// 「表示するだけ」にする。
//
// 発火イベント：
//   pair_success   ペア成立（役・コンボ・ダメージ・敵HP）
//   pair_fail      ペア不成立
//   damage_dealt   ダメージ確定（数値）
//   enemy_damaged  敵HP減少
//   player_damaged プレイヤーHP減少（敵ターン）
//   board_refill   盤面フルクリアでリフィル（コンボボーナス付与）
//   victory        敵HP0
//   defeat         プレイヤーHP0 or フェイルセーフ
//
// 依存（グローバル）：isPair, makePair（pair_logic.js）, evaluateHand（hand_logic.js）,
//   comboMultiplier, nextComboCount（combo_logic.js）, calcDamage（damage_calc.js）,
//   PLAYER_MAX_HP, FULL_CLEAR_COMBO_BONUS（balance_config.js）

class BattleLogic {
  constructor(options = {}) {
    this.enemy = options.enemy || null;
    this.charms = options.charms || []; // 装備中チャーム定義

    this.playerMaxHp = options.playerHp != null ? options.playerHp : PLAYER_MAX_HP;
    this.playerHp = this.playerMaxHp;

    this.enemyMaxHp = this.enemy ? this.enemy.hp : 0;
    this.enemyHp = this.enemyMaxHp;

    this.comboCount = 0; // 連続成功ターン数
    this.comboBonus = 0; // フルクリア等で加算される倍率ボーナス

    this.finished = false;
    this.outcome = null; // 'victory' | 'defeat'

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

  // 現在の実効コンボ倍率（基本倍率＋チャーム増分＋ボーナス）。
  currentComboMultiplier() {
    const step = COMBO_STEP + charmComboStepBonus(this.charms);
    return comboMultiplier(this.comboCount, step) + this.comboBonus;
  }

  /**
   * めくった2枚を解決。ペアなら敵にダメージ、不一致ならコンボリセット。
   * @returns {boolean} ペア成立したか
   */
  resolve(cardA, cardB) {
    if (this.finished) return false;

    if (isPair(cardA, cardB)) {
      const pairs = [makePair(cardA, cardB)];
      const hand = evaluateHand(pairs);
      const comboMult = this.currentComboMultiplier();

      // チャーム補正（乗算/加算）を集計してダメージ確定
      const corr = charmDamageCorrections(this.charms, { pairs, hand });
      const dmg = calcDamageWithCharms(pairs, {
        handMult: hand.multiplier,
        comboMult,
        charmMult: corr.mult,
        charmFlat: corr.flat,
      });
      const damage = dmg.damage;
      this.lastBreakdown = dmg.breakdown;
      // バランス調整用ログ（内訳：ペア値/役/コンボ/チャーム）
      console.log(
        `[DMG] pairValue=${dmg.breakdown.pairValue} hand=${hand.name}(x${hand.multiplier}) ` +
          `combo=x${comboMult} charmMult=x${corr.mult} charmFlat=+${corr.flat} => ${damage}`
      );

      this.comboCount = nextComboCount(this.comboCount, true);
      this.enemyHp = Math.max(0, this.enemyHp - damage);

      const result = {
        pairs,
        hand,
        combo: { count: this.comboCount, multiplier: comboMult },
        damage,
        enemyHp: this.enemyHp,
        cards: [cardA, cardB],
      };
      this._emit('pair_success', result);
      this._emit('damage_dealt', { damage, hand, combo: result.combo });
      this._emit('enemy_damaged', {
        enemyHp: this.enemyHp,
        enemyMaxHp: this.enemyMaxHp,
        damage,
      });

      if (this.enemyHp <= 0) this._win();
      return true;
    }

    this.comboCount = nextComboCount(this.comboCount, false);
    this._emit('pair_fail', { cards: [cardA, cardB] });
    return false;
  }

  // 敵ターン：攻撃力ぶんプレイヤーHPを減らす。
  enemyAttack() {
    if (this.finished || !this.enemy) return;
    const damage = this.enemy.attack;
    this.playerHp = Math.max(0, this.playerHp - damage);
    this._emit('player_damaged', {
      playerHp: this.playerHp,
      playerMaxHp: this.playerMaxHp,
      damage,
    });
    if (this.playerHp <= 0) this._lose('hp');
  }

  // フェイルセーフ等による強制敗北。
  forceDefeat() {
    if (!this.finished) this._lose('timeout');
  }

  // 盤面フルクリア（敵撃破前）：コンボ倍率ボーナスを付与してリフィル通知。
  onFullClear() {
    this.comboBonus += FULL_CLEAR_COMBO_BONUS;
    this._emit('board_refill', { comboBonus: this.comboBonus });
  }

  _win() {
    this.finished = true;
    this.outcome = 'victory';
    this._emit('victory', { chips: this.enemy ? this.enemy.chips : 0, enemy: this.enemy });
  }

  _lose(reason) {
    this.finished = true;
    this.outcome = 'defeat';
    this._emit('defeat', { reason });
  }
}
