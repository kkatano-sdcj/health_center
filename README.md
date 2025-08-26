# Health Center Document Conversion System

医療文書変換システム - 様々な形式の文書をMarkdown形式に変換し、検索・管理を可能にするWebアプリケーション

## 概要

Health Center Document Conversion Systemは、医療機関で使用される様々な形式の文書（PDF、Word、Excel、PowerPoint、画像など）を統一的にMarkdown形式に変換し、管理・検索を可能にするシステムです。

### 主な特徴

- 🔄 **多様なファイル形式のサポート**: PDF、Word、Excel、PowerPoint、画像ファイルなど
- 🤖 **AI強化変換モード**: OpenAI APIを活用した高精度な変換
- 📊 **リアルタイム進捗表示**: WebSocketによる変換進捗のリアルタイム追跡
- 🔍 **文書検索機能**: 変換済み文書の全文検索
- 💬 **AIチャット機能**: 文書に関する質問応答
- 🐳 **Docker対応**: 簡単なデプロイとスケーラビリティ

## 技術スタック

### バックエンド
- **FastAPI**: 高速なPython Webフレームワーク
- **MarkItDown**: Microsoft製の文書変換ライブラリ
- **LangChain**: LLM統合フレームワーク
- **ChromaDB**: ベクトルデータベース
- **PostgreSQL/MongoDB**: データ永続化

### フロントエンド
- **Next.js 14**: Reactベースのフレームワーク
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストのCSS
- **WebSocket**: リアルタイム通信

## システム要件

- Node.js 18以上
- Python 3.10以上
- Docker & Docker Compose（オプション）
- OpenAI APIキー（AI機能を使用する場合）

## インストール

### 1. リポジトリのクローン

```bash
git clone https://github.com/kkatano-sdcj/health_center.git
cd health_center
```

### 2. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成：

```bash
# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key

# データベース設定
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/health_center
MONGODB_URL=mongodb://localhost:27017/health_center
REDIS_URL=redis://localhost:6379/0

# ChromaDB設定
CHROMA_PERSIST_DIR=/app/data/chroma
CHROMA_COLLECTION_NAME=health-center-vectors
```

### 3. Dockerを使用した起動（推奨）

```bash
docker-compose up -d
```

アプリケーションは以下のURLでアクセスできます：
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

### 4. ローカル環境での起動

#### バックエンドの起動

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### フロントエンドの起動

```bash
cd frontend
npm install
npm run dev
```

## 使用方法

### 1. ファイル変換

1. Webインターフェース（http://localhost:3000）にアクセス
2. 「変換」ページへ移動
3. ファイルをドラッグ&ドロップまたは選択
4. 必要に応じて「AI強化モード」を有効化
5. 「変換開始」ボタンをクリック
6. 変換完了後、結果をプレビューまたはダウンロード

### 2. 文書検索

1. 「検索」ページへ移動
2. 検索キーワードを入力
3. 関連する文書が表示される

### 3. AIチャット

1. 「AIチャット」ページへ移動
2. 文書に関する質問を入力
3. AIが文書を参照して回答

## API エンドポイント

### ファイル変換
- `POST /api/v1/conversion/upload` - 単一ファイルの変換
- `POST /api/v1/conversion/batch` - 複数ファイルの一括変換
- `GET /api/v1/conversion/download/{filename}` - 変換済みファイルのダウンロード

### 文書管理
- `GET /api/v1/documents` - 文書一覧の取得
- `POST /api/v1/documents/search` - 文書の検索
- `DELETE /api/v1/documents/{id}` - 文書の削除

### チャット
- `POST /api/v1/chat/message` - チャットメッセージの送信
- `WS /ws` - WebSocket接続（リアルタイム通信）

詳細なAPIドキュメントは http://localhost:8000/docs で確認できます。

## プロジェクト構造

```
health_center/
├── backend/                 # バックエンドアプリケーション
│   ├── app/
│   │   ├── api/            # APIエンドポイント
│   │   ├── core/           # コア設定
│   │   ├── models/         # データモデル
│   │   ├── schemas/        # Pydanticスキーマ
│   │   └── services/       # ビジネスロジック
│   └── requirements.txt
├── frontend/               # フロントエンドアプリケーション
│   ├── src/
│   │   ├── app/           # Next.js Appルーター
│   │   ├── components/    # Reactコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   ├── services/      # APIクライアント
│   │   └── types/         # TypeScript型定義
│   └── package.json
├── docker-compose.yml      # Docker構成
└── docs/                   # ドキュメント
```

## 開発

### コードスタイル

- Python: Black, isort, flake8
- TypeScript/JavaScript: ESLint, Prettier

### テスト

```bash
# バックエンドテスト
cd backend
pytest

# フロントエンドテスト
cd frontend
npm test
```

## トラブルシューティング

### ファイル変換が失敗する
- ファイル形式がサポートされているか確認
- ファイルサイズが100MB以下であることを確認
- OpenAI APIキーが正しく設定されているか確認（AI機能使用時）

### WebSocket接続エラー
- バックエンドが起動していることを確認
- ファイアウォール設定を確認
- ブラウザのコンソールでエラーメッセージを確認

### データベース接続エラー
- PostgreSQL/MongoDBが起動していることを確認
- 環境変数の設定を確認
- ポート番号が競合していないか確認

## ライセンス

このプロジェクトはプライベートリポジトリです。

## お問い合わせ

問題や質問がある場合は、[Issues](https://github.com/kkatano-sdcj/health_center/issues)でお知らせください。

## 更新履歴

- 2025-08-26: 初回リリース
  - 基本的なファイル変換機能
  - AI強化変換モード
  - リアルタイム進捗表示
  - 文書検索機能