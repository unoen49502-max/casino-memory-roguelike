// battleScene：戦闘シーン。
// TASK_001：4×4盤面の描画とカードめくり（Step1の仮ルール）。
// ペア判定・役・ダメージ・敵表示はまだ実装しない（Step2以降）。

// 盤面レイアウト定数（カードサイズ差し替え・盤面拡張を見据えて定数化）。
const GRID_COLS = 4;
const GRID_ROWS = 4;
const CARD_GAP = 16;
// 表にできる最大枚数（Step1の仮ルール）。
const MAX_FACE_UP = 2;
// 2枚表になってから自動で裏に戻すまでの表示時間(ms)。
const PEEK_HOLD_MS = 1000;

class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    this.cards = [];
    this.flippedCards = []; // 現在表向きのカード（最大MAX_FACE_UP枚）
    this.isResolving = false; // 2枚表→裏戻し待機中フラグ

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

    // 下側2/3のエリア内で中央寄せ
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

  // Step1の仮ルール：1度に2枚まで表にでき、2枚揃ったら1秒後に両方裏へ戻す。
  _onCardClicked(card) {
    if (this.isResolving) return; // 裏戻し待機中は受け付けない
    if (card.isFlipping) return;
    if (card.faceState === 'front') return; // 既に表
    if (this.flippedCards.length >= MAX_FACE_UP) return; // 既に上限

    card.flipToFront();
    this.flippedCards.push(card);

    if (this.flippedCards.length === MAX_FACE_UP) {
      // 3枚目以降を弾くため待機フラグを立て、1秒後に両方裏へ戻す
      this.isResolving = true;
      this.time.delayedCall(PEEK_HOLD_MS, () => {
        this.flippedCards.forEach((c) => c.flipToBack());
        this.flippedCards = [];
        this.isResolving = false;
      });
    }
  }
}
