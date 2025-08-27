# AIチャット設計書（RAG：Balanced 構成 / LangChain + ChromaDB + GPT-5）

> 目的：**精度とコストのバランス**を最優先に、保守しやすく拡張可能なRAG型チャットを設計する。  
> 想定：バックエンド Python（LangChain）、ベクトルDBは **ChromaDB**、LLM は **GPT-5**（Chat系）、クロスエンコーダ再ランクは **bge-reranker-base** クラス。

---

## 1. 要求整理

### 1.1 ゴール
- 社内/顧客向けドキュメントに対する**正確で根拠（出典）付き**の回答
- **誤答時のコスト最小化**（再検索/再ランク/圧縮を段階的に発火）
- **対話継続**（会話文脈の保持）と**監査性**（参照ソースの記録）

### 1.2 非ゴール
- 法的助言・医療診断などの**専門家判断の代替**  
- すべての長大PDFを即時に完全理解（Max構成の担当領域）

### 1.3 主要KPI
- Faithfulness（根拠整合率）≥ 0.9（RAGAS評価）
- Context Precision ≥ 0.7
- 1問あたり平均応答時間：**3–6秒**（キャッシュ命中時は2秒台）
- 月次運用コスト：上限予算内（後述のコスト管理式に準拠）

---

## 2. 全体アーキテクチャ

```
[Client(UI)] 
   ↓ REST/WebSocket
[API Gateway] 
   ↓
[Chat Service] ── uses ─▶ [Retriever(Ensemble)]
   │                       ├─ Chroma(ベクトル; MMR)
   │                       └─ BM25Retriever
   │                 └─[Contextual Compression]
   │                       ├─ CrossEncoder Re-ranker (base)
   │                       └─ EmbeddingsFilter
   │
   ├─▶ [LLM Orchestrator(GPT-5)]
   │        └─ Structured Output / 引用番号ルール
   │
   ├─▶ [Conversation Memory(Store)]
   ├─▶ [Safety/Guardrails]
   └─▶ [Observability/Logs + RAGAS Eval]
```

- **Retrieval**：ベクトル（MMR）＋BM25 の**ハイブリッド**、RRF的融合（EnsembleRetriever）
- **Compression**：軽量**Cross-Encoder再ランク（base）**→**Embeddings類似フィルタ**（閾値）
- **LLM**：GPT-5に**出典番号付き**でプロンプト投入（温度低め・構造化出力）
- **Memory**：ConversationSummaryBuffer（要約）＋重要メッセージPin

---

## 3. データモデル

### 3.1 ドキュメントメタデータ（Chroma `metadata`）
```json
{
  "doc_id": "uuid",
  "source": "URL or file_path",
  "title": "string",
  "section": "h1>h2>h3",
  "page": 12,
  "lang": "ja",
  "version": "v1.3",
  "date": "2025-08-01",
  "visibility": "public|internal|secret",
  "tags": ["product", "faq", "api"]
}
```

### 3.2 会話ログ（監査）
- `query`, `retrieved_doc_ids`, `rerank_scores`, `final_context_token_len`,  
  `llm_input_tokens`, `llm_output_tokens`, `latency_ms`, `answer`, `feedback`

---

## 4. インジェスト設計（取り込み）

1. **正規化**：PDF/HTML/MD/スライド → テキスト抽出（表/コードは別レーンで抽出）  
2. **分割**：`600±200 tokens / overlap 80±40`、見出し境界優先（Markdown/HTMLヘッダ）  
3. **重複除去**：MinHash/LSH で近接重複を抑制  
4. **埋め込み**：`text-embedding-3-small` を既定（足りなければ *-large に昇格）  
5. **投入**：Chromaへ `page_content + metadata` を永続化（collection単位で言語/ドメイン分割可）

> 大規模化時は BM25 を外部全文検索（Elasticsearch/OpenSearch）へ移せるよう**ポートを抽象化**。

---

## 5. 検索・再ランク・圧縮（Balancedの中核）

### 5.1 推奨パラメータ（初期値）
- **ベクトル検索**：`k=30`, `fetch_k=200`, `search_type="mmr"`, `lambda_mult=0.6`  
- **BM25**：`k=20`  
- **Ensemble weights**：ベクトル:BM25 = `0.6 : 0.4`（略称が多い場合は `0.5:0.5` へ）  
- **再ランク**：`bge-reranker-base`（上位20〜50を入力→10〜12に縮約）  
- **EmbeddingsFilter**：`similarity_threshold=0.30`（データ品質に応じて0.25–0.35）

### 5.2 段階的実行（コスト抑制）
1. ベクトル＋BM25 を融合して候補 **N=30–50** を取得  
2. **再ランク（base）** で **M=10–12** に絞る  
3. **EmbeddingsFilter** で短文化（LLM圧縮は使わない）  
4. **必要なら**：再検索（k↑, fetch_k↑） → それでも不足なら Max構成へ**自動昇格**（オプション）

---

## 6. プロンプト設計（出典＆禁止ルール）

### 6.1 システムプロンプト（要点）
- 「**根拠は提供コンテキストのみ**。出典は `[番号]` で明示」  
- 「**不明は不明**と答える。推測を禁止」  
- 「**JSON/Structured Output**（{answer, citations[], confidence}）」

### 6.2 ユーザープロンプト生成
```
あなたは厳密なRAG回答者です。
- 下記コンテキストの根拠のみで答える。
- 各要点の末尾に [n] 形式で出典番号を付与。
- 不明な点は「不明」と明記する。

# 質問
{query}

# コンテキスト（番号付き）
{context_blocks}

# 出力形式(JSON)
{"answer": "...（簡潔な要点箇条書き）", "citations":[1,2], "confidence":"high|medium|low"}
```

---

## 7. API設計

### 7.1 エンドポイント
- `POST /v1/ingest`：ドキュメント投入（同期/非同期）  
- `POST /v1/chat`：RAG回答  
- `GET /v1/healthz`：ヘルスチェック  
- `POST /v1/feedback`：ユーザー評価（good/bad・自由記述）

### 7.2 `POST /v1/chat` リクエスト/レスポンス例
**Request**
```json
{
  "session_id": "uuid",
  "query": "SLAの計画停止の定義は？",
  "mode": "balanced",
  "filters": {"visibility":"internal","version":"v1.*"},
  "top_k": 10
}
```
**Response**
```json
{
  "answer": "要約... [1][3]",
  "citations": [
    {"index":1,"title":"SLAガイド","source":".../sla.md#planned-downtime","page":2},
    {"index":3,"title":"運用基準v1.2","source":".../ops.pdf","page":12}
  ],
  "confidence":"high",
  "timing_ms":{"retrieve":780,"rerank":220,"llm":1450,"total":2600},
  "tokens":{"prompt":1800,"completion":180},
  "trace_id":"..."
}
```

---

## 8. 例外・フォールバック

- **ゼロヒット**：  
  1) `fetch_k` と `k` を +50% で再検索 →  
  2) クエリ拡張（同義語/略称辞書） →  
  3) 「不明」を返し、**関連FAQ**候補を提示
- **長文膨張**：  
  EmbeddingsFilterの閾値↑／候補上限を 8 に制限
- **高難度検出**（クエリに「規約」「条」「shall」等）：
  Max構成へ**自動昇格**（Multi-Query＋Large再ランク）

---

## 9. セキュリティ＆権限

- **メタデータフィルタ**：`visibility`, `department`, `version` でアクセス制御  
- **行レベルフィルタ**：問い合わせ時に **ユーザーのRBAC** をクエリへ注入  
- **個人情報**：PII検知（簡易ルール or Guardrails）→ マスク / 回答拒否  
- **監査**：全問い合わせについて `retrieved_doc_ids` と `citations` を保存

---

## 10. オブザーバビリティ

- **メトリクス**：`p50/p95 latency`, `hit@k`, `faithfulness`, `token_in/out`, `cost`  
- **ログ**：検索パラメータ、採用チャンク、再ランクスコア、プロンプト長  
- **ダッシュボード**：日次の**満足度/不満タグ**、ゼロヒット率、再検索比率

---

## 11. 評価計画（RAGAS＋人手）

1. **ゴールド質問100件**を準備（FAQ/手順/定義/比較/根拠付き）  
2. **A/B**：`weights`, `k/fetch_k`, `threshold` を変更して RAGAS で比較  
3. **人手評価**：正確性/網羅性/可読性/引用妥当性（5段階）  
4. **回帰**：主要100件は毎デプロイで自動評価（閾値割れでアラート）

---

## 12. コスト管理

### 12.1 原価式（概念）
- `LLMコスト ≒ (prompt_tokens × 単価_in + completion_tokens × 単価_out)`  
- `再ランクコスト ≒ N候補 × model_infer_cost`（bge-baseは軽量）  
- **Balanced方針**：LLM前に**候補を8–12へ縮約**し、**出力を箇条書き短文**で抑制

### 12.2 実装レバー
- `docs[:8]` へ**ハード上限制限**  
- 会話履歴は **SummaryBuffer** で圧縮（重要発話のみピン留め）  
- キャッシュ（クエリ正規化＋retrieval結果キャッシュ＋LLM出力キャッシュ）

---

## 13. 主要パラメータ（`config.yaml` 例）

```yaml
llm:
  model: gpt-5
  temperature: 0.2
  max_output_tokens: 512

embeddings:
  model: text-embedding-3-small
  batch_size: 128

retriever:
  vector:
    k: 30
    fetch_k: 200
    mmr_lambda: 0.6
    filter:
      visibility: ["public","internal"]
  bm25:
    k: 20
  ensemble:
    weights: [0.6, 0.4]

compression:
  reranker_model: BAAI/bge-reranker-base
  rerank_in: 40
  take_top_m: 10
  embeddings_filter_threshold: 0.30
  hard_cap_docs: 8

memory:
  type: summary_buffer
  max_token_window: 2000
  pin_keywords: ["前提", "要件", "制約", "期日"]

guards:
  refuse_on_pii: true
  unknown_answer_policy: "return_unknown"

observability:
  tracing: true
  ragas_eval: scheduled_daily
```

---

## 14. 実装スケルトン（Python / LangChain）

> 依存：`langchain`, `langchain-openai`, `langchain-chroma`, `rank-bm25`, `sentence-transformers`

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain_community.document_transformers import CrossEncoderReranker
from langchain.retrievers.document_compressors import EmbeddingsFilter, DocumentCompressorPipeline
from langchain.retrievers.contextual_compression import ContextualCompressionRetriever

# LLM
llm = ChatOpenAI(model="gpt-5", temperature=0.2)

# Embeddings
emb = OpenAIEmbeddings(model="text-embedding-3-small")

# Vector Store
vstore = Chroma(collection_name="docs", embedding_function=emb, persist_directory="./chroma")

# Hybrid (Vector + BM25)
vec_ret = vstore.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 30, "fetch_k": 200, "lambda_mult": 0.6, "filter": {"visibility": "internal"}}
)

all_texts = vstore.get(include=["documents"])["documents"]
bm25 = BM25Retriever.from_texts(all_texts)
bm25.k = 20

hybrid = EnsembleRetriever(retrievers=[vec_ret, bm25], weights=[0.6, 0.4])

# Compression (Re-rank base + EmbeddingsFilter)
reranker = CrossEncoderReranker(model="BAAI/bge-reranker-base")
emb_filter = EmbeddingsFilter(embeddings=emb, similarity_threshold=0.30)
compressor = DocumentCompressorPipeline(transformers=[reranker, emb_filter])

balanced_ret = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=hybrid,
    k=12
)

def build_context(docs, hard_cap=8):
    docs = docs[:hard_cap]
    blocks = []
    for i, d in enumerate(docs, 1):
        src = d.metadata.get("source")
        title = d.metadata.get("title")
        page = d.metadata.get("page")
        blocks.append(f"[{i}] {d.page_content}\n(src:{src}, title:{title}, page:{page})")
    return "\n\n".join(blocks)

def answer_balanced(query: str):
    docs = balanced_ret.invoke(query)
    context = build_context(docs, hard_cap=8)
    prompt = f"""あなたは厳密なRAG回答者です。
- 下記のコンテキストのみから回答し、各要点末尾に [番号] を必ず付与。
- 不明は不明と明記。箇条書きで簡潔に。
# 質問
{query}
# コンテキスト
{context}
# 出力(JSON)
{{"answer":"...","citations":[1,2],"confidence":"high|medium|low"}}"""
    res = llm.invoke(prompt)
    return res.content
```

---

## 15. デプロイと運用

- **ランタイム**：Docker（CPUで十分。再ランクbaseはCPU可）  
- **スケール**：APIは水平スケール、Chromaは**永続ボリューム**＋read replica  
- **CI/CD**：main へのマージでステージング → 回帰評価（RAGAS）→ 本番  
- **バックアップ**：Chroma の `persist_directory` を日次スナップショット

---

## 16. ロードマップ

1. **Phase 1（PoC）**：Balancedの最小実装＋ダッシュボード（1–2週）  
2. **Phase 2（最適化）**：パラメータA/B、辞書ベースのクエリ拡張、RBAC厳格化  
3. **Phase 3（高度化）**：難問のみ **Max自動昇格**、表/コード専用ルート、外部API/SQLツール連携

---

## 17. リスクと対策

- **略称・表記ゆれでの取りこぼし** → BM25比率↑、同義語辞書、クエリ正規化  
- **PDF抽出品質** → 抽出器を複数用意（段組/表に強いもの）、表はCSV化  
- **幻覚** → 「推測禁止」「不明許容」をプロンプト明記、**引用必須**、RAGAS監視  
- **トークン膨張** → EmbeddingsFilter、ハードキャップ、履歴要約

---

## 18. 付録：テスト観点（抜粋）

- **定義/用語**：厳密な語義・改訂有無を正しく回答  
- **手順**：ステップ順・前提条件の明示  
- **比較**：AとBの差分・制約・適用範囲  
- **エラー/FAQ**：既知事象の原因と対処  
- **更新反映**：version/date フィルタが効くこと

---

必要に応じて、この設計書をそのまま**リポジトリ初期README**に落とし込み、`config.yaml` と上記スケルトンを**最小動作品**として提供します。追加で RBAC、辞書拡張、評価ノートブック（RAGAS）も用意可能です。
