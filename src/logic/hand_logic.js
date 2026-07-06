// hand_logic.js
// 役判定。Phaser非依存の純粋関数。
// 1ターン内に成立したペア群（makePairで正規化した配列）から役を判定する。
// 複数の役に該当する場合は最高倍率の役を採用する。
//
// 依存（グローバル）：cardValue（card_values.js）, HAND_MULTIPLIERS（balance_config.js）

// ペア群のランク値が連番かどうか（ストレートペア判定）。
// 例：5,6,7 → true。重複ランクや飛びがあれば false。
function _isStraight(pairs) {
  if (pairs.length < 2) return false;
  const values = pairs.map((p) => cardValue(p.rank)).sort((a, b) => a - b);
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) return false;
  }
  return true;
}

// 全ペアの全カードが同一スートかどうか（フラッシュペア判定）。
function _isFlush(pairs) {
  if (pairs.length < 2) return false;
  const suit = pairs[0].cards[0].suit;
  return pairs.every((p) => p.cards.every((c) => c.suit === suit));
}

/**
 * ペア群から役を判定する。
 * @param {{rank:string, suited:boolean, cards:{rank:string,suit:string}[]}[]} pairs
 * @returns {{name:string, multiplier:number}} 最高倍率の役
 */
function evaluateHand(pairs) {
  const candidates = [];
  const n = pairs.length;

  if (n >= 1) {
    candidates.push({ name: 'PAIR', multiplier: HAND_MULTIPLIERS.PAIR });
  }
  // スートペア：1ペアが同スート
  if (n === 1 && pairs[0].suited) {
    candidates.push({ name: 'SUITED_PAIR', multiplier: HAND_MULTIPLIERS.SUITED_PAIR });
  }
  // ダブル／トリプルペア：1ターンに2／3ペア
  if (n === 2) {
    candidates.push({ name: 'DOUBLE_PAIR', multiplier: HAND_MULTIPLIERS.DOUBLE_PAIR });
  }
  if (n === 3) {
    candidates.push({ name: 'TRIPLE_PAIR', multiplier: HAND_MULTIPLIERS.TRIPLE_PAIR });
  }
  // ストレートペア：連番ペアを複数成立
  if (_isStraight(pairs)) {
    candidates.push({ name: 'STRAIGHT_PAIR', multiplier: HAND_MULTIPLIERS.STRAIGHT_PAIR });
  }
  // フラッシュペア：同スートのペアを複数成立
  if (_isFlush(pairs)) {
    candidates.push({ name: 'FLUSH_PAIR', multiplier: HAND_MULTIPLIERS.FLUSH_PAIR });
  }

  // 最高倍率を採用（該当なしは理論上ないが保険でPAIR相当）
  return candidates.reduce(
    (best, c) => (c.multiplier > best.multiplier ? c : best),
    { name: 'PAIR', multiplier: HAND_MULTIPLIERS.PAIR }
  );
}
