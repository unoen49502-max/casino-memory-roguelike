// turn_manager.js
// ターン管理。Phaser非依存の純粋ロジック。
// プレイヤーターン（めくり）→ 敵ターン（攻撃）→ … のループのターン番号を数え、
// フェイルセーフ（MAX_TURNS経過で強制敗北）を判定する。
//
// 依存（グローバル）：MAX_TURNS（balance_config.js）

class TurnManager {
  constructor(config = {}) {
    // maxTurns経過で強制敗北。未指定なら balance_config の MAX_TURNS。
    this.maxTurns = config.maxTurns != null ? config.maxTurns : MAX_TURNS;
    this.turn = 0;
  }

  // 次のプレイヤーターンへ。現在のターン番号（1始まり）を返す。
  next() {
    this.turn += 1;
    return this.turn;
  }

  // フェイルセーフ到達（maxTurns経過）。
  reachedFailsafe() {
    return this.turn >= this.maxTurns;
  }
}

// このターンでボスギミック（auto_clear_pair）が発動するか（純粋関数）。
// enemies.json の gimmicks 配列を見て、intervalの倍数ターンで発動と判定する。
function gimmickFiresThisTurn(enemy, turn) {
  if (!enemy || !Array.isArray(enemy.gimmicks)) return false;
  return enemy.gimmicks.some(
    (g) => g.type === 'auto_clear_pair' && g.interval > 0 && turn % g.interval === 0
  );
}
