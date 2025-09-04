# Health Center Document Conversion System - 機能仕様書

## 1. システム概要

### 1.1 システム名称
**Health Center Document Conversion System（医療文書変換システム）**

### 1.2 システム目的
医療機関で使用される様々な形式の文書（PDF、Word、Excel、PowerPoint、画像など）を統一的にMarkdown形式に変換し、効率的な管理・検索・AI活用を可能にするWebベースのシステムです。

### 1.3 対象ユーザー
- 医療従事者（医師、看護師、事務職員）
- 医療機関の管理者
- 医療文書の管理・分析業務に従事する職員

## 2. 主要機能

### 2.1 ファイル変換機能

#### 2.1.1 サポートファイル形式
**Office文書系**
- PDF（Portable Document Format）
- Microsoft Word (.docx)
- Microsoft Excel (.xlsx, .xls)
- Microsoft PowerPoint (.pptx)

**画像系**
- JPEG/JPG
- PNG
- GIF
- BMP
- WEBP

**音声系**
- WAV
- MP3
- OGG
- M4A
- FLAC

**その他**
- HTML
- CSV
- JSON
- XML
- ZIP（アーカイブ内の複数ファイル処理）
- YouTube URL（動画音声の文字起こし）
- EPub（電子書籍）

#### 2.1.2 変換モード
**標準変換モード**
- Microsoft MarkItDownライブラリを使用
- 基本的な文書構造（見出し、段落、リスト、表）を保持
- 高速処理（数秒〜数分）
- 追加費用なし

**AI強化変換モード**
- OpenAI GPT-4oを活用した高精度変換
- 画像内テキストの詳細説明
- 複雑なレイアウトの適切な解釈
- 音声ファイルの文字起こし
- 処理時間：数分〜数十分
- OpenAI API使用料が発生

#### 2.1.3 変換処理フロー
1. **ファイルアップロード**
   - ドラッグ&ドロップ対応
   - 複数ファイル同時アップロード
   - ファイルサイズ制限：100MB/ファイル
   - セキュリティスキャン実行

2. **変換前処理**
   - ファイル形式判定
   - メタデータ抽出
   - 変換方式選択

3. **変換実行**
   - リアルタイム進捗表示（WebSocket）
   - エラーハンドリング
   - 変換結果検証

4. **後処理**
   - Markdown品質チェック
   - メタデータ付与
   - ベクトル化（検索用）

### 2.2 文書管理機能

#### 2.2.1 文書一覧表示
- 変換済み文書の一覧表示
- ファイル名、変換日時、ファイルサイズ、変換方式の表示
- ソート機能（名前、日付、サイズ）
- フィルタリング機能（ファイル形式、変換方式）

#### 2.2.2 文書プレビュー
- Markdownレンダリング表示
- 元ファイルとの比較表示
- 構文ハイライト
- 印刷対応

#### 2.2.3 文書ダウンロード
- Markdown形式でのダウンロード
- HTML形式でのエクスポート
- PDF形式でのエクスポート（将来対応）
- バッチダウンロード機能

#### 2.2.4 文書削除
- 個別削除
- 一括削除
- 削除前確認ダイアログ
- 削除ログ記録

### 2.3 検索機能

#### 2.3.1 全文検索
- キーワードベース検索
- 部分一致・完全一致
- AND/OR/NOT検索
- ファジー検索（類似語検索）

#### 2.3.2 セマンティック検索
- ChromaDBベクトル検索
- 意味的類似性による検索
- 多言語対応
- 関連度スコア表示

#### 2.3.3 フィルタリング検索
- ファイル形式による絞り込み
- 変換日時による絞り込み
- ファイルサイズによる絞り込み
- メタデータによる絞り込み

#### 2.3.4 検索結果表示
- ハイライト表示
- スニペット表示
- 関連度ランキング
- ページネーション

### 2.4 AIチャット機能

#### 2.4.1 文書ベースQA
- アップロード済み文書を参照した質問応答
- RAG（Retrieval-Augmented Generation）実装
- 回答の根拠となる文書箇所の表示
- 複数文書にまたがる回答生成

#### 2.4.2 会話履歴管理
- チャット履歴の保存
- セッション管理
- 会話のエクスポート
- 会話の検索

#### 2.4.3 AI応答品質向上
- ファクトチェック機能
- 信頼度スコア表示
- 参照文書の明示
- 不確実性の明示

### 2.5 リアルタイム通信機能

#### 2.5.1 WebSocket通信
- 変換進捗のリアルタイム更新
- エラー通知の即座な表示
- 複数ユーザー間の状態同期
- 接続状態監視

#### 2.5.2 通知機能
- 変換完了通知
- エラー発生通知
- システムメンテナンス通知
- ブラウザ通知対応

### 2.6 設定管理機能

#### 2.6.1 システム設定
- OpenAI API設定
- 変換品質設定
- ファイルサイズ制限設定
- セキュリティ設定

#### 2.6.2 ユーザー設定
- 表示言語設定
- テーマ設定（ライト/ダーク）
- 通知設定
- デフォルト変換モード設定

## 3. 画面仕様

### 3.1 メイン画面
- ナビゲーションメニュー
- 機能アクセスボタン
- システム状態表示
- 最近の変換履歴

### 3.2 ファイル変換画面
- ファイルアップロード領域（ドラッグ&ドロップ）
- 変換モード選択
- 変換進捗表示
- 変換結果プレビュー

### 3.3 文書一覧画面
- 文書リスト表示
- 検索・フィルター機能
- ソート機能
- 一括操作機能

### 3.4 文書詳細画面
- Markdownプレビュー
- メタデータ表示
- ダウンロード機能
- 編集機能（将来対応）

### 3.5 検索画面
- 検索入力フォーム
- 検索結果一覧
- フィルター設定
- 検索履歴

### 3.6 AIチャット画面
- チャット入力フォーム
- 会話履歴表示
- 参照文書表示
- 会話管理機能

### 3.7 設定画面
- システム設定タブ
- ユーザー設定タブ
- API設定タブ
- セキュリティ設定タブ

## 4. API仕様

### 4.1 ファイル変換API

#### POST /api/v1/conversion/upload
**概要**: 単一ファイルの変換
**認証**: 不要（将来的に追加予定）

**リクエスト**
- Content-Type: multipart/form-data
- ファイル: 変換対象ファイル
- ai_enhanced: boolean（AI強化モード）

**レスポンス**
```json
{
  "success": true,
  "conversion_id": "uuid",
  "filename": "document.pdf",
  "status": "processing",
  "estimated_time": 120
}
```

#### POST /api/v1/conversion/batch
**概要**: 複数ファイルの一括変換

**リクエスト**
- Content-Type: multipart/form-data
- files[]: 変換対象ファイル配列
- ai_enhanced: boolean

**レスポンス**
```json
{
  "success": true,
  "batch_id": "uuid",
  "total_files": 5,
  "status": "processing"
}
```

#### GET /api/v1/conversion/status/{conversion_id}
**概要**: 変換状況の確認

**レスポンス**
```json
{
  "conversion_id": "uuid",
  "status": "completed",
  "progress": 100,
  "result_url": "/api/v1/conversion/download/result.md",
  "error": null
}
```

### 4.2 文書管理API

#### GET /api/v1/documents
**概要**: 文書一覧の取得

**パラメータ**
- page: ページ番号（デフォルト: 1）
- limit: 取得件数（デフォルト: 20）
- sort: ソート順（name, date, size）
- filter: フィルター条件

**レスポンス**
```json
{
  "documents": [
    {
      "id": "uuid",
      "filename": "document.md",
      "original_filename": "document.pdf",
      "created_at": "2025-01-20T10:00:00Z",
      "file_size": 1024,
      "conversion_mode": "ai_enhanced"
    }
  ],
  "total": 100,
  "page": 1,
  "total_pages": 5
}
```

#### GET /api/v1/documents/{id}
**概要**: 文書詳細の取得

**レスポンス**
```json
{
  "id": "uuid",
  "filename": "document.md",
  "content": "# Document Title\n\nContent...",
  "metadata": {
    "original_format": "pdf",
    "conversion_time": 45.2,
    "ai_enhanced": true
  }
}
```

#### DELETE /api/v1/documents/{id}
**概要**: 文書の削除

**レスポンス**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### 4.3 検索API

#### POST /api/v1/search
**概要**: 文書の検索

**リクエスト**
```json
{
  "query": "検索キーワード",
  "search_type": "semantic",
  "limit": 10,
  "filters": {
    "file_type": ["pdf", "docx"],
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-01-31"
    }
  }
}
```

**レスポンス**
```json
{
  "results": [
    {
      "document_id": "uuid",
      "filename": "document.md",
      "score": 0.95,
      "snippet": "...検索キーワード...",
      "highlights": ["keyword1", "keyword2"]
    }
  ],
  "total": 25,
  "query_time": 0.123
}
```

### 4.4 チャットAPI

#### POST /api/v1/chat/message
**概要**: チャットメッセージの送信

**リクエスト**
```json
{
  "message": "この文書について教えてください",
  "session_id": "uuid",
  "context_documents": ["doc_id1", "doc_id2"]
}
```

**レスポンス**
```json
{
  "response": "この文書は...",
  "sources": [
    {
      "document_id": "uuid",
      "filename": "source.md",
      "relevance_score": 0.89
    }
  ],
  "confidence": 0.92
}
```

### 4.5 WebSocket API

#### WS /ws
**概要**: リアルタイム通信

**メッセージ形式**
```json
{
  "type": "conversion_progress",
  "conversion_id": "uuid",
  "progress": 75,
  "status": "processing",
  "message": "PDFを解析中..."
}
```

## 5. データベース仕様

### 5.1 PostgreSQL（リレーショナルデータ）

#### documents テーブル
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    conversion_mode VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);
```

#### conversions テーブル
```sql
CREATE TABLE conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id),
    status VARCHAR(20) NOT NULL,
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    conversion_time_seconds REAL
);
```

### 5.2 MongoDB（ドキュメントデータ）

#### documents コレクション
```javascript
{
  _id: ObjectId,
  document_id: "uuid",
  content: "Markdown content...",
  chunks: [
    {
      chunk_id: "uuid",
      content: "chunk content...",
      metadata: {
        page: 1,
        section: "introduction"
      }
    }
  ],
  created_at: ISODate,
  updated_at: ISODate
}
```

### 5.3 ChromaDB（ベクトルデータベース）
- 文書チャンクのベクトル化
- セマンティック検索用インデックス
- メタデータフィルタリング

### 5.4 Redis（キャッシュ・セッション）
- 変換進捗状況
- セッション管理
- 検索結果キャッシュ
- レート制限情報

## 6. セキュリティ機能

### 6.1 ファイルセキュリティ
- アップロードファイルのウイルススキャン
- ファイル形式検証
- ファイルサイズ制限
- 危険な拡張子の制限

### 6.2 データ保護
- 個人情報の自動マスキング
- 機密情報の検出・警告
- アクセスログの記録
- データ暗号化（保存時・転送時）

### 6.3 API セキュリティ
- レート制限
- CORS設定
- セキュリティヘッダー
- 入力値検証

## 7. 国際化・多言語対応

### 7.1 サポート言語
- 日本語（プライマリ）
- 英語
- その他（将来対応）

### 7.2 多言語機能
- UI言語切り替え
- 文書内容の多言語対応
- エラーメッセージの多言語化
- 日付・時刻の地域化

## 8. 将来拡張機能

### 8.1 高度なAI機能
- 文書要約機能
- 文書分類機能
- 感情分析機能
- 翻訳機能

### 8.2 コラボレーション機能
- ユーザー管理・認証
- 文書共有機能
- コメント・注釈機能
- バージョン管理

### 8.3 統合機能
- 外部システム連携API
- Webhook機能
- ワークフロー自動化
- 定期処理・バッチ処理

### 8.4 医療特化機能
- DICOM画像対応
- HL7メッセージ処理
- 医療用語辞書連携
- 診療録テンプレート
