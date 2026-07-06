// combo_logic.js
// コンボ倍率のロジック。Phaser非依存の純粋関数。
// 連続ペア成功ターンごとに +COMBO_STEP（1.0→1.25→1.5…）。失敗ターンでリセット。
//
// 依存（グローバル）：COMBO_BASE, COMBO_STEP（balance_config.js）
//
// comboCount は「これまでの連続成功ターン数」（0始まり）。
// N回目の連続成功時に適用される倍率 = COMBO_BASE + COMBO_STEP * comboCount。

// 現在のcomboCountから適用倍率を求める。
// step未指定なら既定のCOMBO_STEP。チャーム（ストリークダイス等）で増分を上書きできる。
function comboMultiplier(comboCount, step) {
  const s = step != null ? step : COMBO_STEP;
  return COMBO_BASE + s * comboCount;
}

// ターン結果に応じて次のcomboCountを返す。成功で+1、失敗で0にリセット。
function nextComboCount(comboCount, success) {
  return success ? comboCount + 1 : 0;
}
