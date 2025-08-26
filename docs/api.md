# AIチャットボット API設計書

## 1. API概要

### 1.1 基本情報

- **ベースURL**: `https://api.medical-support.com/v1`
- **認証方式**: Bearer Token (JWT)
- **レート制限**: 1000 requests/hour per user
- **APIバージョン**: v1
- **ドキュメント**: OpenAPI 3.0準拠

### 1.2 共通仕様

#### リクエストヘッダー
```http
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>
```

#### レスポンス形式
```json
{
  "success": true,
  "data": {},
  "error": null,
  "metadata": {
    "timestamp": "2025-01-22T10:00:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### エラーレスポンス
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "metadata": {}
}
```

## 2. 認証API

### 2.1 ログイン

**POST** `/auth/login`

#### リクエスト
```json
{
  "email": "user@example.com",
  "password": "password123",
  "mfa_code": "123456"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "山田太郎",
      "role": "support_staff",
      "department": "medical_support"
    }
  }
}
```

### 2.2 トークンリフレッシュ

**POST** `/auth/refresh`

#### リクエスト
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.3 ログアウト

**POST** `/auth/logout`

#### リクエスト
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 3. チャットAPI

### 3.1 セッション作成

**POST** `/chat/sessions`

#### リクエスト
```json
{
  "context": {
    "department": "radiology",
    "system_version": "3.2.1"
  }
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-01-22T10:00:00Z",
    "expires_at": "2025-01-22T11:00:00Z"
  }
}
```

### 3.2 質問送信

**POST** `/chat/query`

#### リクエスト
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "query": "ログイン方法を教えてください"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "query_id": "660e8400-e29b-41d4-a716-446655440000",
    "candidates": [
      {
        "id": "faq_001",
        "question": "電子カルテのログイン方法を教えてください",
        "similarity_score": 0.95,
        "category": "authentication"
      },
      {
        "id": "faq_002",
        "question": "パスワードを忘れた場合の対処法",
        "similarity_score": 0.82,
        "category": "authentication"
      }
    ],
    "ai_search_available": true
  }
}
```

### 3.3 FAQ回答取得

**GET** `/chat/faq/{faq_id}`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": "faq_001",
    "question": "電子カルテのログイン方法を教えてください",
    "answer": "以下の手順でログインできます:\n1. ブラウザでシステムURLにアクセス\n2. ユーザーIDとパスワードを入力\n3. [ログイン]ボタンをクリック",
    "category": "authentication",
    "attachments": [
      {
        "type": "image",
        "url": "https://example.com/login-screen.png",
        "description": "ログイン画面"
      }
    ],
    "metadata": {
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T00:00:00Z",
      "view_count": 150,
      "helpful_count": 120
    }
  }
}
```

### 3.4 AI検索実行

**POST** `/chat/ai-search`

#### リクエスト
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "query": "ログイン後に画面が真っ白になる問題の対処法",
  "context_limit": 10
}
```

#### レスポンス (Server-Sent Events)
```
data: {"type": "start", "timestamp": "2025-01-22T10:00:00Z"}

data: {"type": "content", "content": "ログイン後に画面が", "timestamp": "2025-01-22T10:00:01Z"}

data: {"type": "content", "content": "真っ白になる問題について、", "timestamp": "2025-01-22T10:00:02Z"}

data: {"type": "sources", "sources": [{"title": "トラブルシューティングガイド", "url": "https://..."}], "timestamp": "2025-01-22T10:00:10Z"}

data: {"type": "end", "timestamp": "2025-01-22T10:00:10Z"}
```

### 3.5 フィードバック送信

**POST** `/chat/feedback`

#### リクエスト
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "message_id": "msg_001",
  "feedback_type": "resolved",
  "feedback_value": true,
  "rating": 5,
  "comment": "とても分かりやすい回答でした"
}
```

### 3.6 会話履歴取得

**GET** `/chat/history?session_id={session_id}`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "ログイン方法を教えてください",
        "timestamp": "2025-01-22T10:00:00Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "ログイン方法について説明します...",
        "response_type": "faq",
        "confidence_score": 0.95,
        "timestamp": "2025-01-22T10:00:05Z"
      }
    ],
    "metadata": {
      "total_messages": 2,
      "session_duration": 300,
      "resolved": true
    }
  }
}
```

## 4. FAQ管理API

### 4.1 FAQ一覧取得

**GET** `/faq?category={category}&page={page}&limit={limit}`

#### クエリパラメータ
- `category`: カテゴリでフィルタ（オプション）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20、最大: 100）
- `search`: 検索キーワード（オプション）
- `sort`: ソート順（created_at, updated_at, view_count）

#### レスポンス
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "faq_001",
        "question": "電子カルテのログイン方法を教えてください",
        "category": "authentication",
        "tags": ["ログイン", "認証"],
        "view_count": 150,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

### 4.2 FAQ作成

**POST** `/faq`

#### リクエスト
```json
{
  "question": "新しい質問",
  "answer": "回答内容",
  "category": "general",
  "subcategory": "basic",
  "tags": ["タグ1", "タグ2"]
}
```

### 4.3 FAQ更新

**PUT** `/faq/{faq_id}`

#### リクエスト
```json
{
  "answer": "更新された回答内容",
  "tags": ["タグ1", "タグ2", "タグ3"]
}
```

### 4.4 FAQ削除

**DELETE** `/faq/{faq_id}`

## 5. 管理API

### 5.1 分析データ取得

**GET** `/admin/analytics`

#### クエリパラメータ
- `start_date`: 開始日（YYYY-MM-DD）
- `end_date`: 終了日（YYYY-MM-DD）
- `metric`: 取得する指標（sessions, resolution_rate, response_time）

#### レスポンス
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_sessions": 1000,
      "total_messages": 5000,
      "resolution_rate": 0.75,
      "avg_response_time": 2.5,
      "satisfaction_score": 4.2
    },
    "daily_metrics": [
      {
        "date": "2025-01-22",
        "sessions": 50,
        "messages": 250,
        "resolution_rate": 0.80
      }
    ],
    "top_questions": [
      {
        "question": "ログイン方法",
        "count": 100,
        "category": "authentication"
      }
    ]
  }
}
```

### 5.2 ユーザー管理

**GET** `/admin/users`

#### レスポンス
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_001",
        "email": "user@example.com",
        "name": "山田太郎",
        "role": "support_staff",
        "department": "medical_support",
        "is_active": true,
        "last_login": "2025-01-22T09:00:00Z"
      }
    ]
  }
}
```

### 5.3 ナレッジインポート

**POST** `/admin/knowledge/import`

#### リクエスト (multipart/form-data)
```
file: <ファイル>
format: "csv" | "json" | "pdf"
category: "manual"
```

## 6. WebSocket API

### 6.1 接続

**URL**: `wss://api.medical-support.com/ws`

### 6.2 イベント

#### クライアント → サーバー

```javascript
// セッション参加
{
  "event": "chat:join",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}

// タイピング通知
{
  "event": "chat:typing",
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "is_typing": true
  }
}
```

#### サーバー → クライアント

```javascript
// メッセージ受信
{
  "event": "chat:message",
  "data": {
    "message": {
      "id": "msg_001",
      "role": "assistant",
      "content": "回答内容",
      "timestamp": "2025-01-22T10:00:00Z"
    }
  }
}

// ステータス更新
{
  "event": "chat:status",
  "data": {
    "status": "processing"
  }
}
```

## 7. エラーコード一覧

| コード | 説明 | HTTPステータス |
|--------|------|---------------|
| AUTH_INVALID_CREDENTIALS | 認証情報が無効 | 401 |
| AUTH_TOKEN_EXPIRED | トークンの有効期限切れ | 401 |
| AUTH_MFA_REQUIRED | MFA認証が必要 | 401 |
| PERMISSION_DENIED | アクセス権限なし | 403 |
| RESOURCE_NOT_FOUND | リソースが見つからない | 404 |
| VALIDATION_ERROR | バリデーションエラー | 400 |
| RATE_LIMIT_EXCEEDED | レート制限超過 | 429 |
| INTERNAL_ERROR | 内部エラー | 500 |
| SERVICE_UNAVAILABLE | サービス利用不可 | 503 |

## 8. セキュリティ

### 8.1 認証
- JWT Bearer Token
- トークン有効期限: 1時間
- リフレッシュトークン有効期限: 7日

### 8.2 暗号化
- すべての通信はHTTPS必須
- センシティブデータは暗号化して保存

### 8.3 レート制限
- 認証なし: 100 requests/hour
- 認証あり: 1000 requests/hour
- 管理API: 100 requests/hour

### 8.4 CORS設定
```javascript
{
  "allowed_origins": [
    "https://app.medical-support.com",
    "http://localhost:3000"
  ],
  "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allowed_headers": ["Authorization", "Content-Type", "X-Request-ID"],
  "max_age": 86400
}
```