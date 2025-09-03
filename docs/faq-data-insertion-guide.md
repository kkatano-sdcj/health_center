# FAQ データ登録ガイド

## 📋 概要

FAQ.csvの内容をSupabaseデータベースのFAQテーブルに登録するための手順書です。
10件のFAQレコードを適切なカテゴリに分類して登録します。

## 📊 データ概要

### 登録対象データ
- **総件数**: 10件のFAQレコード
- **期間**: 2022年6月〜2024年5月
- **カテゴリ**: 10種類の医療業務カテゴリに分類

### カテゴリマッピング
| CSV カテゴリ | データベース カテゴリ | カテゴリID |
|-------------|-------------------|-----------|
| 画面表示 | DISPLAY | 10000000-0000-0000-0000-000000000013 |
| 収納・請求 | BILLING | 10000000-0000-0000-0000-000000000004 |
| 統計・DWH | STATISTICS | 10000000-0000-0000-0000-000000000006 |
| DPC | DPC | 10000000-0000-0000-0000-000000000003 |
| システム | SYSTEM | 10000000-0000-0000-0000-000000000011 |
| 会計カード | ACCOUNTING | 10000000-0000-0000-0000-000000000001 |
| レセプト | RECEIPT | 10000000-0000-0000-0000-000000000002 |
| マスタ | MASTER | 10000000-0000-0000-0000-000000000005 |
| 外来 | OUTPATIENT | 10000000-0000-0000-0000-000000000009 |
| 入院 | INPATIENT | 10000000-0000-0000-0000-000000000010 |

## 🚀 実行手順

### ステップ 1: 前提条件の確認

以下が完了していることを確認してください：
- ✅ Supabaseデータベースが構築済み
- ✅ 基本スキーマ（テーブル・カテゴリ）が作成済み
- ✅ Supabaseダッシュボードへのアクセス権限あり

### ステップ 2: Supabaseダッシュボードにアクセス

1. ブラウザで以下のURLを開く：
   ```
   https://supabase.com/dashboard/project/ivpwniudlxktnruxnmfy
   ```

2. 左サイドバーの「**SQL Editor**」をクリック

### ステップ 3: FAQデータ登録SQLの実行

1. **新しいクエリタブを作成**

2. **以下のコマンドでSQLファイルの内容を表示**：
   ```bash
   cat supabase/migrations/002_insert_faq_data.sql
   ```

3. **SQLファイルの全内容をコピー** (Ctrl+A → Ctrl+C)

4. **SQL Editorに貼り付け** (Ctrl+V)

5. **「RUN」ボタンをクリック**して実行

### ステップ 4: 実行結果の確認

実行完了後、以下のクエリで登録結果を確認：

```sql
-- 登録されたFAQの一覧確認
SELECT 
    f.record_number,
    f.question_title,
    fc.name as category_name,
    f.status,
    f.question_date
FROM faqs f
JOIN faq_categories fc ON f.category_id = fc.id
ORDER BY f.question_date;

-- カテゴリ別FAQ数の確認
SELECT 
    fc.name as category_name,
    fc.faq_count,
    COUNT(f.id) as actual_count
FROM faq_categories fc
LEFT JOIN faqs f ON fc.id = f.category_id
GROUP BY fc.id, fc.name, fc.faq_count
ORDER BY fc.sort_order;

-- 全文検索インデックスの確認
SELECT 
    record_number,
    question_title,
    CASE 
        WHEN search_vector IS NOT NULL THEN '✅ 作成済み'
        ELSE '❌ 未作成'
    END as search_index_status
FROM faqs
ORDER BY question_date;
```

## 📄 登録されるFAQデータ詳細

### FAQ一覧

| 記録番号 | タイトル | カテゴリ | ステータス | 質問日 |
|---------|---------|----------|-----------|--------|
| IIJI-20220607-000042 | 会計カード画面の表示異常について | 画面表示 | 解決済み | 2022-06-07 |
| IIJI-20220615-000072 | 収納細節集計の誤りについて | 収納・請求 | 解決済み | 2022-06-15 |
| IIJI-20220808-000275 | 稼働額統計（速報）で特定の患者でデータが作成されない | 統計・DWH | 解決済み | 2022-08-08 |
| IIJI-20221028-000534 | 化学療法薬剤のＤＰＣレセプトへの印字について | DPC | 解決済み | 2022-10-28 |
| IIJI-20221028-000535 | HOPE X-W V12に関する問い合わせ | システム | 解決済み | 2022-10-28 |
| IIJI-20221101-000542 | 会計カード業務に関する問い合わせ | 会計カード | 対応中 | 2022-11-01 |
| IIJI-20231215-001991 | レセプト作成時のエラーについて | レセプト | 解決済み | 2023-12-15 |
| IIJI-20240115-002047 | 点数マスタの設定に関する問い合わせ | マスタ | 解決済み | 2024-01-15 |
| M-20240119-50483 | 外来受付時のトラブルについて | 外来 | 解決済み | 2024-01-19 |
| IIJI-20240509-002395 | 入院患者の転科処理に関する質問 | 入院 | 解決済み | 2024-05-09 |

## ✅ 期待される結果

### 登録完了後の状態
- **FAQレコード数**: 10件
- **使用カテゴリ数**: 10カテゴリ
- **解決済みFAQ**: 9件
- **対応中FAQ**: 1件
- **全文検索インデックス**: 全FAQで作成済み

### 機能確認
以下の機能が正常に動作することを確認：

1. **カテゴリ別FAQ表示**
2. **全文検索機能**
3. **FAQ詳細表示**
4. **関連チケット番号の表示**
5. **メタデータ（質問者・対応者情報）の表示**

## ⚠️ トラブルシューティング

### よくあるエラーと対処法

#### エラー: "duplicate key value violates unique constraint"
**原因**: 同じrecord_numberのFAQが既に存在  
**対処**: 既存データを確認し、重複レコードを削除してから再実行

```sql
-- 重複確認
SELECT record_number, COUNT(*) 
FROM faqs 
GROUP BY record_number 
HAVING COUNT(*) > 1;

-- 重複削除（必要に応じて）
DELETE FROM faqs WHERE record_number = 'IIJI-20220607-000042';
```

#### エラー: "foreign key constraint fails"
**原因**: カテゴリIDが存在しない  
**対処**: カテゴリテーブルの存在確認

```sql
-- カテゴリ存在確認
SELECT id, code, name FROM faq_categories ORDER BY sort_order;
```

#### 全文検索インデックスが作成されない
**原因**: search_vector更新処理の失敗  
**対処**: 手動でsearch_vectorを更新

```sql
-- 全FAQのsearch_vector更新
UPDATE faqs SET search_vector = to_tsvector('english',
    COALESCE(question_title, '') || ' ' ||
    COALESCE(question_content, '') || ' ' ||
    COALESCE(answer_content, '') || ' ' ||
    COALESCE(package_name, '')
);
```

## 🔍 データ検証

### 登録後の検証クエリ

```sql
-- 1. 基本統計
SELECT 
    COUNT(*) as total_faqs,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_faqs,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_faqs,
    COUNT(DISTINCT category_id) as used_categories
FROM faqs;

-- 2. 日付範囲確認
SELECT 
    MIN(question_date) as earliest_question,
    MAX(question_date) as latest_question,
    COUNT(*) as total_count
FROM faqs;

-- 3. パッケージ別集計
SELECT 
    COALESCE(package_name, '未指定') as package,
    COUNT(*) as faq_count
FROM faqs
GROUP BY package_name
ORDER BY faq_count DESC;

-- 4. 検索機能テスト
SELECT 
    record_number,
    question_title,
    ts_rank(search_vector, plainto_tsquery('english', '会計')) as rank
FROM faqs
WHERE search_vector @@ plainto_tsquery('english', '会計')
ORDER BY rank DESC;
```

## 📝 次のステップ

FAQデータ登録完了後の推奨作業：

1. **アプリケーション連携テスト**
   - FAQ検索機能の動作確認
   - カテゴリフィルタリングの確認
   - 詳細表示機能の確認

2. **追加データ投入**
   - 新しいFAQデータがある場合の追加投入
   - ユーザーからの新規FAQ登録テスト

3. **パフォーマンス確認**
   - 検索速度の測定
   - インデックス効果の確認
   - 大量データでの動作確認

## 🔗 関連ドキュメント

- [Supabaseデータベース構築ガイド](/docs/supabase-database-setup-guide.md)
- [FAQ・ユーザー管理スキーマ設計書](/docs/faq-user-schema-design.md)
- [マイグレーション修正ログ](/docs/migration-fix-log.md)
- [FAQデータ登録SQL](/supabase/migrations/002_insert_faq_data.sql)

---

**作成日**: 2025-01-03  
**対象データ**: FAQ.csv (10件)  
**実行環境**: Supabase PostgreSQL
