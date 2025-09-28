# 📚 Virtual Bookshelf Template

あなたの個人読書ライブラリを美しく展示するWebアプリケーションテンプレートです。

[Virtual Bookshelf](https://karaage0703.github.io/karaage-virtual-bookshelf/)

## 🎯 概要

このテンプレートは、iPadのKindleアプリや他の電子書籍リーダーで読書をしている方向けの、個人蔵書管理・展示システムです。読んだ本を見つけやすくし、5星評価システムで本を評価・管理できます。

### 主な機能

- 📖 **2つの表示モード**: 表紙表示・リスト表示
- 📚 **複数本棚管理**: テーマ別本棚の作成・キュレーション
- ⭐ **5星評価システム**: 1-5星による本の評価管理・フィルタリング
- 🎯 **ハイライト表示**: ASINベースでKindleのマーカー情報を自動読み込み
- 📝 **個人メモ**: 本ごとのレビューとおすすめ文

- 🔍 **検索・フィルター**: タイトル・著者・星評価での絞り込み
- 📊 **読書統計**: 総蔵書数の表示
- 🔗 **Amazon Associates**: 自動アフィリエイトリンク生成
- 🌐 **公開・共有**: 本棚ごとの公開設定と静的ページ生成
- 💾 **データエクスポート**: 設定・星評価・メモの永続化
- 📥 **蔵書管理**: Kindleインポート、手動追加、削除機能
- 🔄 **ハイライトファイル管理**: スクリプトベースでのハイライトインデックス生成
- 🔀 **並び替え機能**: ドラッグ&ドロップによる本の順序変更・保存

## 🚀 使い始めるには

### 1. このテンプレートを使用してリポジトリを作成

1. GitHub上でこのリポジトリの「Use this template」ボタンをクリック
2. 新しいリポジトリ名を入力（例: `my-bookshelf`）
3. 「Create repository from template」をクリック

### 2. リポジトリをGitHubに公開

1. 作成したリポジトリをPublic（公開）に設定
2. ファイルがすべてアップロードされていることを確認

### 3. GitHub Pagesを有効化

1. 作成したリポジトリで Settings > Pages を開く
2. Source を「Deploy from a branch」に設定
3. Branch を「main」に設定
4. Saveボタンをクリック
5. 数分待つとサイトが公開される（URLが表示されます）

### 4. あなたの本を追加する

#### 初回セットアップ（サンプルデータで確認）
テンプレートにはサンプルデータが含まれています：
1. ローカルサーバーを起動（後述）
2. ブラウザでアクセスして動作を確認
3. サンプル本「面倒なことはＣｈａｔＧＰＴにやらせよう」にはハイライトも含まれています

#### 本格運用：あなたのデータに置き換え

**方法1: Kindleデータのインポート（推奨）**
1. [Kindle Bookshelf Exporter](https://chromewebstore.google.com/detail/kindle-bookshelf-exporter/olimpmeljimffgjonlpmiaebaonnegdp)をChromeにインストール
2. Kindle Cloud Readerで蔵書データをJSONファイルとしてエクスポート
3. ブラウザで「📥 Kindleインポート」ボタンをクリックしてインポート

**方法2: 手動で本を追加**
1. 「➕ 手動追加」ボタンをクリック
2. ASIN、タイトル、著者を入力
3. 購入日と読書状況を設定

**方法3: データファイルを直接編集**
1. `data/my_library.json` を編集（後述のデータフォーマット参照）
2. `data/user_data.json` でお気に入りや本棚を設定

### 5. カスタマイズ

#### 基本設定
- **アフィリエイトID**: `data/user_data.json`の`settings.affiliateId`を変更
- **本棚の作成**: デフォルトの本棚を編集、新しい本棚を追加
- **カラーテーマ**: CSS変数でカスタマイズ

#### ハイライト機能（オプション）
1. [Obsidian Kindle Plugin](https://github.com/hadynz/obsidian-kindle-plugin)をObsidianにインストール
2. プラグインを使ってKindleハイライトをMarkdown形式でエクスポート
3. エクスポートしたファイルを`data/KindleHighlights/`フォルダに配置
4. ターミナルで`scripts/generate-highlights-index.sh`を実行してインデックス作成
5. YAMLフロントマターにASIN情報が含まれていることを確認

## 📁 プロジェクト構造

```
virtual-bookshelf/
├── index.html              # メインページ
├── css/
│   └── bookshelf.css      # スタイルシート
├── js/
│   ├── bookshelf.js       # メイン機能
│   ├── book-manager.js    # 蔵書CRUD管理
│   ├── highlights.js      # ハイライト表示
│   └── static-bookshelf-generator.js # 静的ページ生成
├── templates/
│   └── bookshelf-template.html # 静的ページテンプレート
├── static/                 # 静的ページファイル（手動配置）
│   └── bookshelf-*.html   # 生成された静的本棚ページ
├── data/
│   ├── my_library.json    # メイン蔵書データ
│   ├── user_data.json     # ユーザー設定・メモ・本棚設定
│   ├── highlights-index.json # ハイライトファイルのASINマッピング
│   ├── KindleHighlights/  # ハイライトMarkdownファイル（元ファイル）
│   └── HighlightsASCII/   # ASCIIファイル名のハイライト（Web表示用）
├── scripts/
│   └── generate-highlights-index.sh # ハイライトインデックス生成スクリプト
├── sample/
│   └── sample_books.json  # サンプル蔵書データ（参考用）
└── .gitignore             # Git除外設定
```

## 🛠️ ローカル開発

```bash
# HTTPサーバーを起動（CORS制約回避のため）
python -m http.server 8000
# または
npx serve .
# または
php -S localhost:8000

# ハイライトインデックス生成（ハイライト機能を使用する場合）
./scripts/generate-highlights-index.sh
```

ブラウザで `http://localhost:8000` を開く

## 💾 データフォーマット

### 蔵書データ (data/my_library.json)
```json
{
  "books": [
    {
      "asin": "B0XXXXXXXXX",
      "title": "書籍タイトル",
      "authors": "著者名",
      "acquiredTime": 1756899555435,
      "readStatus": "READ|UNKNOWN",
      "productImage": "https://m.media-amazon.com/images/I/...",
      "source": "kindle_import|manual_add",
      "addedDate": 1756899555435
    }
  ],
  "metadata": {
    "totalBooks": 100,
    "manuallyAdded": 5,
    "importedFromKindle": 95,
    "lastImportDate": 1756899555435
  }
}
```

### ユーザー設定 (data/user_data.json)
```json
{
  "bookshelves": [
    {
      "id": "tech-books",
      "name": "💻 技術書",
      "description": "プログラミング・技術関連の本",
      "books": ["B0XXXXXXXXX"],
      "isPublic": true,
      "color": "#3498db"
    }
  ],
  "notes": {
    "B0XXXXXXXXX": {
      "memo": "素晴らしい本でした！詳細は[こちら](https://example.com)をご覧ください",
      "rating": 5
    }
  },
  "settings": {
    "defaultView": "hybrid",
    "affiliateId": "your-affiliate-id",
    "showHighlights": true,
    "currentBookshelf": "all",
    "theme": "light",
    "booksPerPage": 50
  },
  "bookOrder": {
    "all": ["B0XXXXXXXXX", "B0YYYYYYYYY"],
    "tech-books": ["B0XXXXXXXXX"]
  }
}
```

## 🎨 使い方

### 基本操作
1. **表示切り替え**: ヘッダーのボタンで表紙・リスト表示を切り替え
2. **本棚選択**: ドロップダウンで表示する本棚を選択
3. **検索**: 検索ボックスでタイトル・著者を検索
4. **フィルター**: サイドバーで読書状況や星評価で絞り込み
5. **詳細表示**: 本をクリックして詳細モーダルを表示
6. **星評価**: モーダル内で1-5星の評価を設定・変更・リセット

### 本棚管理
1. **本棚の作成**: 新しいテーマの本棚を作成
2. **本の追加**: 詳細モーダルで本を複数の本棚に追加
3. **公開設定**: 本棚ごとに公開・非公開を設定
4. **並び替え**: ドラッグハンドル（⋮⋮）で本の順序を変更
5. **静的ページ生成**: 公開本棚のSNS共有用静的HTMLページ作成

### 静的ページ生成・SNS共有
1. **公開設定**: 本棚編集時に「📤 この本棚を公開する」をチェック
2. **静的ページ生成**: 本棚管理で「📤 共有ページ」ボタンをクリック
3. **HTMLファイルダウンロード**: `bookshelf-{ID}.html`ファイルが自動ダウンロード
4. **ファイル配置**: ダウンロードしたファイルを`static/`フォルダに配置
5. **SNS共有**: Twitter/Facebook/LINEで直接共有、またはURLコピー
6. **アクセス方法**:
   - 本棚セレクターで公開本棚選択→「🌐 静的ページ」ボタン
   - 本棚一覧カードの「🌐 静的ページ」ボタン

#### 静的ページファイルの配置方法
```bash
# 1. ダウンロードされたHTMLファイルを確認
ls ~/Downloads/bookshelf-*.html

# 2. staticフォルダを作成（まだない場合）
mkdir -p static

# 3. HTMLファイルを配置
cp ~/Downloads/bookshelf-*.html static/

# 4. Gitにコミット・プッシュ
git add static/
git commit -m "Add static bookshelf pages"
git push origin main
```

**注意**: GitHubページにファイルをプッシュ後、URLが有効になります（例: `https://yourusername.github.io/your-repo/static/bookshelf-12345.html`）

### 星評価システム
1. **評価設定**: 詳細モーダルで本に1-5星の評価を設定
2. **評価リセット**: 「評価をリセット」ボタンで未評価に戻す
3. **フィルタリング**: チェックボックスで特定の星評価の本のみ表示
4. **複数選択**: 星2,3,4や星4,5など複数の評価を組み合わせ表示

### データの永続化
1. 「💾 設定をエクスポート」でuser_data.jsonをダウンロード
2. ダウンロードしたファイルを`data/user_data.json`として保存
3. GitHubリポジトリにpushして設定を永続化

## 📱 対応環境

- **ブラウザ**: Chrome, Firefox, Safari, Edge (最新版)
- **デバイス**: デスクトップ、タブレット、スマートフォン
- **要件**: JavaScript有効、LocalStorage利用可能

## 🔒 プライバシー

- 個人データはブラウザのローカルストレージに保存
- 公開設定しない限り個人メモは非公開
- サーバーサイド処理なし（完全クライアントサイド）

## 🤝 カスタマイズのヒント

### スタイルのカスタマイズ
- `css/bookshelf.css`でカラーテーマや表示サイズを調整
- CSS変数`--book-width`, `--book-height`で本のサイズ調整

### 機能の追加
- 新機能は適切なクラス（VirtualBookshelf/BookManager等）に追加
- スタイリングは`css/bookshelf.css`に追加

### Amazon Associatesの設定
- `data/user_data.json`の`settings.affiliateId`を変更
- アフィリエイトプログラムの利用規約を確認

## 📄 ライセンス

MIT License

---

## 💡 参考リソース

### 必須ツール
- [Kindle Bookshelf Exporter](https://chromewebstore.google.com/detail/kindle-bookshelf-exporter/olimpmeljimffgjonlpmiaebaonnegdp) - Kindleデータエクスポート用Chrome拡張機能
- [Obsidian Kindle Plugin](https://github.com/hadynz/obsidian-kindle-plugin) - Kindleハイライト抽出用Obsidianプラグイン

### 関連リソース
- [元のVirtual Bookshelf](https://github.com/karaage0703/virtual-bookshelf)
- [GitHub Pages Documentation](https://pages.github.com/)
- [Amazon Associates Program](https://affiliate.amazon.com/)

🎉 **Happy Reading!** あなただけの素敵な本棚を作成してください！
