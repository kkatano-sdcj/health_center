# 🚀 Supabase データベース構築手順

## 準備完了状態
✅ マイグレーションファイル作成済み
✅ 設定ファイル準備完了  
✅ セットアップスクリプト作成済み

## 📋 実行手順

### ステップ 1: Supabase ダッシュボードを開く

以下のURLをブラウザで開いてください：
```
https://supabase.com/dashboard/project/ivpwniudlxktnruxnmfy
```

### ステップ 2: SQL Editorへ移動

1. 左サイドバーの「SQL Editor」をクリック
2. 新しいクエリタブが開きます

### ステップ 3: マイグレーションファイルをコピー

ターミナルで以下のコマンドを実行：

```bash
# ファイル内容を表示
cat supabase/migrations/001_create_user_and_faq_schema.sql

# または、エディタで開く
code supabase/migrations/001_create_user_and_faq_schema.sql
```

全内容をコピー（Ctrl+A → Ctrl+C）

### ステップ 4: SQL Editorで実行

1. SQL Editorに貼り付け（Ctrl+V）
2. 右上の「RUN」ボタンをクリック
3. 実行完了まで待機（10-30秒）

### ステップ 5: 確認

実行後、以下を確認：

#### テーブル確認
左サイドバーの「Database」→「Tables」で以下のテーブルが作成されているか確認：

**ユーザー管理系**
- ✅ organizations
- ✅ departments  
- ✅ roles
- ✅ users
- ✅ user_sessions
- ✅ audit_logs

**FAQ管理系**
- ✅ faq_categories
- ✅ faqs
- ✅ faq_comments
- ✅ faq_attachments
- ✅ faq_audit_logs

#### 初期データ確認
SQL Editorで以下を実行して初期データを確認：

```sql
-- ロール確認
SELECT * FROM roles;

-- FAQカテゴリ確認  
SELECT * FROM faq_categories;

-- 部署確認
SELECT * FROM departments;
```

## 🎯 作成される機能

### ユーザー管理システム
- 組織・部署階層管理
- ロールベース権限管理
- セッション管理
- 監査ログ
- MFA対応準備

### FAQ管理システム  
- カテゴリ別FAQ管理
- 全文検索（日本語対応）
- コメント・履歴管理
- ファイル添付
- ステータス管理

### セキュリティ機能
- Row Level Security (RLS)
- パスワードハッシュ化
- セッション管理
- 監査証跡
- 権限制御

## 📝 作成済みファイル

| ファイル | 説明 |
|---------|------|
| `/supabase/migrations/001_create_user_and_faq_schema.sql` | 完全なスキーマ定義 |
| `/supabase/db_config.json` | データベース設定 |
| `/supabase/README.md` | 詳細ドキュメント |
| `/scripts/setup_supabase_db.py` | セットアップスクリプト |

## ⚠️ トラブルシューティング

### エラー: "permission denied"
→ Service Roleキーを使用しているか確認

### エラー: "extension does not exist"  
→ Database → Extensions で必要な拡張を有効化

### エラー: "relation already exists"
→ 既存テーブルがある場合は削除してから再実行

## ✅ 完了チェックリスト

- [ ] Supabase SQL Editorでマイグレーション実行
- [ ] 15個のテーブル作成を確認
- [ ] 初期データ（ロール、カテゴリ）を確認
- [ ] RLSポリシー有効化を確認

## 🔗 関連ドキュメント

- [FAQ・ユーザー管理スキーマ設計書](/docs/faq-user-schema-design.md)
- [ユーザー管理スキーマ設計書](/draft/user-management-schema-design.md)
- [Supabase設定README](/supabase/README.md)