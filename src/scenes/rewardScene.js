// rewardScene：雑魚戦勝利後の小報酬3択（3軸から1つずつ提示）。
// 選択肢は rewards.json で定義。成長（めくり回数+1）は1ラン1回まで出現。
class RewardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RewardScene' });
  }

  create() {
    const run = this.registry.get('run');
    const rewards = this.cache.json.get('rewards') || {};
    const cx = this.scale.width / 2;

    this.add
      .text(cx, 80, '報酬を1つ選択', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#f5e6d8',
      })
      .setOrigin(0.5);

    // 3軸：即時・経済・成長（成長は取得済みなら経済で代替せず非表示→2択でよい）
    const options = [rewards.immediate, rewards.economy];
    if (rewards.growth && !run.growthRewardTaken) options.push(rewards.growth);

    const startX = cx - ((options.length - 1) * 320) / 2;
    options.forEach((opt, i) => {
      const x = startX + i * 320;
      const y = this.scale.height / 2;
      const box = this.add
        .rectangle(x, y, 280, 200, 0x2a1420)
        .setStrokeStyle(2, 0xffb0d0)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y - 60, opt.axis, { fontFamily: 'sans-serif', fontSize: '18px', color: '#ff9ecb' })
        .setOrigin(0.5);
      this.add
        .text(x, y, opt.label, { fontFamily: 'sans-serif', fontSize: '20px', color: '#f5e6d8', align: 'center', wordWrap: { width: 250 } })
        .setOrigin(0.5);
      box.on('pointerdown', () => this._pick(opt));
    });
  }

  _pick(opt) {
    const run = this.registry.get('run');
    if (opt.type === 'heal') run.healHp(opt.value);
    else if (opt.type === 'chips') run.addChips(opt.value);
    else if (opt.type === 'flip') {
      run.addFlip();
      run.growthRewardTaken = true;
    }
    run.advance();
    routeToCurrentStep(this);
  }
}
