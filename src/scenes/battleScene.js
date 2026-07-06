// battleScene：戦闘シーン。
// TASK_002：ペア判定・役・ダメージ計算を組込。ペアなら消滅＋ダメージ表示、
// 不一致なら裏へ戻す。全消滅で BOARD CLEAR（勝敗はTASK_003）。
//
// 設計：ゲームロジックは BattleLogic（src/logic/）に委譲し、battleScene は
// 結果イベント（pair_success / pair_fail / board_clear）を受けて描画するだけ。

// 盤面レイアウト定数（カードサイズ差し替え・盤面拡張を見据えて定数化）。
const GRID_COLS = 4;
const GRID_ROWS = 4;
const CARD_GAP = 16;
// 表にできる最大枚数。
const MAX_FACE_UP = 2;
// 2枚揃ってから判定するまでの表示時間(ms)。
const PEEK_HOLD_MS = 1000;

// 役の表示名（ポップアップ用）。
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

  create() {
    this.cards = [];
    this.flippedCards = []; // 現在表向きのカード（最大MAX_FACE_UP枚）
    this.currentPair = null; // 判定対象の2枚（Card参照）
    this.isResolving = false; // 判定待機中フラグ
    this.clearedShown = false;

    // ロジック本体と結果イベントの購読（Scene側は表示するだけ）
    this.logic = new BattleLogic();
    this.logic.on('pair_success', (e) => this._onPairSuccess(e));
    this.logic.on('pair_fail', (e) => this._onPairFail(e));
    this.logic.on('board_clear', () => this._onBoardClear());

    this._drawReservedArea();
    this._buildBoard();
  }

  // 上側1/3は将来のキャラ立ち絵・敵HP表示用に空けておく（目印だけ置く）。
  _drawReservedArea() {
    const w = this.scale.width;
    const reservedH = this.scale.height / 3;

    const g = this.add.graphics();
    g.lineStyle(1, 0x3a1a2c, 1);
    g.lineBetween(0, reservedH, w, reservedH);

    this.add
      .text(w / 2, reservedH / 2, '（敵・立ち絵エリア：未実装）', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#5a3a4c',
      })
      .setOrigin(0.5);
  }

  // 4×4グリッドを画面下側2/3に配置してカードを生成する。
  _buildBoard() {
    const board = generateBoard(); // Scene非依存の純粋関数

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

  // カードクリック：2枚表になったら PEEK_HOLD_MS 後にロジックへ判定を委譲。
  _onCardClicked(card) {
    if (this.isResolving) return;
    if (card.isFlipping) return;
    if (card.faceState !== 'back') return; // 表・消滅は無視
    if (this.flippedCards.length >= MAX_FACE_UP) return;

    card.flipToFront();
    this.flippedCards.push(card);

    if (this.flippedCards.length === MAX_FACE_UP) {
      this.isResolving = true;
      this.currentPair = this.flippedCards.slice();
      this.time.delayedCall(PEEK_HOLD_MS, () => {
        const [c1, c2] = this.currentPair;
        // ロジックへ委譲。結果は pair_success / pair_fail イベントで返る。
        this.logic.resolve(
          { rank: c1.rank, suit: c1.suit },
          { rank: c2.rank, suit: c2.suit }
        );
      });
    }
  }

  // --- ロジック結果イベントの受け口（描画のみ） --------------------------

  _onPairSuccess(e) {
    const [c1, c2] = this.currentPair;
    const px = (c1.x + c2.x) / 2;
    const py = (c1.y + c2.y) / 2;

    c1.remove();
    c2.remove(() => {
      // 盤面全消去チェック（2枚目の消滅完了後）
      if (this._allRemoved() && !this.clearedShown) {
        this.logic.notifyBoardClear();
      }
    });

    this._showDamagePopup(px, py, e.damage, e.hand, e.combo);

    this._endTurn();
  }

  _onPairFail(e) {
    const [c1, c2] = this.currentPair;
    c1.flipToBack();
    c2.flipToBack();
    this._endTurn();
  }

  _endTurn() {
    this.flippedCards = [];
    this.currentPair = null;
    this.isResolving = false;
  }

  _allRemoved() {
    return this.cards.every((c) => c.faceState === 'removed');
  }

  // ダメージ数値＋役＋コンボのポップアップ（仮演出）。上へ流れて消える。
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

  _onBoardClear() {
    if (this.clearedShown) return;
    this.clearedShown = true;

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add
      .text(cx, cy, 'BOARD CLEAR', {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#ffe27a',
        stroke: '#5a2a00',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(200);
  }
}
