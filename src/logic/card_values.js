// card_values.js
// カードのランク→数値の対応。Phaser非依存の純粋関数。
// 2〜10=額面、J=11、Q=12、K=13、A=14。

const CARD_VALUE_TABLE = {
  A: 14,
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  J: 11, Q: 12, K: 13,
  // 特殊カード：ジョーカーはワイルド（数値0扱い）、スターはペア対象外（保険で0）。
  JOKER: 0,
  STAR: 0,
};

// ランク文字列（'A'〜'K'／特殊）を数値に変換する。未定義は0。
function cardValue(rank) {
  return CARD_VALUE_TABLE[rank] != null ? CARD_VALUE_TABLE[rank] : 0;
}
