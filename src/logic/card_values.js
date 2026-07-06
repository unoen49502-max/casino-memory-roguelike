// card_values.js
// カードのランク→数値の対応。Phaser非依存の純粋関数。
// 2〜10=額面、J=11、Q=12、K=13、A=14。

const CARD_VALUE_TABLE = {
  A: 14,
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  J: 11, Q: 12, K: 13,
};

// ランク文字列（'A'〜'K'）を数値に変換する。
function cardValue(rank) {
  return CARD_VALUE_TABLE[rank];
}
