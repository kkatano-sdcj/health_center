# Supabaseデータベース構築ガイド

## 🎯 概要

health_centerプロジェクトのSupabaseデータベースを構築するための詳細ガイドです。
既に準備済みのマイグレーションファイルを使用して、完全なユーザー管理・FAQ管理システムを構築します。

## 📋 事前準備

### ✅ 準備完了状態の確認
以下のファイルが既に準備されています：

- ✅ `/supabase/migrations/001_create_user_and_faq_schema.sql` - 完全なスキーマ定義
- ✅ `/supabase/db_config.json` - データベース設定
- ✅ `/supabase/README.md` - 詳細ドキュメント
- ✅ `/docs/faq-user-schema-design.md` - スキーマ設計書
- ✅ `/draft/user-management-schema-design.md` - ユーザー管理設計書
- ✅ `SUPABASE_SETUP.md` - セットアップ手順書

## 🚀 データベース構築手順

### ステップ 1: Supabaseダッシュボードにアクセス

1. 以下のURLをブラウザで開いてください：
   ```
   https://supabase.com/dashboard/project/ivpwniudlxktnruxnmfy
   ```

2. ログインしてプロジェクトダッシュボードを表示

### ステップ 2: SQL Editorを開く

1. 左サイドバーの「**SQL Editor**」をクリック
2. 「**New query**」をクリックして新しいクエリタブを作成

### ステップ 3: マイグレーションファイルの内容を取得

以下のコマンドでマイグレーションファイルの内容を表示：

```bash
# ファイル内容を表示
cat /home/kkatano/projects/health_center/supabase/migrations/001_create_user_and_faq_schema.sql
```

または、エディタで開く：
```bash
code /home/kkatano/projects/health_center/supabase/migrations/001_create_user_and_faq_schema.sql
```

### ステップ 4: SQL Editorでマイグレーション実行

1. **マイグレーションファイルの全内容をコピー**（Ctrl+A → Ctrl+C）

2. **SQL Editorに貼り付け**（Ctrl+V）

3. **右上の「RUN」ボタンをクリック**

4. **実行完了まで待機**（通常10-30秒）

### ステップ 5: 実行結果の確認

実行完了後、以下のメッセージが表示されることを確認：

```
Success. No rows returned
```

または類似の成功メッセージ

## 🔍 構築確認

### テーブル作成の確認

左サイドバーの「**Database**」→「**Tables**」で以下のテーブルが作成されていることを確認：

#### ✅ ユーザー管理系テーブル（6個）
- `organizations` - 組織管理
- `departments` - 部署管理  
- `roles` - ロール・権限管理
- `users` - ユーザーマスタ
- `user_sessions` - セッション管理
- `audit_logs` - 監査ログ（パーティション付き）

#### ✅ FAQ管理系テーブル（5個）
- `faq_categories` - FAQカテゴリ管理
- `faqs` - FAQ本体
- `faq_comments` - FAQコメント・履歴
- `faq_attachments` - FAQ添付ファイル
- `faq_audit_logs` - FAQ変更履歴

#### ✅ パーティションテーブル（3個）
- `audit_logs_2025_01` - 2025年1月の監査ログ
- `audit_logs_2025_02` - 2025年2月の監査ログ
- `audit_logs_2025_03` - 2025年3月の監査ログ

### 初期データの確認

SQL Editorで以下のクエリを実行して初期データを確認：

```sql
-- ロール確認
SELECT name, display_name, role_type FROM roles ORDER BY name;

-- FAQカテゴリ確認  
SELECT code, name, sort_order FROM faq_categories ORDER BY sort_order;

-- 部署確認
SELECT code, name, department_type FROM departments ORDER BY code;

-- 組織確認
SELECT code, name, type FROM organizations;
```

### 期待される結果

#### ロール（7個）
```
admin, super_admin, support_engineer, doctor, nurse, questioner, viewer
```

#### FAQカテゴリ（14個）
```
会計カード, レセプト, DPC, 収納・請求, マスタ, 統計・DWH, 
処方・オーダ, 病名, 外来, 入院, システム, 帳票, 画面表示, その他
```

#### 部署（6個）
```
IT部門, サポートセンター, 医事課, 内科, 外科, 事務部
```

#### 組織（1個）
```
医療法人健康センター
```

## 🛡️ セキュリティ機能の確認

### Row Level Security (RLS) ポリシーの確認

以下のテーブルでRLSが有効になっていることを確認：

```sql
-- RLS有効テーブルの確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;
```

期待される結果：
- `users` - ユーザーテーブル
- `user_sessions` - セッションテーブル  
- `audit_logs` - 監査ログテーブル
- `faqs` - FAQテーブル

### 権限設定の確認

```sql
-- テーブル権限の確認
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('authenticated', 'service_role')
ORDER BY table_name, grantee;
```

## 🎯 構築される機能

### 🔐 ユーザー管理システム
- **組織・部署階層管理**: LTREE型による効率的な階層構造
- **ロールベース権限管理**: 7つの事前定義ロール
- **セッション管理**: JWT + リフレッシュトークン対応
- **監査ログ**: 全操作の完全な追跡
- **MFA対応準備**: 多要素認証の基盤

### 📚 FAQ管理システム  
- **カテゴリ別FAQ管理**: 14の医療業務カテゴリ
- **全文検索（日本語対応）**: PostgreSQLのtsvector使用
- **コメント・履歴管理**: 完全な変更履歴追跡
- **ファイル添付機能**: セキュアなファイル管理
- **ステータス管理**: open → in_progress → resolved → closed

### 🛡️ セキュリティ機能
- **Row Level Security (RLS)**: テーブルレベルのアクセス制御
- **パスワードハッシュ化**: bcrypt + salt対応準備
- **セッション管理**: 自動期限切れとクリーンアップ
- **監査証跡**: 完全な操作ログ記録
- **権限制御**: 細かい権限設定

### ⚡ パフォーマンス機能
- **最適化されたインデックス**: 70以上の戦略的インデックス
- **パーティショニング**: 監査ログの月別分割
- **全文検索**: 日本語対応のGINインデックス
- **階層クエリ最適化**: LTREE GiSTインデックス

## ⚠️ トラブルシューティング

### よくあるエラーと対処法

#### エラー: "permission denied for schema public"
**原因**: 権限不足  
**対処**: Service Roleキーを使用していることを確認

#### エラー: "extension does not exist"  
**原因**: 必要な拡張が無効  
**対処**: Database → Extensions で以下を有効化：
- `uuid-ossp`
- `pgcrypto`  
- `ltree`

#### エラー: "relation already exists"
**原因**: 既存テーブルとの競合  
**対処**: 既存テーブルを削除してから再実行

#### エラー: "function inet_client_addr() is not available"
**原因**: Supabase環境でのネットワーク関数制限  
**対処**: 正常な動作です。監査ログのIP記録は実際の運用時に機能します

### 実行時間が長い場合
- 大量のインデックス作成により30秒-1分程度かかる場合があります
- タイムアウトエラーが発生した場合は、セクションごとに分割して実行してください

## ✅ 完了チェックリスト

構築完了後、以下をチェックしてください：

- [ ] **15個のテーブル**が作成されている
- [ ] **初期データ**（ロール7個、カテゴリ14個、部署6個、組織1個）が投入されている
- [ ] **RLSポリシー**が4つのテーブルで有効化されている
- [ ] **インデックス**が適切に作成されている（70個以上）
- [ ] **トリガー関数**が正常に動作している
- [ ] **パーティション**が3個作成されている

## 🔗 関連ドキュメント

- [FAQ・ユーザー管理スキーマ設計書](/docs/faq-user-schema-design.md)
- [ユーザー管理スキーマ設計書](/draft/user-management-schema-design.md)
- [Supabase設定README](/supabase/README.md)
- [SUPABASE_SETUP.md](/SUPABASE_SETUP.md)

## 📞 サポート

構築中に問題が発生した場合：

1. **エラーメッセージの確認**: SQL Editorの下部に表示されるエラー詳細を確認
2. **ドキュメント参照**: 関連ドキュメントで類似の問題を検索
3. **段階的実行**: マイグレーションファイルをセクションごとに分割して実行

---

この手順に従って、health_centerプロジェクトの完全なデータベース環境を構築してください。
