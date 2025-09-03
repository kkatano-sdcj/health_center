# 会話履歴の保存方法について

現在のhealth_centerプロジェクトでは、会話履歴が **ハイブリッド方式** で保存されています。以下に詳細を説明します。

## 保存方式の概要

### 1. **メインストレージ：PostgreSQLデータベース**
- **テーブル**: `conversations`
- **主要フィールド**:
  - `id`: プライマリキー（UUID）
  - `thread_id`: 会話スレッドID（UUID、インデックス付き）
  - `title`: 会話のタイトル
  - `messages`: メッセージ配列（JSON型）
  - `is_active`: 論理削除フラグ
  - `created_at`, `updated_at`: タイムスタンプ
  - `message_count`: メッセージ数

### 2. **キャッシュレイヤー：Redis**
- **目的**: 高速アクセスとセッション管理
- **キー形式**: `conversation:{thread_id}`
- **TTL**: 3600秒（1時間）
- **データ**: 完全な会話データをJSON形式で保存

### 3. **ファイルベース（レガシー）：JSONファイル**
- **場所**: `/backend/conversations/` ディレクトリ
- **形式**: `{thread_id}.json`
- **用途**: LangChainベースの会話メモリサービス用

## データフロー

### 全体アーキテクチャ図
```mermaid
graph TB
    subgraph "クライアント層"
        C1[Webブラウザ]
        C2[モバイルアプリ]
        C3[API クライアント]
    end
    
    subgraph "API層"
        API[FastAPI<br/>conversation.py]
    end
    
    subgraph "サービス層"
        CS[ConversationService<br/>メイン会話管理]
        CMS[ConversationMemoryService<br/>LangChain統合]
    end
    
    subgraph "ストレージ層"
        subgraph "キャッシュ"
            R[(Redis<br/>TTL: 1h)]
        end
        subgraph "永続化"
            PG[(PostgreSQL<br/>conversations)]
        end
        subgraph "ファイル"
            F[JSONファイル<br/>conversations/]
        end
    end
    
    C1 --> API
    C2 --> API
    C3 --> API
    API --> CS
    API --> CMS
    CS <--> R
    CS <--> PG
    CMS <--> F
    
    style CS fill:#e1f5fe
    style CMS fill:#f3e5f5
    style R fill:#ffecb3
    style PG fill:#e8f5e8
    style F fill:#fce4ec
```

### 読み取りフロー（GET操作）
```mermaid
sequenceDiagram
    participant Client as クライアント
    participant API as FastAPI Router
    participant CS as ConversationService
    participant Redis as Redis Cache
    participant DB as PostgreSQL
    
    Client->>API: GET /threads/{thread_id}
    API->>CS: get_thread(thread_id)
    CS->>Redis: キー確認: conversation:{thread_id}
    
    alt キャッシュヒット
        Redis-->>CS: 会話データ返却
        CS-->>API: キャッシュデータ
    else キャッシュミス
        CS->>DB: SELECT * FROM conversations WHERE thread_id=?
        DB-->>CS: 会話データ
        CS->>Redis: setex(key, 3600, data)
        CS-->>API: DBデータ
    end
    
    API-->>Client: 会話履歴JSON
```

### 書き込みフロー（POST操作）
```mermaid
sequenceDiagram
    participant Client as クライアント
    participant API as FastAPI Router
    participant CS as ConversationService
    participant Redis as Redis Cache
    participant DB as PostgreSQL
    
    Client->>API: POST /threads/{thread_id}/messages
    API->>CS: add_message(thread_id, message)
    
    CS->>DB: BEGIN TRANSACTION
    CS->>DB: UPDATE conversations SET messages=?, updated_at=?
    
    alt トランザクション成功
        CS->>DB: COMMIT
        CS->>Redis: setex(conversation:{thread_id}, 3600, updated_data)
        CS-->>API: 更新された会話データ
        API-->>Client: 成功レスポンス
    else トランザクション失敗
        CS->>DB: ROLLBACK
        CS-->>API: エラー
        API-->>Client: エラーレスポンス
    end
```

### LangChain統合フロー
```mermaid
graph TD
    A[会話開始] --> B[ConversationMemoryService.create_thread]
    B --> C[ConversationBufferMemory作成]
    C --> D[ConversationChain作成]
    D --> E[JSONファイル保存]
    
    F[メッセージ追加] --> G[add_message]
    G --> H{ロール判定}
    H -->|human| I[memory.add_user_message]
    H -->|ai| J[memory.add_ai_message]
    I --> K[messagesリスト更新]
    J --> K
    K --> L[JSONファイル更新]
    
    M[コンテキスト取得] --> N[get_context]
    N --> O[最新N件メッセージ取得]
    O --> P[フォーマット済み文字列生成]
    
    style C fill:#e3f2fd
    style D fill:#e8f5e8
    style I fill:#fff3e0
    style J fill:#fce4ec
```

### エラーハンドリングフロー
```mermaid
graph TD
    A[リクエスト受信] --> B{バリデーション}
    B -->|失敗| C[400 Bad Request]
    B -->|成功| D[サービス実行]
    
    D --> E{Redis接続}
    E -->|失敗| F[ログ出力]
    F --> G[DB直接アクセス]
    E -->|成功| H[キャッシュ操作]
    
    G --> I{DB操作}
    H --> I
    I -->|失敗| J[ログ出力]
    J --> K[ロールバック]
    K --> L[500 Internal Error]
    I -->|成功| M[レスポンス返却]
    
    style C fill:#ffcdd2
    style L fill:#ffcdd2
    style M fill:#c8e6c9
```

## 具体的な保存内容

### メッセージ構造
```json
{
  "id": "test-save-note",
  "thread_id": "uuid-string",
  "title": "健康管理システムについて教えてください",
  "created_at": "2025-08-29T18:03:33.370468",
  "updated_at": "2025-08-29T18:03:47.611722",
  "message_count": 4,
  "messages": [
    {
      "role": "human",
      "content": "健康管理システムについて教えてください",
      "timestamp": "2025-08-29T18:03:33.370900"
    },
    {
      "role": "ai",
      "content": "回答内容...",
      "timestamp": "2025-08-29T18:03:33.371153",
      "metadata": {
        "sources": [...],
        "search_type": "database",
        "search_results": 10,
        "used_reranking": true
      }
    }
  ]
}
```

## 実装詳細

### データベースモデル（SQLAlchemy）
```python
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="新しい会話")
    messages = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    message_count = Column(Integer, default=0)
```

### ConversationService主要機能
- **create_thread()**: 新規スレッド作成
- **get_thread()**: スレッド取得（Redis → PostgreSQL のフォールバック）
- **add_message()**: メッセージ追加とキャッシュ更新
- **list_threads()**: アクティブスレッド一覧取得
- **delete_thread()**: 論理削除実行

### Redis管理機能
- **_save_to_redis()**: データをRedisに保存（TTL付き）
- **_get_from_redis()**: Redisからデータ取得とTTL更新
- **_delete_from_redis()**: Redisからデータ削除

## API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/threads` | 新規スレッド作成 |
| GET | `/threads` | スレッド一覧取得 |
| GET | `/threads/{thread_id}` | 特定スレッド取得 |
| POST | `/threads/{thread_id}/messages` | メッセージ追加 |
| PUT | `/threads/{thread_id}/title` | タイトル更新 |
| DELETE | `/threads/{thread_id}` | スレッド削除（論理削除） |
| DELETE | `/threads` | 全スレッドクリア |

## 会話メモリサービス（LangChain統合）

### ConversationMemoryService機能
- **LangChain統合**: ConversationBufferMemory使用
- **ファイル永続化**: JSONファイルでの保存
- **メモリ管理**: アクティブ会話のメモリ内管理
- **コンテキスト生成**: 会話履歴からのコンテキスト文字列生成

### 主要メソッド
- **create_thread()**: LangChainメモリ付きスレッド作成
- **add_message()**: メッセージ追加とメモリ更新
- **get_context()**: フォーマット済みコンテキスト取得
- **generate_title()**: 最初のメッセージからタイトル生成

## 利点と特徴

### パフォーマンス最適化
1. **Redisキャッシュ**: 高速アクセス（TTL: 1時間）
2. **PostgreSQL**: 永続化と複雑クエリ対応
3. **インデックス**: thread_idでの高速検索

### スケーラビリティ
1. **水平拡張**: データベースベース設計
2. **キャッシュ分散**: Redis Clusterで拡張可能
3. **論理削除**: データ整合性維持

### データ整合性
1. **トランザクション管理**: SQLAlchemyによる一貫性保証
2. **フォールバック機能**: Redis障害時のDB直接アクセス
3. **エラーハンドリング**: 適切なロールバック処理

## ファイル構成

### 主要ファイル
- `/backend/app/services/conversation_service.py` - メイン会話サービス
- `/backend/app/services/conversation_memory_service.py` - LangChain統合サービス
- `/backend/app/models/conversation.py` - データベースモデル
- `/backend/app/routers/conversation.py` - APIエンドポイント
- `/backend/conversations/*.json` - ファイルベース保存（レガシー）

### 設定
- **Redis接続**: `host='redis', port=6379, db=0`
- **セッションTTL**: 3600秒（1時間）
- **OpenAI統合**: GPT-4o-mini使用（conversation chains用）

## 今後の改善点

1. **パフォーマンス**:
   - メッセージのページネーション実装
   - 大量メッセージ時の分割保存

2. **機能拡張**:
   - メッセージ検索機能
   - 会話のカテゴリ分類
   - エクスポート機能

3. **運用**:
   - メトリクス収集
   - ログ分析
   - バックアップ戦略

この設計により、リアルタイムチャットの要件を満たしながら、データの永続化と高速アクセスを両立しています。
