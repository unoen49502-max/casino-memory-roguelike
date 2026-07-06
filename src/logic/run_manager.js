// run_manager.js
// ラン（雑魚3戦＋ボス1戦）の状態を一元管理する。Phaser非依存。
// Scene間のデータ受け渡しはこのオブジェクト経由に統一する（Scene間の直接参照禁止）。
//
// 依存（グローバル）：PLAYER_MAX_HP（balance_config.js）

// ランの進行ステップ（雑魚A→報酬→雑魚B→報酬→ショップ→雑魚C→報酬→ボス→結果）。
const RUN_STEPS = [
  { type: 'battle', enemy: 'mob_a' },
  { type: 'reward' },
  { type: 'battle', enemy: 'mob_b' },
  { type: 'reward' },
  { type: 'shop' },
  { type: 'battle', enemy: 'mob_c' },
  { type: 'reward' },
  { type: 'battle', enemy: 'boss_lilim' },
  { type: 'result' },
];

const RUN_BASE_FLIPS = 2; // 1ターンにめくれる基本枚数

class RunManager {
  constructor() {
    this.reset(0);
  }

  // ラン開始時の初期化（HP50・チップ0・チャーム空）。
  reset(startTimeMs) {
    this.maxHp = PLAYER_MAX_HP;
    this.hp = PLAYER_MAX_HP;
    this.chips = 0;
    this.charms = []; // チャームidの配列（最大3）
    this.extraFlips = 0; // 報酬・チャームによるめくり枚数増加
    this.position = 0;
    this.growthRewardTaken = false; // 「成長」報酬は1ラン1回まで
    this.outcome = null; // 'clear' | 'defeat'
    this.startTimeMs = startTimeMs || 0;
  }

  currentStep() {
    return RUN_STEPS[this.position];
  }

  advance() {
    this.position = Math.min(this.position + 1, RUN_STEPS.length - 1);
    return this.currentStep();
  }

  currentEnemyId() {
    const s = this.currentStep();
    return s && s.type === 'battle' ? s.enemy : null;
  }

  // 現在の敵がボスか（結果分岐用）。
  isBossStep() {
    return this.currentEnemyId() === 'boss_lilim';
  }

  // 1ターンにめくれる枚数（基本＋増加分）。
  flipCount() {
    return RUN_BASE_FLIPS + this.extraFlips;
  }

  addChips(n) {
    this.chips += n;
  }

  spendChips(n) {
    if (this.chips >= n) {
      this.chips -= n;
      return true;
    }
    return false;
  }

  healHp(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  setHp(n) {
    this.hp = Math.max(0, Math.min(this.maxHp, n));
  }

  addFlip() {
    this.extraFlips += 1;
  }

  // チャーム装備（空きがあれば追加）。満杯ならfalse（入替はreplaceCharm）。
  addCharm(id) {
    if (this.charms.indexOf(id) >= 0) return false; // 重複不可
    if (this.charms.length < 3) {
      this.charms.push(id);
      return true;
    }
    return false;
  }

  replaceCharm(index, id) {
    if (index >= 0 && index < 3 && this.charms.indexOf(id) < 0) {
      this.charms[index] = id;
      return true;
    }
    return false;
  }

  finish(outcome) {
    this.outcome = outcome;
  }

  elapsedMs(nowMs) {
    return nowMs - this.startTimeMs;
  }
}
