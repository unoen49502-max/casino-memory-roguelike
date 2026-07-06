// character_display.js
// キャラ立ち絵の表示クラス。「差分＋ワープ方式」の骨組み。
// レイヤー：後ろ髪 → 体（全身） → 表情 の3枚重ね。
// 素材はcharacters.jsonのkey/pathで指定。未ロード時はプレースホルダーを生成し、
// 正式素材が同名（同key）で置かれれば自動で差し替わる。
//
// 演出tween（bounce/sink/shake/slide_in/none）は本クラス内に関数として実装し、
// reactions.jsonから「名前」で呼ぶ（演出変更はJSON編集＋素材差し替えで完結）。

// --- プレースホルダー素材の寸法（正式素材の基準サイズ。差し替え時はここを合わせる）---
const BODY_W = 360;
const BODY_H = 680;
const BACKHAIR_W = 420;
const BACKHAIR_H = 720;
const FACE_W = 200;
const FACE_H = 150;
const HEAD_CY = 110; // 体テクスチャ内の頭の中心Y
const FACE_OFFSET_Y = HEAD_CY - BODY_H / 2; // 顔レイヤーの配置Y（頭に重ねる）

// --- 配置（design_visual_direction_v1 案A：中央・高さ画面60%・盤面より背面）---
// 位置・スケールはマスター調整箇所として定数化。
const CHARACTER_LAYOUT = {
  x: 640,
  y: 400,
  heightRatio: 0.6,
  depth: -10, // 盤面より背面
};

const FACE_IDS = ['normal', 'smile', 'surprise', 'smug', 'sad'];

class CharacterDisplay {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} charDef characters.json の1キャラ定義
   * @param {object} reactions reactions.json（イベント→{face,tween}）
   * @param {object} [layout] 配置上書き
   */
  constructor(scene, charDef, reactions, layout) {
    this.scene = scene;
    this.def = charDef;
    this.reactions = reactions || {};
    this.layout = Object.assign({}, CHARACTER_LAYOUT, layout || {});

    // 未ロードkeyはプレースホルダーを生成（正式素材があればそちらが使われる）
    CharacterDisplay.ensureTextures(scene, charDef);

    const L = this.def.layers;
    this.backhair = scene.add.image(0, 0, L.backhair.key).setOrigin(0.5);
    this.body = scene.add.image(0, 0, L.body.key).setOrigin(0.5);
    this.face = scene.add.image(0, FACE_OFFSET_Y, L.faces.normal.key).setOrigin(0.5);

    // 呼吸（scaleY）と演出bounce（scale）の衝突を避けるためレイヤーを分離：
    //   outer（位置：slide_in/shake/sink）
    //     └ reactScale（bounce）
    //         └ breath（呼吸scaleY）
    //             └ [backhair, body, face]
    this.breath = scene.add.container(0, 0, [this.backhair, this.body, this.face]);
    this.reactScale = scene.add.container(0, 0, [this.breath]);
    this.outer = scene.add.container(this.layout.x, this.layout.y, [this.reactScale]);

    this.baseScale = (scene.scale.height * this.layout.heightRatio) / BODY_H;
    this.outer.setScale(this.baseScale);
    this.outer.setDepth(this.layout.depth);

    this.baseX = this.layout.x;
    this.baseY = this.layout.y;
    this.currentFace = 'normal';

    this._startIdle();
  }

  // ================= 表情差分 =================

  // 即時切替（トランジションなし）。存在しないIDはnormalにフォールバック。
  setFace(faceId) {
    const faces = this.def.layers.faces;
    const f = faces[faceId] || faces.normal;
    this.face.setTexture(f.key);
    this.currentFace = faces[faceId] ? faceId : 'normal';
  }

  // ================= リアクション（reactions.jsonから駆動）=================

  // イベント名で表情＋tweenを適用。対応が無ければ何もしない。
  react(eventName) {
    const r = this.reactions[eventName];
    if (!r) return;
    if (r.face) this.setFace(r.face);
    this._playTween(r.tween);
  }

  _playTween(name) {
    const t = this.scene.tweens;
    switch (name) {
      case 'bounce':
        this.reactScale.setScale(1);
        t.add({ targets: this.reactScale, scaleX: 1.1, scaleY: 1.1, duration: 125, yoyo: true, ease: 'Quad.easeOut' });
        break;
      case 'sink':
        t.add({
          targets: this.outer, y: this.baseY + 8, duration: 200, yoyo: true, ease: 'Quad.easeOut',
          onComplete: () => { this.outer.y = this.baseY; },
        });
        break;
      case 'shake':
        this.outer.x = this.baseX;
        t.add({
          targets: this.outer, x: this.baseX + 6, duration: 40, yoyo: true, repeat: 5,
          onComplete: () => { this.outer.x = this.baseX; },
        });
        break;
      case 'slide_in':
        this.outer.x = this.baseX - 240;
        this.outer.alpha = 0.2;
        t.add({ targets: this.outer, x: this.baseX, alpha: 1, duration: 420, ease: 'Cubic.easeOut' });
        break;
      case 'none':
      default:
        break;
    }
  }

  // ================= アイドルモーション =================

  _startIdle() {
    // 呼吸：縦スケール±1.5%、周期2.4秒（half=1.2s yoyo）
    this.breath.scaleY = 0.985;
    this.scene.tweens.add({
      targets: this.breath, scaleY: 1.015, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // 後ろ髪ゆらぎ：±2°＋y±3px、周期3秒（呼吸と別周期で位相ずれ）
    // ※Phaserのスプライトはskew非対応のため、揺れは回転で近似する
    this.backhair.setAngle(-2);
    this.backhair.y = -3;
    this.scene.tweens.add({
      targets: this.backhair, angle: 2, y: 3, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ================= プレースホルダー素材生成 =================

  // 未ロードのkeyに対して仮テクスチャを生成する（体・後ろ髪・表情5種）。
  static ensureTextures(scene, def) {
    const L = def.layers;
    if (!scene.textures.exists(L.backhair.key)) CharacterDisplay._genBackhair(scene, L.backhair.key);
    if (!scene.textures.exists(L.body.key)) CharacterDisplay._genBody(scene, L.body.key);
    Object.keys(L.faces).forEach((fid) => {
      const k = L.faces[fid].key;
      if (!scene.textures.exists(k)) CharacterDisplay._genFace(scene, k, fid);
    });
  }

  static _genBackhair(scene, key) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x3a1c2e, 1);
    g.fillRoundedRect(30, 20, BACKHAIR_W - 60, BACKHAIR_H - 90, 140);
    g.generateTexture(key, BACKHAIR_W, BACKHAIR_H);
    g.destroy();
  }

  static _genBody(scene, key) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xb0668e, 1); // 単色シルエット（仮）
    g.fillRoundedRect(60, 175, BODY_W - 120, BODY_H - 195, 55); // 胴
    g.fillRect(BODY_W / 2 - 26, 150, 52, 55); // 首
    g.fillCircle(BODY_W / 2, HEAD_CY, 80); // 頭
    g.generateTexture(key, BODY_W, BODY_H);
    g.destroy();
  }

  static _genFace(scene, key, faceId) {
    const g = scene.make.graphics({ add: false });
    const eyeCol = 0x2a1420;
    const mouthCol = 0x8a2a4a;
    const lx = FACE_W * 0.34;
    const rx = FACE_W * 0.66;
    const ey = FACE_H * 0.42;
    const my = FACE_H * 0.7;
    const cx = FACE_W / 2;

    const eye = (x, r) => g.fillCircle(x, ey, r);

    g.fillStyle(eyeCol, 1);
    switch (faceId) {
      case 'surprise':
        eye(lx, 12); eye(rx, 12);
        g.fillStyle(mouthCol, 1); g.fillCircle(cx, my, 12);
        break;
      case 'smile':
        eye(lx, 8); eye(rx, 8);
        g.lineStyle(5, mouthCol, 1);
        g.beginPath(); g.arc(cx, my - 6, 20, 0.15 * Math.PI, 0.85 * Math.PI, false); g.strokePath();
        break;
      case 'sad':
        eye(lx, 8); eye(rx, 8);
        g.lineStyle(5, mouthCol, 1);
        g.beginPath(); g.arc(cx, my + 14, 20, 1.15 * Math.PI, 1.85 * Math.PI, false); g.strokePath();
        break;
      case 'smug':
        g.fillRect(lx - 10, ey - 2, 20, 4); // 半目
        g.fillRect(rx - 10, ey - 2, 20, 4);
        g.lineStyle(5, mouthCol, 1);
        g.beginPath(); g.moveTo(cx - 14, my); g.lineTo(cx + 16, my - 6); g.strokePath(); // ニヤリ
        break;
      case 'normal':
      default:
        eye(lx, 8); eye(rx, 8);
        g.fillStyle(mouthCol, 1); g.fillRect(cx - 14, my, 28, 4);
        break;
    }
    g.generateTexture(key, FACE_W, FACE_H);
    g.destroy();
  }
}
