// scene_router.js
// ランの現在ステップに対応するSceneへ遷移する共通ルーティング。
// Scene間の直接参照を避け、run_manager の step 情報だけで遷移先を決める。
const STEP_SCENE_MAP = {
  battle: 'BattleScene',
  reward: 'RewardScene',
  shop: 'ShopScene',
  result: 'ResultScene',
};

function routeToCurrentStep(scene) {
  const run = scene.registry.get('run');
  const step = run.currentStep();
  scene.scene.start(STEP_SCENE_MAP[step.type] || 'ResultScene');
}
