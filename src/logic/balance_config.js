// balance_config.js
// バランス調整用の数値を1ファイルに集約する（テストプレイでの調整箇所を集中管理）。
// このファイルはPhaser非依存（純粋なデータ定義のみ）。

// 役の倍率。複数該当時は最高倍率を採用する（hand_logic側で判定）。
const HAND_MULTIPLIERS = {
  PAIR: 1.0, // ペア（1ペア）
  SUITED_PAIR: 1.5, // スートペア（同数字＋同スート）
  DOUBLE_PAIR: 2.0, // ダブルペア（1ターン2ペア）
  TRIPLE_PAIR: 3.0, // トリプルペア（1ターン3ペア）
  STRAIGHT_PAIR: 2.5, // ストレートペア（連番ペアを連続成立）
  FLUSH_PAIR: 2.5, // フラッシュペア（同スートのペアを複数成立）
};

// コンボ倍率。連続ペア成功ターンごとに +COMBO_STEP。失敗ターンでCOMBO_BASEにリセット。
const COMBO_BASE = 1.0;
const COMBO_STEP = 0.25;

// バトル基礎値。
const PLAYER_MAX_HP = 50; // プレイヤー初期HP
const MAX_TURNS = 25; // フェイルセーフ：このターン数経過で強制敗北
const FULL_CLEAR_COMBO_BONUS = 0.5; // 敵撃破前の盤面フルクリアで得るコンボ倍率ボーナス
