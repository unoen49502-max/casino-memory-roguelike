// charm_effects.js
// チャーム効果の適用ロジック。Phaser非依存の純粋関数。
// 効果タイプごとにフックで処理する：
//   - コンボ増分ボーナス（combo_step_boost）……コンボ倍率の増分stepに加算
//   - ダメージ計算前補正（beforeDamage）………乗算補正／加算補正を分けて集計
//   - ターン開始時（turnStart）……………………Sceneが実行するアクション記述を返す
//   - ペア成功時／失敗時（onPairSuccess/Fail）…将来用フック（現状は空）
//
// 重複計算バグ防止：乗算は乗算同士、加算は加算同士でまとめてから合成する。
// charm は charms.json の1定義オブジェクト（{id,type,value,...}）。

// combo_step_boost の合計（コンボ倍率の増分に上乗せする値）。
function charmComboStepBonus(charms) {
  return (charms || []).reduce(
    (sum, c) => sum + (c && c.type === 'combo_step_boost' ? c.value : 0),
    0
  );
}

/**
 * ダメージ計算前のチャーム補正を集計する。
 * @param {object[]} charms 装備チャーム定義
 * @param {{pairs:object[], hand:object}} ctx 成立ペア群・役
 * @returns {{mult:number, flat:number}} 乗算補正（1+Σ）と加算補正（Σ）
 */
function charmDamageCorrections(charms, ctx) {
  let multAdd = 0; // 乗算補正の加算分（合成前）
  let flatAdd = 0; // 加算補正
  const pairs = (ctx && ctx.pairs) || [];

  (charms || []).forEach((c) => {
    if (!c) return;
    switch (c.type) {
      case 'suit_pair_damage_mult':
        // 指定スートのペア（2枚とも同スート）成功時に乗算+value
        if (pairs.some((p) => p.cards.every((card) => card.suit === c.suit))) {
          multAdd += c.value;
        }
        break;
      case 'flat_damage_add':
        flatAdd += c.value;
        break;
      // combo_step_boost はコンボ倍率側（charmComboStepBonus）で処理するため無視
      default:
        break;
    }
  });

  // 乗算はまとめて (1 + Σ)、加算はまとめて Σ
  return { mult: 1 + multAdd, flat: flatAdd };
}

/**
 * ターン開始時にSceneが実行すべきアクション記述を返す（演出はScene側が担当）。
 * @param {object[]} charms
 * @returns {{action:string, count:number, durationMs:number}[]}
 */
function charmTurnStartActions(charms) {
  const actions = [];
  (charms || []).forEach((c) => {
    if (c && c.type === 'reveal_random') {
      actions.push({ action: 'reveal_random', count: c.count || 1, durationMs: c.value });
    }
  });
  return actions;
}
