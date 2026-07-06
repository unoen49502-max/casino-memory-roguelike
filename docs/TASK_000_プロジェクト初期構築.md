# TASK_000_プロジェクト初期構築.md

## 目的

Phaser.js + Electronの空プロジェクトを構築し、`npm start` でゲームウィンドウが起動してScene遷移が動く状態を作る。

## 前提

- 新規プロジェクト。既存コードなし
- CLAUDE.md記載のディレクトリ構造・命名規則に従う
- Node.js環境はセットアップ済みの想定（なければ手順を提示してマスターに実行してもらう）

## 実装内容

1. `npm init` 後、electron・phaserをインストール。package.jsonに `start` スクリプトを定義
2. Electronメインプロセス（main.js）を作成
   - ウィンドウサイズ：1280×720、リサイズ不可、メニューバー非表示
3. src/index.html と src/game.js を作成し、Phaserを初期化
   - 解像度1280×720、背景色は暗い赤紫系（#1a0a14）
4. Sceneを2つ作成して遷移を確認
   - bootScene.js：起動時のアセット読込用（今は空でよい、即titleSceneへ）
   - titleScene.js：中央に「CASINO ROGUELIKE (PROTOTYPE)」のテキスト、クリックで空のbattleScene.jsへ遷移
5. battleScene.js：空のScene。「BATTLE SCENE」のテキストのみ表示
6. .gitignore作成（node_modules等）、git init、初回コミット（`feat: プロジェクト初期構築`）

## 動作確認

- `npm start` で1280×720のウィンドウが開く
- タイトルテキストが表示され、クリックでbattleSceneに遷移する
- コンソールにエラーが出ていない

## 注意事項

- ゲームロジックは一切実装しない（次TASK以降）
- ビルド設定（electron-builder等）は今は不要。開発起動のみでよい
- Phaserのバージョンは3系の安定版を使用し、package.jsonでバージョン固定すること
