// deck.js
// 盤面カードデータの生成ロジック。Scene非依存の純粋関数として実装する
// （後のバランス調整・シミュレーターで再利用するため、描画・Phaser依存を持たない）。

// 13種の数字（表示ラベル）。内部順序はA→Kの昇順。
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
// スート記号。♥♦は赤、♠♣は黒で描画する（色判定はCard側）。
const SUITS = ['♠', '♥', '♦', '♣'];

// Fisher-Yatesシャッフル（引数配列を破壊せず新配列を返す）。
function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ランダムなスートを1つ返す。
function randomSuit() {
  return SUITS[Math.floor(Math.random() * SUITS.length)];
}

/**
 * 4×4盤面（16枚）用のカードデータ配列を生成する。
 * - 13種の数字から8種をランダム選出
 * - 各数字2枚ずつ計16枚。スートは1枚ごとにランダム付与
 *   （同数字の2枚が同スートである必要はない）
 * - シャッフルして返す
 *
 * @returns {{rank: string, suit: string}[]} 長さ16のカード定義配列
 */
function generateBoard() {
  // 13種から8種をランダム選出
  const chosenRanks = shuffle(RANKS).slice(0, 8);

  // 各数字2枚ずつ、スートは1枚ごとにランダム
  const cards = [];
  chosenRanks.forEach((rank) => {
    cards.push({ rank, suit: randomSuit() });
    cards.push({ rank, suit: randomSuit() });
  });

  // 配置をシャッフル
  return shuffle(cards);
}
