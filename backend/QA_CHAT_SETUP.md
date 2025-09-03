# QA Chat ChromaDB設定ガイド

## 概要
QA Chat機能は、SupabaseのFAQデータベースからデータを取得し、ChromaDBでベクトル検索を行うシステムです。
既存のRAGチャット機能とは独立して動作し、異なるChromaDBコレクションを使用します。

## アーキテクチャ

### コレクション分離
- **RAGチャット用**: `health-center-vectors` （既存）
- **QA Chat用**: `qa_faq_embeddings` （新規）

同一のChromaDBインスタンス内で異なるコレクションを使用することで、完全に独立した検索が可能です。

## セットアップ手順

### 1. 環境変数の設定

`.env`ファイルに以下を追加：

```env
# Supabase設定
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# ChromaDB設定（既存と共通）
CHROMA_PERSIST_DIR=/app/data/chroma
```

### 2. 依存関係のインストール

```bash
cd backend
pip install -r requirements.txt
```

### 3. FAQデータのインデックス化

初回セットアップ時に実行：

```bash
cd backend
python scripts/init_qa_vectors.py
```

オプション：
- `--rebuild`: 既存のインデックスを削除して再構築
- `--test`: インデックス化後にテスト検索を実行

```bash
# 完全再構築とテスト
python scripts/init_qa_vectors.py --rebuild --test
```

### 4. APIサーバーの起動

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API使用方法

### FAQ検索

```bash
curl -X POST "http://localhost:8000/api/qa/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "会計カードの入力方法",
    "n_results": 5,
    "category_filter": "ACCOUNTING"
  }'
```

### インデックス統計

```bash
curl "http://localhost:8000/api/qa/stats"
```

### カテゴリ一覧

```bash
curl "http://localhost:8000/api/qa/categories"
```

### インデックス再構築

```bash
curl -X POST "http://localhost:8000/api/qa/index/rebuild"
```

## テスト実行

```bash
cd backend
python test_qa_chat.py
```

## ファイル構成

```
backend/
├── app/
│   ├── core/
│   │   └── config.py          # QA用設定追加
│   ├── services/
│   │   └── qa_vector_service.py  # QA専用ベクトル検索サービス
│   └── api/
│       └── qa_chat.py         # QA Chat APIエンドポイント
├── scripts/
│   └── init_qa_vectors.py     # インデックス初期化スクリプト
└── test_qa_chat.py            # テストスクリプト
```

## 主要コンポーネント

### QAVectorService
- Supabaseからの FAQ データ取得
- ベクトル化とChromaDBへのインデックス
- 類似FAQ検索
- インデックスの更新・削除・再構築

### 設定項目 (config.py)
- `QA_CHROMA_COLLECTION_NAME`: QA専用コレクション名
- `QA_EMBEDDING_MODEL`: 使用する埋め込みモデル（多言語対応）
- `SUPABASE_URL`: SupabaseプロジェクトURL
- `SUPABASE_KEY`: Supabase APIキー

## 注意事項

1. **既存RAGチャットへの影響なし**
   - 異なるコレクションを使用するため、既存機能に影響しません
   - 同じChromaDBインスタンスを共有しますが、データは完全に分離されています

2. **Supabaseデータ同期**
   - FAQデータはSupabaseから取得されます
   - 定期的な再インデックスが推奨されます

3. **メタデータの活用**
   - カテゴリ、ステータス、優先度でのフィルタリングが可能
   - タグ情報も検索に活用されます

## トラブルシューティング

### インデックスが空の場合
1. Supabase接続を確認
2. FAQテーブルにデータが存在することを確認
3. `answer_content`がNULLでないレコードが存在することを確認

### 検索結果が不正確な場合
1. インデックスを再構築：`python scripts/init_qa_vectors.py --rebuild`
2. 埋め込みモデルの確認
3. クエリテキストの前処理を検討

### パフォーマンスの問題
1. ChromaDBのキャッシュ設定を確認
2. インデックスサイズを確認：`/api/qa/stats`
3. 必要に応じてn_resultsを調整