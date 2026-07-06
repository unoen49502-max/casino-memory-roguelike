// settings.js
// ゲーム設定（音量・演出速度・画面モード）。メモリ保持＋Electron環境ではJSON保存。
// ※localStorageは使わない（Electron環境での確実性のため）。

const GAME_SETTINGS = {
  bgmVolume: 0.7,
  seVolume: 0.8,
  fxFast: false, // 演出速度「高速」＝当たり演出のtween時間を半分に
  fullscreen: false,
};

// 当たり演出のtween時間（高速時は半分）。
function fxDuration(base) {
  return GAME_SETTINGS.fxFast ? Math.round(base * 0.5) : base;
}

// 音量をゲーム全体へ即時反映（BGMはグローバル音量に反映）。
function applyAudioSettings(game) {
  if (game && game.sound) game.sound.volume = GAME_SETTINGS.bgmVolume;
}

// 設定の保存（Electronのみ。ブラウザ等ではメモリ保持のみ）。
function saveSettings() {
  try {
    if (typeof require === 'function') {
      const fs = require('fs');
      fs.writeFileSync('settings.json', JSON.stringify(GAME_SETTINGS, null, 2));
      return true;
    }
  } catch (e) {
    // 非Electron環境（ブラウザ）ではファイル保存はスキップ
  }
  return false;
}

// 設定の読込（Electronのみ）。
function loadSettings() {
  try {
    if (typeof require === 'function') {
      const fs = require('fs');
      if (fs.existsSync('settings.json')) {
        Object.assign(GAME_SETTINGS, JSON.parse(fs.readFileSync('settings.json', 'utf8')));
      }
    }
  } catch (e) {
    // 読込失敗時は既定値のまま
  }
}
