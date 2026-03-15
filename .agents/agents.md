# Ventus Wallet - Agent Rules

## ⚠️ Git ルール（絶対厳守）

- **`git push --force` は絶対に使用禁止**（コミット履歴が消えるため）
- 通常の `git push origin main` のみ使用すること
- コミット前に必ず `git status` で変更内容を確認すること

## プロジェクト概要

- Symbol ブロックチェーンのウォレット（Ventus Wallet）
- GitHub: https://github.com/mikunNEM/Ventus_Wallet
- ローカルパス: /Users/minoru/my-antigravity-skills/ventus/
- ローカルサーバー: http://localhost:8080

## 使用技術

- Symbol SDK v3
- Symbol REST API (Node: https://sym-main-01.opening-line.jp:3001)
- SSS Extension (ブラウザ署名拡張)
- Vanilla JS / HTML / CSS

## 重要な関数・ファイル

- `js/modules/main.js` - メインロジック
- `js/modules/symbolApi.js` - Symbol REST APIラッパー
- `js/modules/nft.js` - NFT表示
- `index.html` - UI

## 注意事項

- `getMosaicsNames()` はモザイク名解決に使用（`/namespaces/mosaic/names` エンドポイント）
- `/namespaces/names` のレスポンスは **フラット配列** `[{id, name}]` （`namespaceNames` ラッパーなし）
- マルチシグ1-of-1 → AggregateComplete（HashLock不要）
- マルチシグ2以上 → AggregateBonded（HashLock必要）
