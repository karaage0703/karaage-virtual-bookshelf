# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発環境とコマンド

### ローカル開発サーバー起動
```bash
# HTTPサーバーを起動 (CORS制約回避のため)
python -m http.server 8000
# または
npx serve .
# または
php -S localhost:8000
```

ブラウザで `http://localhost:8000` を開く

### ハイライト機能の管理
```bash
# ハイライトインデックス生成（ハイライト機能を使用する場合）
./scripts/generate-highlights-index.sh
```

## アーキテクチャ概要

### データ構造とフロー
このプロジェクトは **フロントエンドのみのWebアプリケーション** で、バックエンドサーバーは不要です。

#### 主要コンポーネント
- **VirtualBookshelf** (`js/bookshelf.js`): メインアプリケーションクラス、UI制御とビジネスロジック
- **BookManager** (`js/book-manager.js`): 蔵書のCRUD操作（作成・読み込み・更新・削除）
- **HighlightsManager** (`js/highlights.js`): Kindleハイライトの表示と管理

#### データ永続化戦略
1. **ブラウザのLocalStorage**: ユーザーの設定、星評価、メモ、本棚カスタマイズを保存
2. **GitHubリポジトリファイル**: 永続化用データ（`data/library.json`）
3. **ハイブリッド読み込み**: LocalStorage優先、フォールバックとしてファイル読み込み

#### コアデータファイル
- `data/library.json`: 統合蔵書データ（本の情報 + ユーザーデータ）
- `data/config.json`: アフィリエイトIDなどのグローバル設定
- `data/highlights-index.json`: ハイライトファイルのASINマッピング（自動生成）

### 初期化フロー
1. `VirtualBookshelf.init()` でBookManagerを初期化
2. `BookManager.initialize()` で蔵書データを読み込み（LocalStorage → ファイル）
3. ユーザー設定データをLocalStorageから復元、なければファイル読み込み
4. `HighlightsManager` を初期化してハイライト機能を有効化

### データエクスポート・インポート機能
- **Kindleデータインポート**: [Kindle Bookshelf Exporter](https://chromewebstore.google.com/detail/kindle-bookshelf-exporter/olimpmeljimffgjonlpmiaebaonnegdp)でエクスポートしたJSONファイルを取り込み
- **手動蔵書追加**: ASIN、タイトル、著者を手動入力して蔵書に追加
- **設定エクスポート**: LocalStorageのデータを`library.json`としてダウンロード

### 本棚管理システム
- 複数の本棚を作成してテーマ別にキュレーション
- 本棚ごとの公開・非公開設定
- ドラッグ&ドロップによる本の並び替え（カスタム順序の永続化）
- 星評価システム（1-5星）とフィルタリング

### ハイライト機能（オプション）
- Kindleハイライトの表示（Obsidian Kindle Pluginでエクスポート）
- ASINベースでのハイライト自動マッピング
- `generate-highlights-index.sh`でインデックス生成

### UI/UX パターン
- **2つの表示モード**: 表紙表示（カード）・リスト表示
- **レスポンシブデザイン**: デスクトップ・タブレット・スマートフォン対応
- **インタラクティブな要素**: モーダル詳細表示、星評価、検索・フィルター

### Amazon Associates統合
- `data/config.json`のaffiliateIdでアフィリエイトリンク自動生成
- 商品画像とリンクをAmazonから動的取得

## 重要な技術的制約

### セキュリティとCORS
- **CORS制約**: `file://`プロトコルではJSONファイル読み込み不可のため、HTTPサーバーが必須
- **クライアントサイドのみ**: バックエンド処理なし、すべてJavaScriptで完結

### ファイル構成規則
- **データファイル命名**: ASINベース（Amazon Standard Identification Number）
- **ハイライトファイル**: YAMLフロントマターにASIN情報が必要
- **自動生成ファイル**: `data/highlights-index.json`は手動編集禁止