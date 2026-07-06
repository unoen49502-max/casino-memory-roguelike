// card.js
// カード1枚を表す部品クラス。描画・フリップ演出・入力判定をこのクラス内に閉じる。
// 正式素材への差し替えは _buildBackFace / _buildFrontFace を置き換えるだけで済む構造。

// カードサイズ定数（盤面レイアウト・素材差し替え時の基準）。
const CARD_WIDTH = 72;
const CARD_HEIGHT = 96;
const CARD_CORNER = 8;

// フリップ演出の片道時間（scaleX 1→0 / 0→1 それぞれ）。合計0.3秒。
const FLIP_HALF_MS = 150;
// ホバー時の浮き上がり量とtween時間。
const HOVER_LIFT = 4;
const HOVER_MS = 100;

class Card extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x 盤面上の中心X
   * @param {number} y 盤面上の中心Y
   * @param {string} rank 'A'〜'K'
   * @param {string} suit '♠♥♦♣'
   */
  constructor(scene, x, y, rank, suit) {
    super(scene, x, y);

    this.rank = rank;
    this.suit = suit;
    this.isJoker = rank === 'JOKER';
    this.isStar = rank === 'STAR';

    // 状態：'back'（裏）/ 'front'（表）/ 'removed'（消滅・将来用）
    this.faceState = 'back';
    this.isFlipping = false;
    this.baseY = y; // ホバー復帰用の基準Y
    this.baseScale = 1; // 盤面拡張時の基準スケール（フリップ後の戻り先）
    this.onClick = null; // Scene側が差し込むクリックハンドラ

    // 表裏の見た目を生成（描画はこのクラス内に閉じる）
    this.backFace = this._buildBackFace(scene);
    this.frontFace = this._buildFrontFace(scene);
    this.add([this.backFace, this.frontFace]);
    this.frontFace.setVisible(false); // 初期は裏向き

    // 当たり判定（カード単位）。原点中心なので中心基準の矩形を渡す。
    this.setSize(CARD_WIDTH, CARD_HEIGHT);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.on('pointerover', this._onOver, this);
    this.on('pointerout', this._onOut, this);
    this.on('pointerdown', this._onDown, this);

    scene.add.existing(this);
  }

  // --- 見た目生成（正式素材差し替え時はここを置換する） ------------------

  // 裏面：暗色の角丸矩形＋簡単な模様。
  _buildBackFace(scene) {
    const w = CARD_WIDTH;
    const h = CARD_HEIGHT;
    const c = scene.add.container(0, 0);

    const g = scene.add.graphics();
    g.fillStyle(0x2a1420, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, CARD_CORNER);
    g.lineStyle(2, 0x6e3b57, 1);
    g.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, CARD_CORNER);
    // 内側の飾り枠
    g.lineStyle(1, 0x8a4c6e, 0.8);
    g.strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, CARD_CORNER - 3);
    // 中央のひし形模様
    g.lineStyle(1, 0x8a4c6e, 0.9);
    g.beginPath();
    g.moveTo(0, -14);
    g.lineTo(12, 0);
    g.lineTo(0, 14);
    g.lineTo(-12, 0);
    g.closePath();
    g.strokePath();

    c.add(g);

    // デジャヴの指輪用「見た（めくった）マーク」。既定は非表示。
    this.seenMark = scene.add
      .text(w / 2 - 12, -h / 2 + 6, '👁', { fontFamily: 'sans-serif', fontSize: '13px' })
      .setOrigin(0.5)
      .setAlpha(0.5)
      .setVisible(false);
    c.add(this.seenMark);

    return c;
  }

  // デジャヴ：一度めくったマークの表示切替。
  setSeenMark(show) {
    if (this.seenMark) this.seenMark.setVisible(!!show && this.faceState === 'back');
  }

  // 盤面拡張時の基準スケール設定（フリップ演出もこのスケールへ戻る）。
  setBaseScale(s) {
    this.baseScale = s;
    this.setScale(s);
  }

  // 表面：白背景にスート記号と数字。♥♦は赤、♠♣は黒。
  _buildFrontFace(scene) {
    const w = CARD_WIDTH;
    const h = CARD_HEIGHT;
    const isRed = this.suit === '♥' || this.suit === '♦';
    const color = isRed ? '#c0392b' : '#222222';

    const c = scene.add.container(0, 0);

    const g = scene.add.graphics();
    g.fillStyle(0xf5f2ea, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, CARD_CORNER);
    g.lineStyle(2, 0x8a7a6a, 1);
    g.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, CARD_CORNER);
    c.add(g);

    // 特殊カード（ジョーカー／スター）の表面
    if (this.isJoker) {
      const jk = scene.add.text(0, 0, '🃏', { fontFamily: 'serif', fontSize: '40px' }).setOrigin(0.5);
      const lbl = scene.add.text(0, h / 2 - 14, 'JOKER', { fontFamily: 'sans-serif', fontSize: '11px', color: '#7a4ba0' }).setOrigin(0.5);
      c.add([jk, lbl]);
      return c;
    }
    if (this.isStar) {
      const st = scene.add.text(0, -2, '★', { fontFamily: 'serif', fontSize: '46px', color: '#e0a020' }).setOrigin(0.5);
      const lbl = scene.add.text(0, h / 2 - 14, '+30', { fontFamily: 'sans-serif', fontSize: '13px', color: '#c08000' }).setOrigin(0.5);
      c.add([st, lbl]);
      return c;
    }

    // 左上のランク
    const rankTL = scene.add
      .text(-w / 2 + 6, -h / 2 + 4, this.rank, {
        fontFamily: 'serif',
        fontSize: '18px',
        color,
      })
      .setOrigin(0, 0);
    // 右下のランク（180度回転で対角に）
    const rankBR = scene.add
      .text(w / 2 - 6, h / 2 - 4, this.rank, {
        fontFamily: 'serif',
        fontSize: '18px',
        color,
      })
      .setOrigin(1, 1)
      .setAngle(180);
    // 中央のスート
    const suitCenter = scene.add
      .text(0, 2, this.suit, {
        fontFamily: 'serif',
        fontSize: '40px',
        color,
      })
      .setOrigin(0.5);

    c.add([rankTL, rankBR, suitCenter]);
    return c;
  }

  // --- 状態・演出 --------------------------------------------------------

  // 表向きにフリップ。アニメ中・既に表なら無視。完了時cb。
  flipToFront(onDone) {
    if (this.isFlipping || this.faceState === 'front') return;
    this._playFlip(true, onDone);
  }

  // 裏向きにフリップ。アニメ中・既に裏なら無視。完了時cb。
  flipToBack(onDone) {
    if (this.isFlipping || this.faceState === 'back') return;
    this._playFlip(false, onDone);
  }

  // scaleX 1→0（0.15s）→ 表裏差替 → scaleX 0→1（0.15s）
  _playFlip(toFront, onDone) {
    this.isFlipping = true;
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      duration: FLIP_HALF_MS,
      ease: 'Linear',
      onComplete: () => {
        // 中間点でテクスチャ（表裏の見た目）を差し替える
        this.frontFace.setVisible(toFront);
        this.backFace.setVisible(!toFront);
        this.faceState = toFront ? 'front' : 'back';

        this.scene.tweens.add({
          targets: this,
          scaleX: this.baseScale,
          duration: FLIP_HALF_MS,
          ease: 'Linear',
          onComplete: () => {
            this.isFlipping = false;
            if (onDone) onDone(this);
          },
        });
      },
    });
  }

  // 消滅演出：フェード＋縮小して盤面から消す（状態:removed）。以後は入力不可。
  remove(onDone) {
    if (this.faceState === 'removed') return;
    this.faceState = 'removed';
    this.disableInteractive();
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 220,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.setVisible(false);
        if (onDone) onDone(this);
      },
    });
  }

  // --- 入力ハンドラ ------------------------------------------------------

  _onDown() {
    // アニメ中・消滅済みはカード単位で入力を受け付けない
    if (this.isFlipping || this.faceState === 'removed') return;
    if (this.onClick) this.onClick(this);
  }

  _onOver() {
    if (this.faceState === 'removed') return;
    this.scene.tweens.add({
      targets: this,
      y: this.baseY - HOVER_LIFT,
      duration: HOVER_MS,
      ease: 'Sine.easeOut',
    });
  }

  _onOut() {
    if (this.faceState === 'removed') return;
    this.scene.tweens.add({
      targets: this,
      y: this.baseY,
      duration: HOVER_MS,
      ease: 'Sine.easeOut',
    });
  }
}
