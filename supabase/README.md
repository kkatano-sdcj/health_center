# Supabase Database Schema Setup

## 概要
このディレクトリには、Health Centerプロジェクトのデータベーススキーマ設定ファイルが含まれています。

## スキーマ内容

### ユーザー管理システム
- **organizations**: 組織管理
- **departments**: 部署管理  
- **roles**: ロール・権限管理
- **users**: ユーザーマスタ
- **user_sessions**: セッション管理
- **audit_logs**: 監査ログ（パーティション化済み）

### FAQ管理システム
- **faq_categories**: FAQカテゴリ管理
- **faqs**: FAQ本体
- **faq_comments**: FAQコメント・履歴
- **faq_attachments**: FAQ添付ファイル
- **faq_audit_logs**: FAQ変更履歴

## マイグレーション実行方法

### 方法1: Supabase Dashboard（推奨）

1. Supabaseプロジェクトダッシュボードを開く
   ```
   https://ivpwniudlxktnruxnmfy.supabase.co
   ```

2. 左メニューから「SQL Editor」を選択

3. 以下のファイルの内容をコピー
   ```
   supabase/migrations/001_create_user_and_faq_schema.sql
   ```

4. SQL Editorに貼り付けて「Run」をクリック

### 方法2: Supabase CLI

Supabase CLIがインストール済みの場合：

```bash
# プロジェクトルートで実行
supabase db push
```

### 方法3: psqlコマンド

PostgreSQLクライアントがインストール済みの場合：

```bash
# データベース接続情報を設定
export DATABASE_URL="postgresql://postgres.[your-project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

# マイグレーション実行
psql "$DATABASE_URL" -f supabase/migrations/001_create_user_and_faq_schema.sql
```

## 機能詳細

### セキュリティ機能
- Row Level Security (RLS) ポリシー設定済み
- ユーザー認証・認可システム
- 監査ログによる全操作追跡
- パスワードハッシュ化対応

### パフォーマンス最適化
- 適切なインデックス設定
- 全文検索対応（日本語）
- パーティショニング（監査ログ）
- LTREE による階層構造の効率的管理

### 初期データ
以下の初期データが自動的に投入されます：

#### 組織・部署
- 医療法人健康センター
- IT部門、サポートセンター、医事課、内科、外科、事務部

#### ロール
- システム管理者（super_admin）
- 管理者（admin）
- サポートエンジニア（support_engineer）
- 医師（doctor）
- 看護師（nurse）
- 質問者（questioner）
- 閲覧者（viewer）

#### FAQカテゴリ
- 会計カード、レセプト、DPC、収納・請求
- マスタ、統計・DWH、処方・オーダ、病名
- 外来、入院、システム、帳票、画面表示、その他

## トラブルシューティング

### エラー: "permission denied"
→ Supabaseダッシュボードから実行するか、service_roleキーを使用してください

### エラー: "extension does not exist"
→ 必要な拡張機能（uuid-ossp, pgcrypto, ltree）が有効になっているか確認してください

### エラー: "relation already exists"  
→ 既存のテーブルがある場合は、先にバックアップを取ってから削除してください

## メンテナンス

### 統計情報の更新
```sql
ANALYZE users, departments, roles, user_sessions, audit_logs, faqs, faq_categories;
```

### 期限切れセッションのクリーンアップ
```sql
SELECT cleanup_expired_sessions();
```

### 監査ログのアーカイブ（月次）
新しいパーティションは自動的に作成されます。古いパーティションは必要に応じてアーカイブしてください。

## サポート

問題が発生した場合は、以下を確認してください：
1. .envファイルに正しいSupabase認証情報が設定されているか
2. Supabaseプロジェクトがアクティブな状態か
3. データベースの容量制限に達していないか

詳細なドキュメントは `/docs/faq-user-schema-design.md` および `/draft/user-management-schema-design.md` を参照してください。