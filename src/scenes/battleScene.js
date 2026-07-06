// battleScene：戦闘シーン。
// TASK_003：敵・敵ターン・プレイヤーHP・勝敗・ボスギミック・盤面リフィルを実装。
// ゲームロジックは BattleLogic / TurnManager（src/logic/）へ委譲し、
// battleScene は結果イベントを受けて描画するだけ。

// --- デバッグ：どの敵と戦うか（起動時定数。registryで上書き可） ---
const DEBUG_ENEMY_ID = 'mob_a';
// --- デバッグ：初期装備チャーム（CharmSelectScene未経由時のフォールバック） ---
const DEBUG_EQUIPPED_CHARMS = ['spade_brooch', 'clairvoyance_dice', 'streak_dice'];

// 盤面レイアウト定数。
const GRID_COLS = 4;
const GRID_ROWS = 4;
const CARD_GAP = 16;
const MAX_FACE_UP = 2;
const PEEK_HOLD_MS = 1000; // 2枚揃ってから判定するまでの表示時間
const ENEMY_TURN_DELAY_MS = 350; // 判定後〜敵ターンまでの間

const HAND_LABELS = {
  PAIR: 'PAIR',
  SUITED_PAIR: 'SUITED PAIR',
  DOUBLE_PAIR: 'DOUBLE PAIR',
  TRIPLE_PAIR: 'TRIPLE PAIR',
  STRAIGHT_PAIR: 'STRAIGHT PAIR',
  FLUSH_PAIR: 'FLUSH PAIR',
};

class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  preload() {
    // 立ち絵の正式素材を読込（無ければcreateでプレースホルダー生成に切り替わる）。
    const chars = this.cache.json.get('characters');
    if (chars && chars.lilim) {
      const L = chars.lilim.layers;
      const queue = (o) => { if (o && o.key && o.path) this.load.image(o.key, o.path); };
      queue(L.backhair);
      queue(L.body);
      Object.values(L.faces).forEach(queue);
      // 素材欠落（正式素材未配置）は想定内。ロードエラーは握りつぶす。
      this.load.on('loaderror', () => {});
    }
  }

  create() {
    // 敵データ（enemies.json）を取得。registryのenemyId優先、無ければデバッグ定数。
    const enemyId = this.registry.get('enemyId') || DEBUG_ENEMY_ID;
    const enemies = this.cache.json.get('enemies') || {};
    this.enemy = enemies[enemyId];

    // 装備チャーム（registry優先、無ければデバッグ既定）
    const allCharms = this.cache.json.get('charms') || {};
    const equippedIds = this.registry.get('equippedCharms') || DEBUG_EQUIPPED_CHARMS;
    this.charms = equippedIds.map((id) => allCharms[id]).filter(Boolean);

    this.logic = new BattleLogic({ enemy: this.enemy, charms: this.charms });
    this.turnMgr = new TurnManager({});

    this.cards = [];
    this.flippedCards = [];
    this.currentPair = null;
    this.isResolving = false;
    this.inputEnabled = false;
    this.battleOver = false;

    this._bindLogicEvents();

    // 立ち絵（盤面より背面）。イベント→リアクションはreactions.jsonで駆動。
    this._createCharacter();

    this._drawReservedArea();
    this._createHpUI();
    this._createCharmUI();
    this._buildBoard();

    // バトル開始リアクション（smile + slide_in）
    this._react('battle_start');

    this._beginTurn();
  }

  _createCharacter() {
    const chars = this.cache.json.get('characters');
    const reactions = this.cache.json.get('reactions') || {};
    if (chars && chars.lilim) {
      this.character = new CharacterDisplay(this, chars.lilim, reactions);
    }
  }

  // イベント→立ち絵リアクション（立ち絵が無ければ無視）。
  _react(eventName) {
    if (this.character) this.character.react(eventName);
  }

  _bindLogicEvents() {
    this.logic.on('pair_success', (e) => this._onPairSuccess(e));
    this.logic.on('pair_fail', (e) => this._onPairFail(e));
    this.logic.on('enemy_damaged', (e) => this._updateEnemyHpUI(e));
    this.logic.on('player_damaged', (e) => this._onPlayerDamaged(e));
    this.logic.on('board_refill', (e) => this._onBoardRefill(e));
    this.logic.on('victory', (e) => this._onVictory(e));
    this.logic.on('defeat', (e) => this._onDefeat(e));
  }

  // ================= レイアウト・UI =================

  _drawReservedArea() {
    const w = this.scale.width;
    const reservedH = this.scale.height / 3;
    const g = this.add.graphics();
    g.lineStyle(1, 0x3a1a2c, 1);
    g.lineBetween(0, reservedH, w, reservedH);

    // 敵名（左上）＋種別
    const label = this.enemy
      ? `${this.enemy.name}（${this.enemy.type === 'boss' ? 'BOSS' : 'MOB'}）`
      : '（敵データなし）';
    this.add.text(24, 20, label, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#f5c6d8',
    });
  }

  // HP UI（画面上部・仮レイアウト）。
  _createHpUI() {
    this.enemyBar = this.add.graphics().setDepth(50);
    this.playerBar = this.add.graphics().setDepth(50);

    this.enemyHpText = this.add
      .text(this.scale.width - 24, 24, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffd0d0',
      })
      .setOrigin(1, 0)
      .setDepth(51);

    this.playerHpText = this.add
      .text(this.scale.width - 24, 78, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#d0e0ff',
      })
      .setOrigin(1, 0)
      .setDepth(51);

    this.turnText = this.add
      .text(24, 52, '', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#8a6a7c',
      })
      .setDepth(51);

    this._updateEnemyHpUI({ enemyHp: this.logic.enemyHp, enemyMaxHp: this.logic.enemyMaxHp });
    this._updatePlayerHpUI();
  }

  _bar(g, x, y, w, h, ratio, fillColor) {
    g.fillStyle(0x000000, 0.5);
    g.fillRect(x, y, w, h);
    g.fillStyle(fillColor, 1);
    g.fillRect(x, y, Math.max(0, w * ratio), h);
    g.lineStyle(1, 0xf5e6d8, 0.6);
    g.strokeRect(x, y, w, h);
  }

  _updateEnemyHpUI(e) {
    const hp = e.enemyHp != null ? e.enemyHp : this.logic.enemyHp;
    const max = e.enemyMaxHp != null ? e.enemyMaxHp : this.logic.enemyMaxHp;
    const barW = 320;
    const x = this.scale.width - 24 - barW;
    this.enemyBar.clear();
    this._bar(this.enemyBar, x, 48, barW, 16, max ? hp / max : 0, 0xc0392b);
    this.enemyHpText.setText(`ENEMY  ${hp} / ${max}`);
  }

  _updatePlayerHpUI() {
    const hp = this.logic.playerHp;
    const max = this.logic.playerMaxHp;
    const barW = 320;
    const x = this.scale.width - 24 - barW;
    this.playerBar.clear();
    this._bar(this.playerBar, x, 102, barW, 16, max ? hp / max : 0, 0x2e86c1);
    this.playerHpText.setText(`YOU  ${hp} / ${max}`);
  }

  _updateTurnUI() {
    this.turnText.setText(`TURN ${this.turnMgr.turn} / ${this.turnMgr.maxTurns}`);
  }

  // 装備チャームの仮UI：画面左端に3スロット。ホバーで効果説明を表示。
  _createCharmUI() {
    const slotSize = 52;
    const gap = 10;
    const x = 24;
    const y0 = 150;

    // ツールチップ（共有）
    this.charmTip = this.add
      .text(0, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#f5e6d8',
        backgroundColor: '#2a1420',
        padding: { x: 8, y: 6 },
        wordWrap: { width: 240 },
      })
      .setDepth(300)
      .setVisible(false);

    for (let i = 0; i < 3; i++) {
      const cy = y0 + i * (slotSize + gap);
      const charm = this.charms[i];
      const box = this.add
        .rectangle(x, cy, slotSize, slotSize, charm ? 0x4a2438 : 0x241019)
        .setOrigin(0, 0)
        .setStrokeStyle(2, charm && charm.implemented ? 0xffb0d0 : 0x6e3b57)
        .setDepth(60);

      const label = this.add
        .text(x + slotSize / 2, cy + slotSize / 2, charm ? charm.name.slice(0, 1) : '−', {
          fontFamily: 'sans-serif',
          fontSize: '22px',
          color: charm ? '#ffd0e6' : '#5a3a4c',
        })
        .setOrigin(0.5)
        .setDepth(61);

      if (charm) {
        box.setInteractive({ useHandCursor: true });
        box.on('pointerover', () => {
          const status = charm.implemented ? '' : '（未実装）';
          this.charmTip
            .setText(`${charm.name}${status}\n[${charm.category}] ${charm.rarity}\n${charm.desc}`)
            .setPosition(x + slotSize + 8, cy)
            .setVisible(true);
        });
        box.on('pointerout', () => this.charmTip.setVisible(false));
      }
    }
  }

  // ================= 盤面 =================

  _buildBoard() {
    const board = generateBoard();
    const boardW = GRID_COLS * CARD_WIDTH + (GRID_COLS - 1) * CARD_GAP;
    const boardH = GRID_ROWS * CARD_HEIGHT + (GRID_ROWS - 1) * CARD_GAP;
    const areaTop = this.scale.height / 3;
    const areaHeight = (this.scale.height * 2) / 3;
    const startX = (this.scale.width - boardW) / 2 + CARD_WIDTH / 2;
    const startY = areaTop + (areaHeight - boardH) / 2 + CARD_HEIGHT / 2;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const index = row * GRID_COLS + col;
        const data = board[index];
        const x = startX + col * (CARD_WIDTH + CARD_GAP);
        const y = startY + row * (CARD_HEIGHT + CARD_GAP);
        const card = new Card(this, x, y, data.rank, data.suit);
        card.onClick = (c) => this._onCardClicked(c);
        this.cards.push(card);
      }
    }
  }

  _refillBoard() {
    this.cards.forEach((c) => c.destroy());
    this.cards = [];
    this._buildBoard();
  }

  _allRemoved() {
    return this.cards.length > 0 && this.cards.every((c) => c.faceState === 'removed');
  }

  // ================= ターンループ =================

  _beginTurn() {
    if (this.battleOver) return;
    const turn = this.turnMgr.next();
    this._updateTurnUI();

    // ボスギミック（お手伝い♡）：3の倍数ターン開始時に自動で1ペア消滅（ダメージ0）
    if (gimmickFiresThisTurn(this.enemy, turn)) {
      this._doGimmick();
    }

    // チャームのターン開始時効果（千里眼のダイス等：ランダム1枚を一定時間だけ表に）
    charmTurnStartActions(this.charms).forEach((a) => {
      if (a.action === 'reveal_random') this._revealHint(a.count, a.durationMs);
    });

    this.inputEnabled = true;
  }

  // ヒント表示：裏向きカードから count 枚を durationMs だけ表にして戻す。
  // プレイヤーのめくり（flippedCards）には数えない純粋なヒント。
  _revealHint(count, durationMs) {
    const candidates = this.cards.filter(
      (c) => c.faceState === 'back' && this.flippedCards.indexOf(c) === -1
    );
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.slice(0, count).forEach((card) => {
      card.flipToFront();
      this.time.delayedCall(durationMs, () => {
        if (card.faceState === 'front' && this.flippedCards.indexOf(card) === -1) {
          card.flipToBack();
        }
      });
    });
  }

  _endTurn() {
    this.flippedCards = [];
    this.currentPair = null;
    this.isResolving = false;
    if (this.battleOver) return;

    // 敵ターン（攻撃）
    this.logic.enemyAttack();
    if (this.battleOver) return;

    // 盤面フルクリア（敵撃破前）→ リフィル＋コンボボーナス
    if (this._allRemoved()) {
      this.logic.onFullClear();
      this._refillBoard();
    }

    // フェイルセーフ：MAX_TURNS経過で強制敗北
    if (this.turnMgr.reachedFailsafe()) {
      this.logic.forceDefeat();
      return;
    }

    this._beginTurn();
  }

  // ================= 入力 =================

  _onCardClicked(card) {
    if (!this.inputEnabled || this.battleOver) return;
    if (this.isResolving || card.isFlipping) return;
    if (card.faceState !== 'back') return;
    if (this.flippedCards.length >= MAX_FACE_UP) return;

    card.flipToFront();
    this.flippedCards.push(card);

    if (this.flippedCards.length === MAX_FACE_UP) {
      this.isResolving = true;
      this.inputEnabled = false;
      this.currentPair = this.flippedCards.slice();
      this.time.delayedCall(PEEK_HOLD_MS, () => {
        const [c1, c2] = this.currentPair;
        this.logic.resolve(
          { rank: c1.rank, suit: c1.suit },
          { rank: c2.rank, suit: c2.suit }
        );
        // 判定演出のあと敵ターンへ
        this.time.delayedCall(ENEMY_TURN_DELAY_MS, () => this._endTurn());
      });
    }
  }

  // ================= ロジック結果イベント（描画のみ） =================

  _onPairSuccess(e) {
    const [c1, c2] = this.currentPair;
    const px = (c1.x + c2.x) / 2;
    const py = (c1.y + c2.y) / 2;
    c1.remove();
    c2.remove();
    this._showDamagePopup(px, py, e.damage, e.hand, e.combo);
    this._react('pair_success');
  }

  _onPairFail() {
    const [c1, c2] = this.currentPair;
    c1.flipToBack();
    c2.flipToBack();
    this._react('pair_fail');
  }

  _onPlayerDamaged(e) {
    this._updatePlayerHpUI();
    this._react('player_damaged');
    // 敵側の赤フラッシュ（仮演出）
    const flash = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 6, this.scale.width, this.scale.height / 3, 0xff2a2a, 0.28)
      .setDepth(40);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 260,
      onComplete: () => flash.destroy(),
    });
  }

  _onBoardRefill() {
    const t = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'FULL CLEAR!  COMBO +0.5', {
        fontFamily: 'sans-serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#9be27a',
        stroke: '#0a2a00',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(150);
    this.tweens.add({ targets: t, alpha: 0, y: '-=40', duration: 1000, onComplete: () => t.destroy() });
  }

  // ボスギミック：盤面の裏向きカードから同ランク2枚を選び、ダメージ0で消す。
  _doGimmick() {
    const backCards = this.cards.filter((c) => c.faceState === 'back');
    const byRank = {};
    backCards.forEach((c) => (byRank[c.rank] || (byRank[c.rank] = [])).push(c));
    const ranks = Object.keys(byRank).filter((r) => byRank[r].length >= 2);
    if (ranks.length === 0) return;

    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const [a, b] = byRank[rank];
    const px = (a.x + b.x) / 2;
    const py = (a.y + b.y) / 2;

    // 一瞬表にしてから消す（0ダメージ）
    a.flipToFront();
    b.flipToFront();
    this.time.delayedCall(300, () => {
      a.remove();
      b.remove();
      const label = (this.enemy.gimmicks[0] && this.enemy.gimmicks[0].label) || 'お手伝い♡';
      const t = this.add
        .text(px, py, label, {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#ff9ecb',
          stroke: '#3a1a2c',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(120);
      this.tweens.add({ targets: t, alpha: 0, y: '-=30', duration: 900, onComplete: () => t.destroy() });
    });
  }

  _showDamagePopup(x, y, damage, hand, combo) {
    const handLabel = HAND_LABELS[hand.name] || hand.name;
    const comboLabel = combo.count >= 2 ? `  COMBO x${combo.multiplier}` : '';

    const dmgText = this.add
      .text(x, y, `${damage}`, {
        fontFamily: 'sans-serif',
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#ffe27a',
        stroke: '#5a2a00',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(100);
    const infoText = this.add
      .text(x, y + 30, `${handLabel}${comboLabel}`, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#f5e6d8',
        stroke: '#3a1a2c',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({
      targets: [dmgText, infoText],
      y: '-=48',
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        dmgText.destroy();
        infoText.destroy();
      },
    });
  }

  // ================= 勝敗 =================

  _onVictory(e) {
    this.battleOver = true;
    this.inputEnabled = false;
    // 獲得チップは保持のみ（ラン進行はTASK_005）
    this.registry.set('chips', (this.registry.get('chips') || 0) + e.chips);
    this._react('victory');
    this._showResult('VICTORY', `CHIPS +${e.chips}`, '#ffe27a');
  }

  _onDefeat(e) {
    this.battleOver = true;
    this.inputEnabled = false;
    this._react('defeat');
    const reason = e.reason === 'timeout' ? 'TIME OVER' : '';
    this._showResult('DEFEAT', reason, '#ff6a6a');
  }

  _showResult(title, sub, color) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.add
      .rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.55)
      .setDepth(190);
    this.add
      .text(cx, cy - 20, title, {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(200);
    if (sub) {
      this.add
        .text(cx, cy + 40, sub, {
          fontFamily: 'sans-serif',
          fontSize: '26px',
          color: '#f5e6d8',
        })
        .setOrigin(0.5)
        .setDepth(200);
    }
    this.add
      .text(cx, cy + 100, 'クリックでタイトルへ', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#b08cae',
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.input.once('pointerdown', () => this.scene.start('TitleScene'));
  }
}
