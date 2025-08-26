# AIチャットボット アプリケーション設計書

## 1. アーキテクチャ概要

### 1.1 システム全体構成

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js 14 App]
        B[Material-UI Components]
        C[Zustand State Management]
    end
    
    subgraph "API Gateway"
        D[Nginx]
        E[Rate Limiting]
        F[Auth Middleware]
    end
    
    subgraph "Backend Services"
        G[Chat Service<br/>FastAPI]
        H[FAQ Service<br/>FastAPI]
        I[Auth Service<br/>FastAPI]
        J[ML Service<br/>FastAPI]
    end
    
    subgraph "Data Layer"
        K[PostgreSQL<br/>ユーザー/セッション]
        L[MongoDB<br/>FAQ/ナレッジ]
        M[Redis<br/>キャッシュ/セッション]
        N[ChromaDB<br/>ベクトルDB]
    end
    
    subgraph "External Services"
        O[OpenAI API]
        P[SMTP Server]
        Q[Active Directory]
    end
    
    A --> D
    D --> G
    D --> H
    D --> I
    D --> J
    G --> K
    G --> L
    G --> M
    G --> J
    H --> L
    J --> N
    J --> O
    I --> Q
    G --> P
```

### 1.2 技術スタック詳細

#### Frontend
```json
{
  "framework": "Next.js 14",
  "ui_library": "Material-UI (MUI) v5",
  "state_management": "Zustand",
  "api_client": "Axios + React Query",
  "realtime": "Socket.io-client",
  "build_tool": "Webpack (Next.js内蔵)",
  "testing": "Jest + React Testing Library + Cypress"
}
```

#### Backend
```python
# Core Technologies
{
    "framework": "FastAPI 0.104.1",
    "python_version": "3.11",
    "ml_framework": "LangChain 0.1.0",
    "embedding_model": "sentence-transformers 2.2.2",
    "vector_database": "chromadb 0.4.x",
    "async_runtime": "asyncio + uvicorn",
    "task_queue": "Celery + Redis",
    "api_docs": "OpenAPI 3.0 (自動生成)"
}
```

#### Infrastructure
```yaml
deployment:
  containerization: Docker
  ci_cd: GitLab CI/CD
  monitoring: Prometheus + Grafana
  logging: ELK Stack
  tracing: Jaeger

vector_database:
  name: ChromaDB
  version: "0.4.x"
  deployment: Self-hosted
  persistence: SQLite/DuckDB
  requirements:
    cpu: "2 cores minimum"
    memory: "4GB minimum"
    storage: "SSD 100GB+"
    network: "1Gbps internal"
```

## 2. ディレクトリ構成

### 2.1 モノレポ構成

```
medical-support-chatbot/
├── frontend/                    # Next.jsフロントエンド
│   ├── src/
│   │   ├── app/                # App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── chat/
│   │   │   ├── admin/
│   │   │   └── api/
│   │   ├── components/         # 再利用可能コンポーネント
│   │   │   ├── chat/
│   │   │   ├── common/
│   │   │   └── admin/
│   │   ├── hooks/             # カスタムフック
│   │   ├── stores/            # Zustand stores
│   │   ├── services/          # APIクライアント
│   │   ├── types/             # TypeScript型定義
│   │   └── utils/             # ユーティリティ関数
│   ├── public/
│   ├── tests/
│   └── package.json
│
├── backend/                    # FastAPIバックエンド
│   ├── services/              # マイクロサービス
│   │   ├── chat/
│   │   │   ├── app/
│   │   │   │   ├── api/
│   │   │   │   ├── core/
│   │   │   │   ├── models/
│   │   │   │   ├── schemas/
│   │   │   │   ├── services/
│   │   │   │   └── main.py
│   │   │   ├── tests/
│   │   │   └── Dockerfile
│   │   ├── faq/
│   │   ├── auth/
│   │   └── ml/
│   ├── shared/                # 共有ライブラリ
│   │   ├── database/
│   │   ├── utils/
│   │   └── middleware/
│   └── requirements/
│       ├── base.txt
│       ├── dev.txt
│       └── prod.txt
│
├── infrastructure/            # インフラ設定
│   ├── docker/
│   │   └── docker-compose.yml
│   ├── terraform/
│   └── scripts/
│
├── docs/                      # ドキュメント
│   ├── api/
│   ├── architecture/
│   └── deployment/
│
└── tools/                     # 開発ツール
    ├── scripts/
    └── config/
```

## 3. 主要コンポーネント設計

### 3.1 Frontend Components

#### 3.1.1 Chat Interface Component

```typescript
// components/chat/ChatInterface.tsx
interface ChatInterfaceProps {
  sessionId: string;
  userId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    responseType: 'faq' | 'ai';
    confidence?: number;
    sources?: string[];
  };
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, userId }) => {
  // Zustand store
  const { messages, sendMessage, isLoading } = useChatStore();
  
  // Socket.io connection for real-time updates
  const socket = useSocket();
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ChatHeader />
      <MessageList messages={messages} />
      <SimilarQuestions />
      <InputArea onSend={sendMessage} disabled={isLoading} />
    </Box>
  );
};
```

#### 3.1.2 State Management (Zustand)

```typescript
// stores/chatStore.ts
interface ChatState {
  messages: Message[];
  similarQuestions: SimilarQuestion[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  selectQuestion: (questionId: string) => Promise<void>;
  startAISearch: () => Promise<void>;
  provideFeedback: (messageId: string, feedback: Feedback) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  similarQuestions: [],
  isLoading: false,
  error: null,
  
  sendMessage: async (content: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await chatService.sendMessage(content);
      // Handle response...
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  // Other actions...
}));
```

### 3.2 Backend Services

#### 3.2.1 Chat Service Architecture

```python
# services/chat/app/core/config.py
from pydantic import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Chat Service"
    API_VERSION: str = "v1"
    DATABASE_URL: str
    MONGODB_URL: str
    REDIS_URL: str
    ML_SERVICE_URL: str
    
    class Config:
        env_file = ".env"

settings = Settings()
```

#### 3.2.2 ML Service Architecture

```python
# services/ml/app/services/ml_service.py
from sentence_transformers import SentenceTransformer
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
import chromadb
import asyncio

class MLService:
    def __init__(self, config: MLConfig):
        # SBERT for FAQ search
        self.sbert_model = SentenceTransformer(
            'sonoisa/sentence-bert-base-ja-mean-tokens-v2'
        )
        
        # LangChain setup
        self.embeddings = OpenAIEmbeddings()
        self.llm = ChatOpenAI(
            model="gpt-4",
            temperature=0.3,
            streaming=True
        )
        
        # ChromaDB client setup
        self.chroma_client = chromadb.HttpClient(
            host=config.chroma_host,
            port=config.chroma_port
        )
        
        # Vector store
        self.vector_store = Chroma(
            client=self.chroma_client,
            collection_name=config.collection_name,
            embedding_function=self.embeddings
        )
        
        # RAG chain
        self.qa_chain = self._create_qa_chain()
    
    async def embed_query(self, query: str) -> np.ndarray:
        """クエリをベクトル化"""
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None,
            self.sbert_model.encode,
            query
        )
        return embedding
    
    async def search_similar_faqs(
        self, 
        embedding: np.ndarray,
        threshold: float = 0.7,
        top_k: int = 5
    ) -> List[SimilarFAQ]:
        """類似FAQ検索"""
        results = await self.vector_db.similarity_search_with_score(
            embedding,
            k=top_k
        )
        
        return [
            SimilarFAQ(
                id=doc.metadata['faq_id'],
                question=doc.metadata['question'],
                similarity_score=score,
                category=doc.metadata.get('category')
            )
            for doc, score in results
            if score >= threshold
        ]
```

### 3.3 データベース設計

#### 3.3.1 PostgreSQL Schema

```sql
-- ユーザー管理
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- チャットセッション
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    total_messages INTEGER DEFAULT 0,
    resolved BOOLEAN,
    satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- メッセージ履歴
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    response_type VARCHAR(20) CHECK (response_type IN ('faq', 'ai', 'error')),
    confidence_score DECIMAL(3,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_sessions_user_id ON chat_sessions(user_id);
```

#### 3.3.2 MongoDB Schema

```javascript
// FAQコレクション
{
  _id: ObjectId(),
  question: String,
  answer: String,
  category: String,
  subcategory: String,
  tags: [String],
  metadata: {
    created_by: String,
    created_at: Date,
    updated_at: Date,
    version: Number,
    is_active: Boolean,
    view_count: Number,
    helpful_count: Number,
    not_helpful_count: Number
  },
  embeddings: {
    model: String,
    vector: [Number], // 768次元
    updated_at: Date
  },
  related_faqs: [ObjectId],
  attachments: [{
    type: String,
    url: String,
    description: String
  }]
}

// ナレッジベースコレクション
{
  _id: ObjectId(),
  title: String,
  content: String,
  document_type: String,
  source: String,
  chunks: [{
    chunk_id: String,
    content: String,
    embedding: [Number],
    metadata: {
      page_number: Number,
      section: String
    }
  }],
  access_control: {
    departments: [String],
    roles: [String]
  }
}
```

#### 3.3.3 ChromaDB ベクトルDB設計

##### ChromaDB設定要件
```python
# ChromaDB設定
CHROMA_CONFIG = {
    "host": "chromadb",
    "port": 8000,
    "collection_name": "medical_knowledge",
    "embedding_dimension": 768,  # SBERT model dimension
    "distance_metric": "cosine",
    "persistence_directory": "/chroma/data",
    "anonymized_telemetry": False
}
```

##### コレクション設計
```python
# ChromaDBコレクション定義
collection_config = {
    "name": "medical_knowledge",
    "metadata": {
        "description": "医療サポートFAQとナレッジベース",
        "created_at": "2025-01-20",
        "embedding_model": "sonoisa/sentence-bert-base-ja-mean-tokens-v2"
    },
    "embedding_function": SentenceTransformer,
    "distance": "cosine"
}

# ドキュメントメタデータ構造
document_metadata = {
    "faq_id": str,
    "category": str,
    "subcategory": str,
    "department": str,
    "access_level": str,
    "created_at": datetime,
    "updated_at": datetime,
    "source": str,
    "confidence": float,
    "view_count": int,
    "helpful_count": int
}
```

##### ChromaDB運用要件

**システム要件**
- CPU: 最低2コア、推奨4コア以上
- Memory: 最低4GB、推奨8GB以上（ベクトルデータ量に依存）
- Storage: SSD 100GB以上（高速I/O必須）
- Network: 内部通信1Gbps

**バックアップ戦略**
- 毎日の完全バックアップ（データディレクトリ）
- 増分バックアップ（SQLite/DuckDBファイル）
- S3への自動同期

**パフォーマンス最適化**
- インデックス最適化（HNSW）
- メモリプール設定
- 並列クエリ処理

##### ChromaDB実装例
```python
# services/ml/app/services/chroma_service.py
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
import logging

class ChromaDBService:
    def __init__(self, config: ChromaConfig):
        self.client = chromadb.HttpClient(
            host=config.host,
            port=config.port,
            settings=Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=config.persist_directory,
                anonymized_telemetry=False
            )
        )
        
        # SBERT embedding function
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="sonoisa/sentence-bert-base-ja-mean-tokens-v2"
        )
        
        # Create or get collection
        self.collection = self._get_or_create_collection(
            name=config.collection_name
        )
    
    def _get_or_create_collection(self, name: str):
        """コレクションの取得または作成"""
        try:
            collection = self.client.get_collection(
                name=name,
                embedding_function=self.embedding_function
            )
            logging.info(f"Existing collection '{name}' loaded")
        except Exception:
            collection = self.client.create_collection(
                name=name,
                embedding_function=self.embedding_function,
                metadata={
                    "description": "医療サポートナレッジベース",
                    "created_at": datetime.now().isoformat()
                }
            )
            logging.info(f"New collection '{name}' created")
        
        return collection
    
    async def add_documents(
        self,
        documents: List[str],
        metadatas: List[dict],
        ids: List[str]
    ):
        """ドキュメントの追加"""
        try:
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logging.info(f"Added {len(documents)} documents to collection")
        except Exception as e:
            logging.error(f"Failed to add documents: {e}")
            raise
    
    async def similarity_search(
        self,
        query: str,
        n_results: int = 5,
        where: dict = None
    ) -> List[dict]:
        """類似度検索"""
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where,
                include=["documents", "metadatas", "distances"]
            )
            
            # 結果の整形
            formatted_results = []
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    "id": results['ids'][0][i],
                    "document": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i],
                    "similarity": 1 - results['distances'][0][i]  # cosine distance to similarity
                })
            
            return formatted_results
            
        except Exception as e:
            logging.error(f"Similarity search failed: {e}")
            raise
    
    async def delete_collection(self):
        """コレクションの削除（メンテナンス用）"""
        self.client.delete_collection(self.collection.name)
    
    async def get_collection_stats(self) -> dict:
        """コレクション統計情報"""
        count = self.collection.count()
        return {
            "document_count": count,
            "collection_name": self.collection.name,
            "embedding_dimension": 768
        }
```

##### ChromaDB監視とメンテナンス

**ヘルスチェック**
```python
# ChromaDBヘルスチェック
async def check_chromadb_health() -> bool:
    """ChromaDBの健康状態確認"""
    try:
        client = chromadb.HttpClient(host="chromadb", port=8000)
        # 簡単なクエリでテスト
        client.heartbeat()
        return True
    except Exception as e:
        logging.error(f"ChromaDB health check failed: {e}")
        return False
```

**容量監視**
```python
# ストレージ容量監視
def monitor_chroma_storage():
    """ChromaDBストレージ使用量監視"""
    persist_dir = "/chroma/data"
    usage = shutil.disk_usage(persist_dir)
    
    storage_info = {
        "total_gb": usage.total / (1024**3),
        "used_gb": usage.used / (1024**3),
        "free_gb": usage.free / (1024**3),
        "usage_percent": (usage.used / usage.total) * 100
    }
    
    # アラート閾値：80%
    if storage_info["usage_percent"] > 80:
        send_storage_alert(storage_info)
    
    return storage_info
```

**データマイグレーション**
```python
# ChromaDBデータマイグレーション
async def migrate_embeddings():
    """埋め込みベクトルの再計算・マイグレーション"""
    collection = client.get_collection("medical_knowledge")
    
    # 全ドキュメント取得
    all_docs = collection.get()
    
    # バッチで再埋め込み
    batch_size = 100
    for i in range(0, len(all_docs['ids']), batch_size):
        batch_ids = all_docs['ids'][i:i+batch_size]
        batch_docs = all_docs['documents'][i:i+batch_size]
        
        # 新しい埋め込みモデルで再計算
        new_embeddings = embedding_model.encode(batch_docs)
        
        # 更新
        collection.update(
            ids=batch_ids,
            embeddings=new_embeddings.tolist()
        )
```

##### ChromaDB セキュリティとパフォーマンス設定

**Dockerfile設定**
```dockerfile
# chromadb/Dockerfile
FROM ghcr.io/chroma-core/chroma:latest

# 設定ファイルをコピー
COPY chroma_config.yml /chroma/config.yml

# ヘルスチェック追加
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/heartbeat || exit 1

# セキュリティ: 非rootユーザーで実行
USER 1000:1000

# パフォーマンス設定
ENV CHROMA_SERVER_WORKERS=4
ENV CHROMA_SERVER_TIMEOUT_KEEP_ALIVE=30
ENV CHROMA_SEGMENT_CACHE_POLICY=LRU

EXPOSE 8000
```

**設定ファイル**
```yaml
# chromadb/chroma_config.yml
# ChromaDB パフォーマンス設定
server:
  workers: 4
  host: "0.0.0.0"
  port: 8000
  timeout_keep_alive: 30
  max_concurrent_connections: 100

database:
  impl: "duckdb+parquet"
  persist_directory: "/chroma/data"
  
memory:
  cache_size_mb: 2048
  max_batch_size: 1000
  segment_cache_policy: "LRU"

security:
  anonymized_telemetry: false
  cors_allow_origins: ["http://localhost:3000"]
  
monitoring:
  enable_metrics: true
  log_level: "INFO"
```

**運用チェックリスト**

**日常監視項目**
- [ ] サービス稼働状態（heartbeat）
- [ ] ストレージ使用量（80%閾値）
- [ ] メモリ使用量
- [ ] クエリレスポンス時間
- [ ] 同時接続数

**週次メンテナンス**
- [ ] データベースバックアップ
- [ ] ログローテーション
- [ ] パフォーマンス統計レビュー
- [ ] セキュリティログ確認

**月次メンテナンス**
- [ ] ストレージ最適化
- [ ] インデックス再構築
- [ ] 容量拡張計画レビュー
- [ ] 災害復旧テスト

### 3.4 セキュリティ設計

#### 3.4.1 認証・認可フロー

```python
# services/auth/app/core/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from passlib.context import CryptContext

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    async def get_current_user(self, token: str = Depends(oauth2_scheme)) -> User:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
            
        user = await self.get_user(user_id=user_id)
        if user is None:
            raise credentials_exception
        return user
```

#### 3.4.2 データ暗号化

```python
# shared/utils/encryption.py
from cryptography.fernet import Fernet
import re

class EncryptionService:
    def __init__(self, key: bytes):
        self.fernet = Fernet(key)
        self.pii_patterns = {
            'email': r'[\w\.-]+@[\w\.-]+\.\w+',
            'phone': r'0\d{1,4}-?\d{1,4}-?\d{4}',
            'patient_id': r'[A-Z]{2}\d{8}'
        }
    
    def encrypt_field(self, value: str) -> str:
        """フィールド暗号化"""
        return self.fernet.encrypt(value.encode()).decode()
    
    def decrypt_field(self, encrypted: str) -> str:
        """フィールド復号化"""
        return self.fernet.decrypt(encrypted.encode()).decode()
    
    def mask_pii(self, text: str) -> str:
        """PII自動マスキング"""
        for pii_type, pattern in self.pii_patterns.items():
            text = re.sub(pattern, f'[{pii_type.upper()}_MASKED]', text)
        return text
```

### 3.5 性能最適化設計

#### 3.5.1 キャッシング戦略

```python
# services/chat/app/core/cache.py
from redis import asyncio as aioredis
import json
from typing import Optional, Any

class CacheService:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url)
        
    async def get_faq_cache(self, query_hash: str) -> Optional[List[dict]]:
        """FAQ検索結果のキャッシュ取得"""
        key = f"faq:search:{query_hash}"
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        return None
    
    async def set_faq_cache(
        self, 
        query_hash: str, 
        results: List[dict],
        ttl: int = 3600
    ):
        """FAQ検索結果をキャッシュ"""
        key = f"faq:search:{query_hash}"
        await self.redis.setex(
            key,
            ttl,
            json.dumps(results)
        )
    
    async def invalidate_faq_cache(self, pattern: str = "*"):
        """FAQキャッシュの無効化"""
        keys = await self.redis.keys(f"faq:search:{pattern}")
        if keys:
            await self.redis.delete(*keys)
```

#### 3.5.2 非同期処理設計

```python
# services/chat/app/services/async_service.py
from celery import Celery
import asyncio

celery_app = Celery(
    'medical_support',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/1'
)

@celery_app.task
def process_feedback_async(
    session_id: str,
    message_id: str,
    feedback: dict
):
    """フィードバック処理の非同期実行"""
    # 1. フィードバックを保存
    save_feedback(session_id, message_id, feedback)
    
    # 2. 統計情報を更新
    update_statistics(feedback)
    
    # 3. 低評価の場合はアラート
    if feedback.get('rating', 5) < 3:
        send_alert_to_admin(session_id, message_id, feedback)
    
    # 4. 学習用データとして記録
    if feedback.get('resolved') == False:
        record_for_training(session_id, message_id)
```

## 4. 開発環境設定

### 4.1 Docker Compose設定

```yaml
# docker-compose.yml
version: '3.9'

services:
  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  # Backend Services
  chat-service:
    build:
      context: ./backend/services/chat
      dockerfile: Dockerfile
    ports:
      - "8001:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/chat
      - MONGODB_URL=mongodb://mongo:27017/knowledge
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - mongo
      - redis
    volumes:
      - ./backend/services/chat:/app

  ml-service:
    build:
      context: ./backend/services/ml
      dockerfile: Dockerfile
    ports:
      - "8005:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CHROMA_HOST=chromadb
      - CHROMA_PORT=8000
      - CHROMA_COLLECTION=medical_knowledge
      - MODEL_CACHE_DIR=/models
    depends_on:
      - chromadb
    volumes:
      - ./models:/models
      - ./backend/services/ml:/app

  # ChromaDB Vector Database
  chromadb:
    image: ghcr.io/chroma-core/chroma:latest
    ports:
      - "8000:8000"
    environment:
      - IS_PERSISTENT=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma
      - ANONYMIZED_TELEMETRY=FALSE
    volumes:
      - chroma_data:/chroma/chroma
    command: "--workers 1 --host 0.0.0.0 --port 8000 --proxy-headers --log-config chromadb/log_config.yml --timeout-keep-alive 30"

  # Databases
  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=medical_support
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  mongo:
    image: mongo:6
    environment:
      - MONGO_INITDB_ROOT_USERNAME=root
      - MONGO_INITDB_ROOT_PASSWORD=pass
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Infrastructure
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - chat-service

volumes:
  postgres_data:
  mongo_data:
  redis_data:
  chroma_data:
```

### 4.2 環境変数設定

```bash
# .env.example
# Application
NODE_ENV=development
APP_NAME=medical-support-chatbot

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Backend
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/medical_support
MONGODB_URL=mongodb://localhost:27017/knowledge
REDIS_URL=redis://localhost:6379

# AI/ML
OPENAI_API_KEY=your-openai-api-key

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION=medical_knowledge
CHROMA_PERSIST_DIRECTORY=/chroma/data

# External Services
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-api-key
```