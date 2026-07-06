// damage_calc.js
// ダメージ計算。Phaser非依存の純粋関数。
// ダメージ = Σペアのカード値 × 各種倍率（小数切り上げ）。
// 将来チャーム倍率が乗る前提で、倍率は「オブジェクト」で受け取り全て掛け合わせる設計。
//
// 依存（グローバル）：cardValue（card_values.js）

// ペア群に含まれる全カードの数値合計。
function totalPairValue(pairs) {
  return pairs.reduce(
    (sum, p) => sum + p.cards.reduce((s, c) => s + cardValue(c.rank), 0),
    0
  );
}

/**
 * ダメージを計算する。
 * @param {object[]} pairs 成立ペア群（makePair形式）
 * @param {Object<string, number>} multipliers 例：{ hand: 1.5, combo: 1.25, charm: 1.2 }
 *        キーは自由。将来チャーム等を追加する際はキーを足すだけでよい。
 * @returns {number} 切り上げ後のダメージ
 */
function calcDamage(pairs, multipliers) {
  const base = totalPairValue(pairs);
  const factor = Object.values(multipliers).reduce((m, v) => m * v, 1);
  return Math.ceil(base * factor);
}
