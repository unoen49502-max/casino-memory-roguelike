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
    const enemies = this.cache.json.get('enemies') || {};
    const allCharms = this.cache.json.get('charms') || {};
    this.run = this.registry.get('run') || null;

    // ラン中は run_manager から、単体デバッグ時は registry/定数から取得。
    let enemyId, playerHp, equippedIds;
    if (this.run) {
      enemyId = this.run.currentEnemyId() || DEBUG_ENEMY_ID;
      playerHp = this.run.hp;
      equippedIds = this.run.charms;
      this.maxFaceUp = this.run.flipCount();
    } else {
      enemyId = this.registry.get('enemyId') || DEBUG_ENEMY_ID;
      playerHp = PLAYER_MAX_HP;
      equippedIds = this.registry.get('equippedCharms') || DEBUG_EQUIPPED_CHARMS;
      this.maxFaceUp = MAX_FACE_UP;
    }
    this.enemy = enemies[enemyId];
    this.charms = equippedIds.map((id) => allCharms[id]).filter(Boolean);

    // モディファイア（雑魚戦のみ1個。ボスは無し。registryで固定指定可）
    this.modifier = this._pickModifier();

    // 実効の敵・めくり枚数・ターン制限（モディファイア反映）
    let effEnemy = this.enemy;
    this.maxFaceUp += charmFlipBonus(this.charms);
    let maxTurns = MAX_TURNS;
    if (this.modifier) {
      if (this.modifier.type === 'double_flip') {
        this.maxFaceUp = this.modifier.flips;
        effEnemy = Object.assign({}, this.enemy, { attack: this.enemy.attack * this.modifier.enemyAttackMult });
      } else if (this.modifier.type === 'turn_limit') {
        maxTurns = this.modifier.value;
      }
    }

    this.logic = new BattleLogic({
      enemy: effEnemy,
      charms: this.charms,
      playerHp,
      playerMaxHp: this.run ? this.run.maxHp : PLAYER_MAX_HP,
    });
    this.turnMgr = new TurnManager({ maxTurns });

    // 新チャーム用フラグ
    this.seenEnabled = charmHas(this.charms, 'seen_hint'); // デジャヴの指輪
    this.seenSet = new Set();
    this.hasSecondChance = charmHas(this.charms, 'retry_on_fail'); // セカンドチャンス
    this.retryUsed = false;

    this.cards = [];
    this.flippedCards = [];
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

    // モディファイアの開始時演出＋告知
    this._applyStartModifier();
    this._announceModifier();

    // バトル開始リアクション（smile + slide_in）
    this._react('battle_start');

    this._beginTurn();
  }

  // 雑魚戦のみモディファイアを1個選ぶ（ボスは無し）。registryで固定指定可。
  _pickModifier() {
    if (this.enemy && this.enemy.type === 'boss') return null;
    const mods = this.cache.json.get('modifiers') || {};
    const forced = this.registry.get('forceModifier');
    if (forced === 'none') return null;
    if (forced && mods[forced]) return mods[forced];
    const keys = Object.keys(mods);
    if (keys.length === 0) return null;
    return mods[keys[Math.floor(Math.random() * keys.length)]];
  }

  // モディファイア告知（名前＋効果。リボン色：ポジ=緑/ニュートラル=白/ネガ=赤）。
  _announceModifier() {
    if (!this.modifier) return;
    const colorByKind = { positive: 0x2e7d32, neutral: 0x555555, negative: 0x9a2a2a };
    const col = colorByKind[this.modifier.kind] != null ? colorByKind[this.modifier.kind] : 0x555555;
    const cx = this.scale.width / 2;
    const ribbon = this.add.rectangle(cx, 150, 560, 56, col, 0.92).setDepth(160);
    const name = this.add
      .text(cx, 138, `MODIFIER: ${this.modifier.name}`, { fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setDepth(161);
    const desc = this.add
      .text(cx, 162, this.modifier.desc, { fontFamily: 'sans-serif', fontSize: '14px', color: '#f0f0f0' })
      .setOrigin(0.5).setDepth(161);
    this.tweens.add({ targets: [ribbon, name, desc], alpha: 0, delay: 1800, duration: 700, onComplete: () => { ribbon.destroy(); name.destroy(); desc.destroy(); } });
  }

  // モディファイアの開始時盤面演出（幸運のディーラー／プレビュー）。
  _applyStartModifier() {
    if (!this.modifier) return;
    if (this.modifier.type === 'start_revealed_pairs') {
      // 2ペア分を表向きで開始（マッチするペアを探して表に）
      const back = this.cards.filter((c) => c.faceState === 'back' && !c.isStar);
      const byRank = {};
      back.forEach((c) => (byRank[c.rank] || (byRank[c.rank] = [])).push(c));
      let revealed = 0;
      Object.values(byRank).forEach((g) => {
        if (revealed < this.modifier.value && g.length >= 2) {
          g[0].flipToFront();
          g[1].flipToFront();
          revealed++;
        }
      });
    } else if (this.modifier.type === 'preview_all') {
      this.cards.forEach((c) => { if (c.faceState === 'back') c.flipToFront(); });
      this.inputLockUntilPreview = true;
      this.time.delayedCall(this.modifier.value, () => {
        this.cards.forEach((c) => { if (c.faceState === 'front' && this.flippedCards.indexOf(c) === -1) c.flipToBack(); });
        this.inputLockUntilPreview = false;
      });
    }
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
    this.logic.on('player_healed', () => { this._updatePlayerHpUI(); this._floatText(120, 110, '+HP', '#8ad0a0'); });
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
    const specials = this.cache.json.get('special_cards') || {};
    // 整列盤面モディファイアなら数字順、通常はシャッフル
    let board = this.modifier && this.modifier.type === 'sorted_layout' ? generateSortedBoard() : generateBoard();

    // ジョーカー：ボス戦は確定1枚 ＋ ジョーカーカード（チャーム）分を「置く」
    let jokerCount = charmJokerCount(this.charms);
    if (this.enemy && this.enemy.type === 'boss') jokerCount += 1;
    if (jokerCount > 0 && specials.joker) board = injectJokers(board, specials.joker, jokerCount);

    // スター：雑魚戦に15%で1枚「追加」（registryで固定指定可）
    const forceStar = this.registry.get('forceStar');
    const isZako = !this.enemy || this.enemy.type !== 'boss';
    const starRoll = forceStar === true || (forceStar == null && isZako && Math.random() < 0.15);
    if (specials.star && isZako && starRoll) board = addStar(board, specials.star);

    this._layoutBoard(board);
  }

  // N枚を4列グリッドに配置。枚数が多い場合は全体を縮小して収める。
  _layoutBoard(board) {
    const N = board.length;
    const cols = GRID_COLS;
    const rows = Math.ceil(N / cols);
    const cellW = CARD_WIDTH + CARD_GAP;
    const cellH = CARD_HEIGHT + CARD_GAP;
    const areaTop = this.scale.height / 3;
    const areaHeight = (this.scale.height * 2) / 3;
    const scale = Math.min(1, (areaHeight - 10) / (rows * cellH), (this.scale.width * 0.7) / (cols * cellW));
    const sW = cellW * scale;
    const sH = cellH * scale;
    const boardW = cols * sW;
    const boardH = rows * sH;
    const startX = (this.scale.width - boardW) / 2 + sW / 2;
    const startY = areaTop + (areaHeight - boardH) / 2 + sH / 2;

    for (let i = 0; i < N; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * sW;
      const y = startY + row * sH;
      const data = board[i];
      const card = new Card(this, x, y, data.rank, data.suit);
      if (scale !== 1) card.setBaseScale(scale);
      card.onClick = (c) => this._onCardClicked(c);
      this.cards.push(card);
    }
  }

  _refillBoard() {
    this.cards.forEach((c) => c.destroy());
    this.cards = [];
    this._buildBoard();
  }

  // ペア対象（スター以外）が全て消えたか。スターは任意収集なので判定から除外。
  _allRemoved() {
    const pairable = this.cards.filter((c) => !c.isStar);
    return pairable.length > 0 && pairable.every((c) => c.faceState === 'removed');
  }

  // ================= ターンループ =================

  _beginTurn() {
    if (this.battleOver) return;
    const turn = this.turnMgr.next();
    this.retryUsed = false; // セカンドチャンスは1ターン1回
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
      (c) => c.faceState === 'back' && !c.isStar && this.flippedCards.indexOf(c) === -1
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
    if (!this.inputEnabled || this.battleOver || this.inputLockUntilPreview) return;
    if (this.isResolving || card.isFlipping) return;
    if (card.faceState !== 'back') return;

    // ★スター：ペア対象外・めくり回数を消費しない。チップ+30の収集。
    if (card.isStar) {
      this._collectStar(card);
      return;
    }

    if (this.flippedCards.length >= this.maxFaceUp) return;

    card.setSeenMark(false);
    if (this.seenEnabled) this.seenSet.add(card); // デジャヴ：一度めくった記録
    card.flipToFront();
    this.flippedCards.push(card);

    // 上限到達、または残りの裏カードが無ければ判定へ（複数めくり対応）
    const remainingBack = this.cards.filter(
      (c) => c.faceState === 'back' && this.flippedCards.indexOf(c) === -1
    ).length;
    if (this.flippedCards.length === this.maxFaceUp || (remainingBack === 0 && this.flippedCards.length >= 2)) {
      this.isResolving = true;
      this.inputEnabled = false;
      this.time.delayedCall(PEEK_HOLD_MS, () => this._resolveTurn());
    }
  }

  // めくった全カードをロジックで解決し、消滅/裏戻し/ダメージ表示を行う。
  _resolveTurn() {
    const flipped = this.flippedCards.slice();
    const data = flipped.map((c) => ({ rank: c.rank, suit: c.suit }));
    const res = this.logic.resolveMulti(data);

    if (res.success) {
      const matched = res.matchedIndices.map((i) => flipped[i]);
      const unmatched = res.unmatchedIndices.map((i) => flipped[i]);
      const px = matched.reduce((s, c) => s + c.x, 0) / matched.length;
      const py = matched.reduce((s, c) => s + c.y, 0) / matched.length;
      matched.forEach((c) => c.remove());
      unmatched.forEach((c) => this._flipBackSeen(c));
      this._showDamagePopup(px, py, res.damage, res.hand, res.combo);
    } else {
      flipped.forEach((c) => this._flipBackSeen(c));
      // セカンドチャンス：失敗時1ターン1回だけ追加でめくれる（敵ターンに進めない）
      if (this.hasSecondChance && !this.retryUsed) {
        this.retryUsed = true;
        this.flippedCards = [];
        this.isResolving = false;
        this.inputEnabled = true;
        this._floatText(this.scale.width / 2, this.scale.height / 2, 'SECOND CHANCE!', '#9be27a');
        return; // ターンを終えず再めくり
      }
    }

    this.time.delayedCall(ENEMY_TURN_DELAY_MS, () => this._endTurn());
  }

  // 裏に戻す。デジャヴ有効なら「見たマーク」を付ける。
  _flipBackSeen(card) {
    card.flipToBack(() => {
      if (this.seenEnabled && this.seenSet.has(card)) card.setSeenMark(true);
    });
  }

  // ★スター収集：チップ+30、めくり回数を消費しない。
  _collectStar(card) {
    const specials = this.cache.json.get('special_cards') || {};
    const chips = (specials.star && specials.star.chips) || 30;
    card.flipToFront();
    if (this.run) this.run.addChips(chips);
    this._starChips = (this._starChips || 0) + chips;
    this._floatText(card.x, card.y - 20, `★ +${chips}`, '#ffd54a');
    this.time.delayedCall(400, () => card.remove());
  }

  _floatText(x, y, text, color) {
    const t = this.add
      .text(x, y, text, { fontFamily: 'sans-serif', fontSize: '24px', fontStyle: 'bold', color, stroke: '#3a1a2c', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(140);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ================= ロジック結果イベント（立ち絵リアクションのみ） =================

  _onPairSuccess() {
    this._react('pair_success');
  }

  _onPairFail() {
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
    this._react('victory');
    if (this.run) {
      this.run.setHp(this.logic.playerHp); // HPをバトル間で持ち越し
      this.run.addChips(e.chips);
      if (this.run.isBossStep()) this.run.finish('clear');
      this._showResult('VICTORY', `CHIPS +${e.chips}`, '#ffe27a', () => {
        this.run.advance();
        routeToCurrentStep(this);
      });
    } else {
      this._showResult('VICTORY', `CHIPS +${e.chips}`, '#ffe27a', () => this.scene.start('TitleScene'));
    }
  }

  _onDefeat(e) {
    this.battleOver = true;
    this.inputEnabled = false;
    this._react('defeat');
    const reason = e.reason === 'timeout' ? 'TIME OVER' : '';
    if (this.run) {
      this.run.setHp(0);
      this.run.finish('defeat');
      this._showResult('DEFEAT', reason, '#ff6a6a', () => this.scene.start('ResultScene'));
    } else {
      this._showResult('DEFEAT', reason, '#ff6a6a', () => this.scene.start('TitleScene'));
    }
  }

  // 勝敗バナー→クリックで onNext（ラン中は次ステップへ、単体時はタイトルへ）。
  _showResult(title, sub, color, onNext) {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.55).setDepth(190);
    this.add
      .text(cx, cy - 20, title, {
        fontFamily: 'sans-serif', fontSize: '64px', fontStyle: 'bold',
        color, stroke: '#000000', strokeThickness: 6,
      })
      .setOrigin(0.5).setDepth(200);
    if (sub) {
      this.add
        .text(cx, cy + 40, sub, { fontFamily: 'sans-serif', fontSize: '26px', color: '#f5e6d8' })
        .setOrigin(0.5).setDepth(200);
    }
    this.add
      .text(cx, cy + 100, 'クリックで次へ', { fontFamily: 'sans-serif', fontSize: '18px', color: '#b08cae' })
      .setOrigin(0.5).setDepth(200);

    this._resultNext = onNext || null;
    this.input.once('pointerdown', () => this._proceedResult());
  }

  // 勝敗バナー→次へ（テスト・クリック共通の入口）。
  _proceedResult() {
    if (this._resultNext) {
      const f = this._resultNext;
      this._resultNext = null;
      f();
    }
  }
}
