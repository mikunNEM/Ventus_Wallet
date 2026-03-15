# Ventus Wallet 🌬️

**Symbol ブロックチェーン対応 Web ウォレット（v3）**

> Symbol SDK v3 + SSS Extension を使用した静的ウォレットアプリ。秘密鍵を扱わず、署名は SSS Extension に委ねる安全設計。

---

## 🌐 対応ネットワーク

| ネットワーク | 先頭文字 | 自動判定 |
|---|---|---|
| MAIN NET | `N` | ✅ |
| TEST NET | `T` | ✅ |

ノードは [nodewatch.symbol.tools](https://nodewatch.symbol.tools) から自動選択（🇯🇵 日本ノード優先 → isHealthy チェック → ブロック高最大）。

---

## ✨ 機能一覧

### 💸 トランザクション送信

| 機能 | 説明 |
|---|---|
| **通常送信 (Transfer)** | XYM・モザイクの送信。ネームスペース指定可。手数料選択（Slow〜Fast） |
| **アグリゲート送信** | CSV ファイルで複数アドレスへの一括送信（AggregateComplete 対応） |
| **マルチシグアカウントから送信** | 連署者として署名。1-of-N は Complete、2-of-N 以上は Bonded |
| **開発者への寄付** | 1-click 寄付 |

### 🧩 モザイク操作

| 機能 | 説明 |
|---|---|
| **モザイク作成** | 可分性・フラグ（供給量可変・転送可・制限可・回収可）・有効期間を指定 |
| **供給量変更** | 自分が発行した supplyMutable モザイクの供給量を増減 |
| **モザイク回収 (Revoke)** | revokable モザイクを指定アドレスから回収 |

### 🗂️ ネームスペース操作

| 機能 | 説明 |
|---|---|
| **ルートネームスペース登録** | ブロック数・手数料を表示して登録 |
| **サブネームスペース登録** | 既存ネームスペース配下にサブを追加 |
| **エイリアスリンク** | ネームスペースにモザイクまたはアドレスをリンク |

### 📋 メタデータ

| 機能 | 説明 |
|---|---|
| **アカウントメタデータ** | キー・バリューの読み書き（新規作成・更新） |
| **モザイクメタデータ** | モザイクに対するキー・バリュー設定 |
| **ネームスペースメタデータ** | ネームスペースに対するキー・バリュー設定 |

### 👥 マルチシグ

| 機能 | 説明 |
|---|---|
| **マルチシグアカウント作成** | 連署者追加・削除、最小署名数を設定 |
| **マルチシグツリー表示** | Canvas でグラフィカルにツリーを描画 |
| **署名待ち Tx 一覧** | AggregateBonded の署名待ち一覧を表示・署名 |

### 📊 アカウント情報

| 機能 | 説明 |
|---|---|
| **XYM 残高表示** | |
| **保有モザイク表示** | ネームスペース名・保有量・期限切れチェック |
| **発行モザイク一覧** | 供給量・残高・有効期限・各フラグ（制限可・供給量可変・転送可・回収可） |
| **ネームスペース一覧** | 有効期限・エイリアスタイプ・リンク先 |
| **メタデータ一覧** | キー・タイプ・値・対象 ID |
| **ハーベスト一覧** | 収穫したブロックの手数料履歴 |

### 🖼️ NFT / リッチリスト

| 機能 | 説明 |
|---|---|
| **Mosaic Rich List** | 回収モザイク選択→保有者ランキング（順位・アドレス・保有量・シェア%） |
| **NFT 画像表示** | Mosaic Center / NFTDrive / COMSA UNIQUE / COMSA BUNDLE / Ukraine NFT |
| **CSV ダウンロード** | リッチリストを CSV で保存 |
| **NFT Drive Explorer リンク** | アドレスに紐づく NFT 一覧へのショートカット |

### 📜 トランザクション履歴

- 種別バッジ（Transfer / Mosaic 系 / Namespace 系 / Aggregate / Multisig…）
- アグリゲート Tx はアコーディオンで内部 Tx を展開
- Transaction Info へのリンク
- NFT 画像・音声・動画・3D モデルをインライン表示

---

## 🛠️ 技術スタック

| 項目 | 技術 |
|---|---|
| Symbol SDK | v3.3.0（CDN: unpkg.com） |
| 署名 | SSS Extension |
| ノード選択 | nodewatch.symbol.tools API |
| フロントエンド | Vanilla HTML/CSS/JS（ES Modules） |
| jQuery | 3.6.3（DOM 操作・pagination） |

---

## 📁 ファイル構成

```
ventus/
├── index.html              # メインページ
├── style.css               # スタイル
├── Mosaic_Viewer.html      # 任意アドレスの NFT ギャラリー
├── Terms_of_use.html       # 利用規約
├── css/
│   ├── BGimg_ventus.css    # 背景テーマ（複数）
│   └── simplePagination.css
├── js/
│   ├── jquery-3.6.3.min.js
│   ├── jquery.simplePagination.js
│   ├── js.cookie.js
│   └── modules/
│       ├── config.js       # ネットワーク設定・定数
│       ├── main.js         # UI ロジック全般
│       ├── nft.js          # NFT デコーダ（NFTDrive / COMSA / Ukraine）
│       ├── symbolApi.js    # Symbol REST API ラッパー
│       └── transactions.js # トランザクションビルダー（SDK v3）
└── src/                    # 画像・音声アセット
```

---

## ⚠️ 注意事項

- 秘密鍵は一切扱いません。署名は [SSS Extension](https://chrome.google.com/webstore/detail/sss-extension/lliohepcpicdffkfknizddecpmlnmkp) が行います。
- 暗号化メッセージ送受信は現在準備中です。
- XYM Monster (xym_mon) は metal-on-symbol v2 依存のため保留中です。
