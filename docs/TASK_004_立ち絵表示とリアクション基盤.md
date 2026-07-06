# TASK_004_立ち絵表示とリアクション基盤.md（Step3・システム部分）

## 目的

リリム立ち絵の表示枠と「リアクションイベント基盤」を実装する。ビジュアルの最終調整はマスターが後日指示するため、**本TASKは差し替え可能な骨組みを作ることが目的**。見た目の作り込みはしない。

## 前提

- TASK_003完了：バトルが通しで動く
- 立ち絵の正式素材は未完成。プレースホルダー（単色シルエット等の仮画像）で実装する
- 立ち絵方式は「差分＋ワープ」：全身1枚＋後ろ髪1枚＋表情差分4〜5枚（詳細はdesign_visual_direction_v1.md参照）

## 実装内容

1. **キャラ表示クラス**（src/objects/character_display.js）
   - レイヤー構造：後ろ髪 → 体（全身） → 表情 の3レイヤー重ね
   - 素材パスは src/data/characters.json から読む（char_lilim_body.png / char_lilim_backhair.png / char_lilim_face_*.png）
   - プレースホルダー：仮画像3枚（体・後ろ髪・顔）を生成して配置。**正式素材が同名で置かれたら差し替わる**構造にする
2. **表情差分の切替API**
   - `setFace(faceId)` で即時切替（トランジションなし、0.1秒以内厳守）
   - 表情ID：normal / smile / surprise / smug / sad の5種
3. **リアクションイベント基盤（本TASKの核）**
   - バトルロジックが発火するイベントとリアクションの対応表を **src/data/reactions.json** で定義：
   | イベント | 表情 | tween |
   |---|---|---|
   | pair_success | surprise | bounce（スケール1.0→1.1→1.0、0.25秒） |
   | pair_fail | sad | sink（y+8px、0.2秒） |
   | player_damaged | surprise | shake（x±6px×6回） |
   | battle_start | smile | slide_in |
   | victory | smug | bounce |
   | defeat | smile | none |
   - tween種別はcharacter_display.js内に関数として実装し、JSONから名前で呼ぶ
   - **対応表がJSONなので、マスターの演出指示はJSON編集＋素材差し替えで反映できる**（コード変更不要にするのが狙い）
4. **アイドルモーション**
   - 呼吸：縦スケール±1.5%、周期2.4秒、常時
   - 後ろ髪ゆらぎ：skew±2°＋y±3px、周期3秒（呼吸と位相をずらす）
5. **配置**
   - design_visual_direction_v1.mdの案Aレイアウト：キャラは中央・表示高さ画面の60%・盤面より背面
   - 位置・スケールは定数化（マスター調整箇所）

## 動作確認

- バトル中、ペア成立でプレースホルダーが弾み、失敗で沈む
- 常時ゆっくり呼吸し、後ろ髪が別周期で揺れている
- reactions.jsonの表情名を書き換えると挙動が変わる（コード変更なしで）
- 素材ファイルを差し替えると表示が変わる

## 注意事項

- 見た目の完成度は求めない。**イベントが正しく飛び、JSONで制御できること**が合格ライン
- バトルロジック（src/logic/）には触らない。イベント購読のみ
- 完了時コミット：`feat: 立ち絵表示とリアクション基盤`
