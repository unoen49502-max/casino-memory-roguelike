// pair_logic.js
// ペア判定。Phaser非依存の純粋関数。
// カードは {rank, suit} の素朴なオブジェクトとして受け取る（Cardクラス非依存）。

// 2枚の数字（ランク）が一致すればペア成立。
function isPair(cardA, cardB) {
  return cardA.rank === cardB.rank;
}

// ペア1組を表す正規化オブジェクトを生成する。
// - rank：ペアの数字
// - suited：2枚が同スートか（スートペア判定に使用）
// - cards：元の2枚
function makePair(cardA, cardB) {
  return {
    rank: cardA.rank,
    suited: cardA.suit === cardB.suit,
    cards: [cardA, cardB],
  };
}
