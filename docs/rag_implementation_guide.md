# Health Center RAG実装ガイド

> 目的：**Health Center Document Conversion System**における高精度で効率的なRAG（Retrieval-Augmented Generation）機能の実装

---

## 1. 概要

Health Centerでは、変換済み医療文書に対する正確な質問応答機能を提供するため、ChromaDB + LangChain + OpenAI GPTを活用したRAGシステムを実装しています。

### 1.1 現在の技術スタック
- **ベクトルDB**: ChromaDB 0.4.18（永続化対応）
- **LLMフレームワーク**: LangChain 0.2.0
- **LLM**: OpenAI GPT-5-mini
- **埋め込みモデル**: all-MiniLM-L6-v2（多言語対応）
- **文書変換**: MarkItDown + カスタム変換パイプライン

### 1.2 主要機能
- 変換済みMarkdown文書の自動ベクトル化
- 医療文書に特化した質問応答
- 出典・根拠付きの回答生成
- リアルタイム検索とキャッシュ機能

---

## 2. アーキテクチャ設計

```
[Frontend(Next.js)] 
   ↓ REST API
[FastAPI Backend] 
   ↓
[RAG Service] ── uses ─▶ [VectorizationService]
   │                       └─ ChromaDB(永続化)
   │                           ├─ 埋め込み: all-MiniLM-L6-v2
   │                           └─ チャンク管理: RecursiveCharacterTextSplitter
   │
   ├─▶ [OpenAI GPT Client]
   │        └─ 構造化プロンプト + 出典番号システム
   │
   └─▶ [Document Processing Pipeline]
            ├─ MarkItDown変換
            ├─ テキスト分割（1000文字/200重複）
            └─ メタデータ管理
```

---

## 3. データモデル

### 3.1 ドキュメントメタデータ（ChromaDB）
```json
{
  "filename": "medical_guideline_v2.md",
  "chunk_index": 0,
  "total_chunks": 15,
  "doc_id": "a1b2c3d4e5f6...",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

### 3.2 検索結果レスポンス
```json
{
  "query": "X線検査の手順について教えて",
  "response": "X線検査の手順は以下の通りです：\n1. 患者確認 [1]\n2. 撮影準備 [2]...",
  "sources": [
    {
      "filename": "xray_procedure.md",
      "chunk_index": 2,
      "similarity": 0.95,
      "excerpt": "X線検査の標準手順として..."
    }
  ],
  "context_used": 3,
  "timestamp": "2025-01-20T10:35:00Z"
}
```

---

## 4. 実装詳細

### 4.1 ベクトル化サービス（VectorizationService）

#### 設定パラメータ
```python
# テキスト分割設定
chunk_size = 1000        # 1000文字/チャンク
chunk_overlap = 200      # 200文字重複
separators = ["\n\n", "\n", "。", ".", " ", ""]  # 日本語対応

# ChromaDB設定
collection_name = "converted_documents"
embedding_model = "all-MiniLM-L6-v2"  # 軽量で多言語対応
distance_metric = "cosine"             # コサイン類似度
```

#### チャンク生成戦略
```python
def chunk_text(self, text: str, filename: str) -> List[Dict[str, Any]]:
    """
    医療文書に適したテキスト分割
    
    - 見出し境界を優先（## や ### で分割）
    - 文単位での分割（。で区切り）
    - メタデータ付きチャンク生成
    """
    chunks = self.text_splitter.split_text(text)
    doc_id = self.generate_doc_id(filename)
    
    chunk_data = []
    for i, chunk in enumerate(chunks):
        chunk_data.append({
            "id": f"{doc_id}_{i}",
            "text": chunk,
            "metadata": {
                "filename": filename,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "doc_id": doc_id,
                "timestamp": datetime.now().isoformat()
            }
        })
    
    return chunk_data
```

### 4.2 RAGサービス（RAGService）

#### 検索・回答生成フロー
```python
def query(self, query: str, n_results: int = 5, use_llm: bool = True) -> Dict[str, Any]:
    """
    RAGクエリ実行フロー
    
    1. ベクトル検索（ChromaDB）
    2. コンテキスト構築（上位結果を統合）
    3. LLM回答生成（GPT-5-mini）
    4. 出典情報付きレスポンス
    """
    # 1. ベクトル検索
    search_results = self.vector_service.search(query, n_results)
    
    # 2. コンテキスト構築
    context = self.build_context(search_results["results"])
    
    # 3. LLM回答生成
    if use_llm and self.client:
        response_text = self.generate_response(query, context)
    else:
        response_text = self._generate_simple_response(query, search_results["results"])
    
    # 4. 出典情報付きレスポンス
    return self._format_response(query, response_text, search_results)
```

### 4.3 プロンプト設計

#### システムプロンプト
```python
system_message = """あなたは医療文書に関する質問に答える専門アシスタントです。

重要なルール:
- 提供されたコンテキストの情報のみを根拠として回答する
- 推測や憶測は絶対に行わない
- 不明な点は「不明」と明記する
- 医療的判断や診断は行わない
- 各要点の末尾に出典番号 [番号] を必ず付与する

回答形式:
- 簡潔で分かりやすい箇条書き
- 重要なポイントを優先して記載
- 専門用語には適切な説明を併記
"""
```

#### ユーザープロンプト生成
```python
def generate_user_prompt(self, query: str, context: str) -> str:
    return f"""以下のコンテキストに基づいて質問に答えてください。

# 質問
{query}

# コンテキスト（番号付き文書抜粋）
{context}

# 回答要件
- コンテキストの情報のみを使用
- 各要点に出典番号 [番号] を付与
- 不明な点は「文書に記載がありません」と明記
- 医療的判断は避け、手順や情報のみ提供

回答:"""
```

---

## 5. API設計

### 5.1 RAGクエリエンドポイント

#### `POST /api/v1/rag/query`
```python
async def query_rag(
    query: str = Body(..., description="検索クエリ"),
    n_results: Optional[int] = Body(5, ge=1, le=20, description="検索結果数"),
    use_llm: Optional[bool] = Body(True, description="LLM回答生成の使用"),
    return_sources: Optional[bool] = Body(True, description="出典情報の返却")
) -> Dict[str, Any]:
    """
    医療文書に対するRAGクエリ実行
    
    - ベクトル検索による関連文書発見
    - GPTによる回答生成
    - 出典情報付きレスポンス
    """
```

#### `POST /api/v1/rag/search`
```python
async def search_only(
    query: str = Body(..., description="検索クエリ"),
    n_results: Optional[int] = Body(5, ge=1, le=20, description="結果数")
) -> Dict[str, Any]:
    """
    ベクトル検索のみ（LLM生成なし）
    
    - 高速な関連文書検索
    - 類似度スコア付き結果
    - キャッシュ対応
    """
```

### 5.2 文書管理エンドポイント

#### `POST /api/v1/vectorization/file`
```python
async def vectorize_file(filename: str) -> Dict[str, Any]:
    """
    特定ファイルのベクトル化
    
    - 変換済みMarkdownファイルを対象
    - 既存データの自動更新
    - チャンク統計の返却
    """
```

#### `POST /api/v1/vectorization/batch`
```python
async def vectorize_all() -> Dict[str, Any]:
    """
    全ファイルの一括ベクトル化
    
    - converted/ディレクトリ内の全.mdファイル
    - 進捗レポート
    - エラー詳細
    """
```

---

## 6. パフォーマンス最適化

### 6.1 検索最適化
```python
# ChromaDB検索パラメータ
search_params = {
    "n_results": 5,              # 基本検索数
    "include": ["documents", "metadatas", "distances"],
    "where": {                   # メタデータフィルタ
        "filename": {"$ne": ""}  # 空でないファイル名
    }
}

# コンテキスト長制限
max_context_length = 3000       # 約3000文字制限
max_chunks_per_response = 8     # チャンク数上限
```

### 6.2 キャッシュ戦略
```python
# 将来実装予定
class RAGCache:
    """
    RAGクエリ結果のキャッシュ
    
    - クエリ正規化（表記ゆれ対応）
    - 検索結果キャッシュ（TTL: 1時間）
    - LLM回答キャッシュ（TTL: 24時間）
    """
    
    def normalize_query(self, query: str) -> str:
        """クエリ正規化（ひらがな/カタカナ、記号統一）"""
        pass
    
    def cache_search_results(self, query: str, results: List[Dict]) -> None:
        """検索結果キャッシュ"""
        pass
```

---

## 7. セキュリティ・権限管理

### 7.1 アクセス制御
```python
# メタデータベースの権限制御
def apply_security_filter(user_role: str) -> Dict[str, Any]:
    """
    ユーザー権限に基づくフィルタ
    
    - admin: 全文書アクセス
    - doctor: 医療関連文書のみ
    - nurse: 手順書・ガイドラインのみ
    - patient: 公開文書のみ
    """
    filters = {
        "admin": {},
        "doctor": {"category": {"$in": ["medical", "procedure", "guideline"]}},
        "nurse": {"category": {"$in": ["procedure", "guideline", "manual"]}},
        "patient": {"visibility": "public"}
    }
    return filters.get(user_role, {"visibility": "public"})
```

### 7.2 監査ログ
```python
class RAGAuditLogger:
    """
    RAGクエリの監査ログ
    
    記録項目:
    - クエリ内容
    - 検索結果（文書ID）
    - 生成回答
    - ユーザー情報
    - タイムスタンプ
    """
    
    def log_query(self, user_id: str, query: str, response: Dict[str, Any]):
        audit_record = {
            "user_id": user_id,
            "query": query,
            "retrieved_docs": [s["filename"] for s in response["sources"]],
            "response_length": len(response["response"]),
            "timestamp": datetime.now().isoformat(),
            "session_id": self.get_session_id()
        }
        # データベースまたはログファイルに保存
```

---

## 8. エラーハンドリング・フォールバック

### 8.1 検索結果なし
```python
def handle_no_results(self, query: str) -> Dict[str, Any]:
    """
    検索結果ゼロ時の対応
    
    1. クエリ拡張（同義語、略語展開）
    2. 検索パラメータ緩和（similarity閾値下げ）
    3. 関連キーワード提案
    4. FAQ候補提示
    """
    return {
        "response": "お探しの情報が見つかりませんでした。",
        "suggestions": [
            "別の表現で検索してみてください",
            "より具体的なキーワードをお試しください",
            "以下の関連トピックも参考になるかもしれません"
        ],
        "related_topics": self.get_related_topics(query)
    }
```

### 8.2 LLMエラー時のフォールバック
```python
def generate_fallback_response(self, query: str, search_results: List[Dict]) -> str:
    """
    LLMエラー時のシンプル回答生成
    
    - 検索結果の要約表示
    - 出典情報の明示
    - エラー状況の透明な伝達
    """
    if not search_results:
        return "関連する文書が見つかりませんでした。"
    
    response_parts = [f"「{query}」に関連する情報を{len(search_results)}件見つけました：\n"]
    
    for i, result in enumerate(search_results[:3], 1):
        filename = result["metadata"].get("filename", "不明")
        text = result["text"][:200] + "..." if len(result["text"]) > 200 else result["text"]
        response_parts.append(f"{i}. {filename}より：\n{text}\n")
    
    return "\n".join(response_parts)
```

---

## 9. 評価・改善

### 9.1 品質メトリクス
```python
class RAGEvaluator:
    """
    RAG品質評価ツール
    
    評価指標:
    - Faithfulness: 回答の根拠整合性
    - Answer Relevancy: 質問との関連性
    - Context Precision: 検索精度
    - Context Recall: 検索網羅性
    """
    
    def evaluate_response(self, query: str, response: str, sources: List[Dict]) -> Dict[str, float]:
        return {
            "faithfulness": self.calculate_faithfulness(response, sources),
            "relevancy": self.calculate_relevancy(query, response),
            "precision": self.calculate_precision(query, sources),
            "recall": self.calculate_recall(query, sources)
        }
```

### 9.2 継続的改善
```python
# A/Bテスト用パラメータ
class RAGExperimentConfig:
    """
    RAGシステムの実験設定
    
    調整可能パラメータ:
    - chunk_size: 500, 1000, 1500
    - chunk_overlap: 100, 200, 300
    - n_results: 3, 5, 10
    - similarity_threshold: 0.3, 0.5, 0.7
    - temperature: 0.1, 0.3, 0.5
    """
    
    def get_config(self, experiment_group: str) -> Dict[str, Any]:
        configs = {
            "control": {
                "chunk_size": 1000,
                "chunk_overlap": 200,
                "n_results": 5,
                "temperature": 0.2
            },
            "test_a": {
                "chunk_size": 1500,
                "chunk_overlap": 300,
                "n_results": 8,
                "temperature": 0.1
            }
        }
        return configs.get(experiment_group, configs["control"])
```

---

## 10. 設定ファイル例

### 10.1 RAG設定（config/rag_config.yaml）
```yaml
# Vector Database設定
vector_db:
  type: "chromadb"
  persist_directory: "Vectorized/chroma_db"
  collection_name: "converted_documents"
  
  embedding:
    model: "all-MiniLM-L6-v2"
    batch_size: 32
    
  chunking:
    chunk_size: 1000
    chunk_overlap: 200
    separators: ["\n\n", "\n", "。", ".", " ", ""]

# LLM設定
llm:
  provider: "openai"
  model: "gpt-5-mini"
  temperature: 0.2
  max_tokens: 500
  
  prompt:
    system_template: "templates/system_prompt.txt"
    user_template: "templates/user_prompt.txt"

# 検索設定
search:
  default_n_results: 5
  max_n_results: 20
  max_context_length: 3000
  max_chunks_per_response: 8
  similarity_threshold: 0.3

# セキュリティ設定
security:
  enable_audit_log: true
  max_query_length: 1000
  rate_limit_per_minute: 60
  
  role_filters:
    admin: {}
    doctor: {"category": ["medical", "procedure", "guideline"]}
    nurse: {"category": ["procedure", "guideline", "manual"]}
    patient: {"visibility": "public"}

# パフォーマンス設定
performance:
  cache_enabled: true
  cache_ttl_seconds: 3600
  async_vectorization: true
  batch_size: 10
```

---

## 11. デプロイメント

### 11.1 Docker構成
```dockerfile
# Dockerfile.rag
FROM python:3.11-slim

WORKDIR /app

# 依存関係インストール
COPY requirements.txt .
RUN pip install -r requirements.txt

# ChromaDB永続化ディレクトリ
VOLUME ["/app/Vectorized"]

# アプリケーション起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 11.2 docker-compose.yml追記
```yaml
services:
  backend:
    build: ./backend
    volumes:
      - ./backend/Vectorized:/app/Vectorized  # ChromaDB永続化
      - ./backend/converted:/app/converted    # 変換済みファイル
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CHROMA_PERSIST_DIR=/app/Vectorized
```

---

## 12. 運用・監視

### 12.1 ヘルスチェック
```python
@router.get("/health")
async def health_check():
    """
    RAGシステムの健康状態確認
    
    チェック項目:
    - ChromaDBコレクション接続
    - OpenAI API接続
    - 文書インデックス状態
    """
    try:
        # ChromaDB接続確認
        collection_stats = rag_service.vector_service.get_collection_stats()
        
        # OpenAI API確認
        llm_status = "available" if rag_service.client else "unavailable"
        
        return {
            "status": "healthy",
            "vector_db": {
                "status": "connected",
                "documents": collection_stats["unique_documents"],
                "chunks": collection_stats["total_chunks"]
            },
            "llm": {
                "status": llm_status,
                "model": rag_service.model if rag_service.client else None
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
```

### 12.2 監視メトリクス
```python
class RAGMetrics:
    """
    RAGシステムのメトリクス収集
    
    収集項目:
    - クエリ数/分
    - 平均応答時間
    - 検索ヒット率
    - LLMトークン使用量
    - エラー率
    """
    
    def __init__(self):
        self.query_count = 0
        self.total_response_time = 0
        self.hit_count = 0
        self.error_count = 0
    
    def record_query(self, response_time: float, hit: bool, error: bool = False):
        self.query_count += 1
        self.total_response_time += response_time
        if hit:
            self.hit_count += 1
        if error:
            self.error_count += 1
    
    def get_stats(self) -> Dict[str, float]:
        if self.query_count == 0:
            return {"queries": 0}
        
        return {
            "total_queries": self.query_count,
            "avg_response_time": self.total_response_time / self.query_count,
            "hit_rate": self.hit_count / self.query_count,
            "error_rate": self.error_count / self.query_count
        }
```

---

## 13. 今後の拡張計画

### 13.1 Phase 2: 高度な検索機能
- **ハイブリッド検索**: ベクトル検索 + BM25（キーワード検索）
- **クエリ拡張**: 同義語辞書、略語展開
- **多段階検索**: 粗い検索→精密な再ランキング

### 13.2 Phase 3: 高度なAI機能
- **会話履歴管理**: ConversationSummaryBuffer
- **マルチモーダル対応**: 画像、表、グラフの理解
- **専門知識グラフ**: 医療概念の関係性モデル

### 13.3 Phase 4: エンタープライズ機能
- **多言語対応**: 英語、中国語での質問応答
- **リアルタイム学習**: ユーザーフィードバックからの改善
- **外部API連携**: 医療データベース、薬品情報API

---

## まとめ

Health Center RAGシステムは、医療文書の効率的な検索・活用を実現する高精度な質問応答システムです。ChromaDB + LangChain + OpenAI GPTの組み合わせにより、以下の価値を提供します：

1. **正確性**: 出典明示による信頼性の高い回答
2. **効率性**: 高速なベクトル検索と適切なキャッシュ
3. **安全性**: 権限管理と監査ログによるセキュリティ
4. **拡張性**: モジュラー設計による機能追加の容易さ

このガイドに基づき、段階的にRAGシステムを構築・改善していくことで、医療現場での情報アクセス効率を大幅に向上させることができます。
