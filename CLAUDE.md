# CLAUDE.md ── カジノローグライク（タイトル未定）プロトタイプ

## プロジェクト概要

神経衰弱×ローグライクの成人向けPCゲーム（DLsite販売予定）。
現在は**プロトフェーズ**：リリム1キャラ・1フロア・最小機能で「コアの面白さ」を検証する。

- 1ランの流れ：雑魚戦×3＋ボス戦×1（ショップは雑魚2戦目後に1回）
- コアループ：カードをめくる→ペア成立で役→ダメージ→敵ターン→勝敗

## 技術スタック

- Phaser.js 3系 + Electron
- 全テキスト主義（GUIエディタ・シーンエディタは使わない）
- Git（ブランチはmainのみ、コミットは `feat:` `fix:` `docs:` プレフィックス）

## ディレクトリ構造

```
casino-roguelike/
├── CLAUDE.md
├── main.js              # Electronエントリ
├── package.json
├── src/
│   ├── index.html
│   ├── game.js          # Phaser初期化・Scene登録
│   ├── scenes/          # bootScene.js, titleScene.js, battleScene.js 等
│   ├── objects/         # card.js, board.js 等の部品クラス
│   ├── data/            # cards.json, charms.json 等の定義データ
│   └── utils/
├── assets/
│   ├── images/          # cards/ chars/ effects/ ui/
│   └── audio/           # bgm/ se/
└── docs/                # TASK文書・設計メモ
```

## 命名規則

| 対象 | 規則 |
|---|---|
| ファイル名 | snake_case.js（例：card.js, damage_calc.js） |
| Sceneファイルのみ | xxxScene.js（例：battleScene.js）※例外 |
| クラス名 | PascalCase |
| 関数・変数 | camelCase |
| 定数 | UPPER_SNAKE_CASE |
| 素材 | card_♠_07.png / char_lilim_body.png / se_card_flip.mp3 等 |

## 設計上の重要な前提

- **ゲームロジックと演出を分離する**：ペア判定・ダメージ計算等は純粋関数寄りに作り、Scene側から呼ぶ。後のバランス調整・シミュレーターで再利用するため
- **キャラ・チャーム等の定義はJSONデータ化**：デモ版でキャラ追加が楽になるように、コードへのハードコーディングを避ける
- **立ち絵は差分＋ワープ方式**：全身1枚＋表情差分をtweenで動かす。パーツ分解アニメは実装しない
- **プレースホルダー素材で先行してよい**：正式素材はマスターが後から差し替える。差し替えやすいようパス・サイズを定数化しておく

## やってはいけないこと

- TASK文書に書かれていない機能の先行実装（1機能1TASK厳守）
- 動作しているSceneやロジックの、依頼されていないリファクタリング
- 独自判断でのゲームルール変更（数値・仕様は設計文書とTASK文書が正）
- node_modules や大容量バイナリのコミット

## 進行中の作業

- [ ] TASK_000：プロジェクト初期構築
- [ ] TASK_001：カードめくり機能＋盤面描画（Step1）
- Step2以降のTASKはStep1のテストプレイ後に発行される

## 動作確認の原則

各TASK完了時に `npm start` で起動確認し、TASK文書の「動作確認」項目を全て満たすこと。満たせない場合は理由を報告し、勝手に仕様を変えて通さない。
