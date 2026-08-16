JO-Therapy v6
================

入れ替えるファイル
- index.html
- app.js
- style.css
- sw.js

そのまま残すファイル
- data.js
- manifest.json
- icon-192.png など既存アイコン

重要
- 既存 localStorage キーを維持しています。
  - joslerTherapyCasesV1
  - joslerTherapySummaryV1
- QUICK用に新しく joslerTherapyQuickV1 を追加しています。
- app.js / style.css / data.js に ?v=6 を付け、sw.js のキャッシュ名も v6 にしています。

v6の主な変更
- CASE BANK / QUICK 120 / FULL 29 / CHECK の4本柱へ再構成
- QUICK 120追加
  - カルテ原文
  - 症例の概略 500字以内
  - 自己省察 300字以内
  - AI用プロンプト
  - QUICK完成表示
- FULL 29はv5のPRE-FLIGHTと6セクションを継承
- HOMEにQUICK進捗と「次にやること」を追加
- CHECK画面に未完了症例を一覧化
- キャッシュ更新対策

導入
1. 現在のv5をバックアップ
2. 上記4ファイルを全置換
3. commit
4. Safariで一度Web版を開く
5. PWAを完全終了して再起動
6. まだ旧表示ならSafariのサイトデータ/ホーム画面PWAを更新

テスト推奨
1. 既存症例が消えていないか
2. QUICKで症例選択
3. 原文保存
4. AI用プロンプトコピー
5. 概略＋自己省察を保存
6. 症例一覧に QUICK ✓ が付くか
7. FULLでPRE-FLIGHTが動くか
