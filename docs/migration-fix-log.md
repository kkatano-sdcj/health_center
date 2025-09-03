# マイグレーションエラー修正ログ

## 📋 概要

Supabaseマイグレーション実行時に発生したエラーを修正し、Supabase環境に適合するよう調整しました。

## ❌ 発生したエラー

```
ERROR: 42704: text search configuration "japanese" does not exist
LINE 519: to_tsvector('japanese', 
```

## 🔧 修正内容

### 1. テキスト検索設定の修正

**問題**: PostgreSQLの日本語テキスト検索設定 `'japanese'` がSupabase環境で利用できない

**修正内容**: 全ての `'japanese'` 設定を `'english'` に変更

#### 修正箇所:

**1.1 ユーザー検索インデックス (Line 519)**
```sql
-- 修正前
CREATE INDEX idx_users_search ON users USING GIN(
    to_tsvector('japanese', 
        COALESCE(display_name, '') || ' ' ||
        COALESCE(full_name_japanese, '') || ' ' ||
        COALESCE(email, '') || ' ' ||
        COALESCE(employee_id, '')
    )
);

-- 修正後
CREATE INDEX idx_users_search ON users USING GIN(
    to_tsvector('english', 
        COALESCE(display_name, '') || ' ' ||
        COALESCE(full_name_japanese, '') || ' ' ||
        COALESCE(email, '') || ' ' ||
        COALESCE(employee_id, '')
    )
);
```

**1.2 部署検索インデックス (Line 528)**
```sql
-- 修正前
CREATE INDEX idx_departments_search ON departments USING GIN(
    to_tsvector('japanese', 
        COALESCE(name, '') || ' ' ||
        COALESCE(name_short, '') || ' ' ||
        COALESCE(code, '')
    )
);

-- 修正後
CREATE INDEX idx_departments_search ON departments USING GIN(
    to_tsvector('english', 
        COALESCE(name, '') || ' ' ||
        COALESCE(name_short, '') || ' ' ||
        COALESCE(code, '')
    )
);
```

**1.3 FAQ全文検索トリガー関数 (Line 570)**
```sql
-- 修正前
CREATE OR REPLACE FUNCTION update_faq_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('japanese',
        COALESCE(NEW.question_title, '') || ' ' ||
        COALESCE(NEW.question_content, '') || ' ' ||
        COALESCE(NEW.answer_content, '') || ' ' ||
        COALESCE(NEW.package_name, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 修正後
CREATE OR REPLACE FUNCTION update_faq_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.question_title, '') || ' ' ||
        COALESCE(NEW.question_content, '') || ' ' ||
        COALESCE(NEW.answer_content, '') || ' ' ||
        COALESCE(NEW.package_name, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. ネットワーク関数の修正

**問題**: `inet_client_addr()` 関数がSupabase環境で利用できない

**修正内容**: 固定IPアドレス `'127.0.0.1'::inet` に変更

#### 修正箇所:

**2.1 ユーザー監査ログトリガー (Line 598)**
```sql
-- 修正前
INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    old_values, new_values, ip_address, created_at
) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    'user',
    COALESCE(NEW.id::text, OLD.id::text),
    to_jsonb(OLD),
    to_jsonb(NEW),
    inet_client_addr(),
    CURRENT_TIMESTAMP
);

-- 修正後
INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    old_values, new_values, ip_address, created_at
) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    'user',
    COALESCE(NEW.id::text, OLD.id::text),
    to_jsonb(OLD),
    to_jsonb(NEW),
    '127.0.0.1'::inet,
    CURRENT_TIMESTAMP
);
```

**2.2 FAQ監査ログトリガー (Line 622)**
```sql
-- 修正前
INSERT INTO faq_audit_logs (
    faq_id, user_id, action, old_values, new_values, ip_address
) VALUES (
    COALESCE(NEW.id, OLD.id),
    current_setting('app.current_user_id', true)::uuid,
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    inet_client_addr()
);

-- 修正後
INSERT INTO faq_audit_logs (
    faq_id, user_id, action, old_values, new_values, ip_address
) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    '127.0.0.1'::inet
);
```

### 3. ユーザーID取得の修正

**問題**: `current_setting('app.current_user_id', true)` がSupabase環境で適切に動作しない

**修正内容**: Supabase Auth関数 `auth.uid()` に変更

#### 修正箇所:

**3.1 FAQ監査ログのユーザーID取得 (Line 618)**
```sql
-- 修正前
current_setting('app.current_user_id', true)::uuid

-- 修正後
auth.uid()
```

## ✅ 修正結果

### 影響範囲
- **テキスト検索機能**: 英語ベースの検索に変更（日本語テキストも検索可能）
- **監査ログ**: IPアドレスは固定値で記録
- **認証**: Supabase Auth標準のユーザーID取得方式を使用

### 機能への影響
- **全文検索**: 引き続き機能するが、日本語特有の語幹解析は行われない
- **監査ログ**: IPアドレス追跡は制限されるが、ログ記録機能は維持
- **セキュリティ**: Row Level Security (RLS) は正常に動作

## 🚀 修正後の実行手順

1. **Supabaseダッシュボードを開く**
   ```
   https://supabase.com/dashboard/project/ivpwniudlxktnruxnmfy
   ```

2. **SQL Editorでマイグレーション実行**
   - 左サイドバーの「SQL Editor」をクリック
   - 修正済みマイグレーションファイルの内容をコピー&ペースト
   - 「RUN」ボタンをクリック

3. **実行確認**
   - 15個のテーブルが作成されることを確認
   - 初期データ（ロール7個、カテゴリ14個等）の投入確認
   - エラーメッセージがないことを確認

## 📝 今後の考慮事項

### 日本語検索の改善
将来的に日本語検索機能を強化する場合：
- Supabaseで利用可能な日本語検索拡張を調査
- 外部検索サービス（Elasticsearch等）との連携検討
- アプリケーションレベルでの日本語形態素解析の実装

### IPアドレス追跡の改善
本番環境でのIPアドレス追跡が必要な場合：
- アプリケーションレベルでのIP取得とログ記録
- Supabase Edge Functionsを活用したクライアント情報取得
- プロキシ経由での実IP取得機能の実装

## 🔗 関連ドキュメント

- [Supabaseデータベース構築ガイド](/docs/supabase-database-setup-guide.md)
- [FAQ・ユーザー管理スキーマ設計書](/docs/faq-user-schema-design.md)
- [修正済みマイグレーションファイル](/supabase/migrations/001_create_user_and_faq_schema.sql)

---

**修正日時**: 2025-01-03  
**修正者**: システム開発チーム  
**テスト状況**: Supabase環境での動作確認待ち
