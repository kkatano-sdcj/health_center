# FAQ機能セットアップガイド

## 概要
Health Center FAQページは、Supabaseデータベースから医療システムに関するFAQを取得・表示する機能です。

## 環境変数設定

### 1. 環境変数ファイルの作成
`frontend`ディレクトリに以下のファイルを作成してください：

**ファイル名: `.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=https://ivpwniudlxktnruxnmfy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cHduaXVkbHhrdG5ydXhubWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MDEwNjYsImV4cCI6MjA3MjM3NzA2Nn0.5vaEx4ZJ-sfIc_XomwZlfgjA0HVji7gnF4dhvVQstLw
```

### 2. 開発サーバーの再起動
環境変数を設定した後は、開発サーバーを再起動してください：

```bash
cd frontend
npm run dev
```

## FAQ機能の詳細

### データベース構造
- **テーブル**: `faqs` および `faq_categories`
- **主要フィールド**:
  - `question_content`: FAQ質問内容
  - `answer_content`: FAQ回答内容
  - `view_count`: 閲覧回数
  - `helpful_count`: 役立った回数

### 機能一覧

#### 1. FAQ表示機能
- 解決済み（`status = 'resolved'`）のFAQのみ表示
- カテゴリ別表示
- 閲覧回数順でソート

#### 2. 検索機能
- 質問内容と回答内容の全文検索
- カテゴリフィルター
- タグフィルター

#### 3. インタラクション機能
- FAQ展開時の閲覧回数自動増加
- 「役に立った」ボタンによるフィードバック
- リアルタイムでのカウント更新

#### 4. 管理機能
- 新しいFAQ追加
- 既存FAQ編集
- FAQ削除

### カテゴリ一覧
現在のシステムでは以下のカテゴリが利用可能です：

- 会計カード
- レセプト
- DPC
- 収納・請求
- マスタ
- 統計・DWH
- 処方・オーダ
- 病名
- 外来
- 入院
- システム
- 帳票
- 画面表示
- その他

### データ取得の仕組み

#### 基本クエリ
```sql
SELECT 
  f.id,
  f.question_content,
  f.answer_content,
  f.view_count,
  f.helpful_count,
  fc.name as category_name
FROM faqs f
LEFT JOIN faq_categories fc ON f.category_id = fc.id
WHERE f.status = 'resolved'
  AND f.answer_content IS NOT NULL
ORDER BY f.view_count DESC, f.created_at DESC;
```

#### 閲覧回数更新
専用のRPC関数を使用：
```sql
SELECT increment_faq_view_count('faq-uuid-here');
```

## トラブルシューティング

### FAQ一覧が表示されない場合

1. **環境変数の確認**
   - `.env.local`ファイルが正しく作成されているか
   - ファイル名に余分な拡張子がついていないか（`.env.local.txt`など）

2. **開発サーバーの再起動**
   ```bash
   # 開発サーバーを停止（Ctrl+C）してから
   npm run dev
   ```

3. **ブラウザのデベロッパーコンソール確認**
   - F12キーでデベロッパーツールを開く
   - Consoleタブでエラーメッセージを確認

4. **Supabase接続確認**
   - ブラウザのNetworkタブで API呼び出しを確認
   - 401エラーの場合はAPIキーを確認
   - 404エラーの場合はURLを確認

### よくあるエラーと対処法

#### エラー: "Supabaseが設定されていません"
**原因**: 環境変数が正しく読み込まれていない
**対処法**: 
1. `.env.local`ファイルの場所を確認（`frontend`ディレクトリ直下）
2. 開発サーバーを再起動

#### エラー: "FAQ読み込みに失敗しました"
**原因**: データベース接続またはクエリエラー
**対処法**:
1. Supabase URLとAPIキーを確認
2. ブラウザのコンソールで詳細なエラーメッセージを確認

#### 表示されるFAQ数が少ない
**原因**: `status = 'resolved'`の条件
**説明**: 解決済みのFAQのみが表示される仕様です

## 開発者向け情報

### ファイル構成
```
frontend/src/
├── app/faq/
│   └── page.tsx          # FAQページメインコンポーネント
├── lib/
│   └── supabase.ts       # Supabaseクライアント設定
└── components/
    └── layout/
        └── Navigation.tsx # ナビゲーションコンポーネント
```

### 主要な状態管理
- `faqs`: FAQ一覧データ
- `searchQuery`: 検索クエリ
- `selectedCategory`: 選択中のカテゴリ
- `isLoading`: ローディング状態
- `error`: エラーメッセージ

### カスタマイズポイント
- カテゴリの追加・変更: `categories`配列を編集
- 表示件数の変更: クエリの`limit`を調整
- ソート順の変更: `order`句を調整

## 本番環境での注意事項

1. **環境変数の管理**
   - 本番環境では適切な環境変数管理システムを使用
   - APIキーの定期的なローテーション

2. **パフォーマンス最適化**
   - ページネーション実装の検討
   - キャッシュ機能の追加
   - 画像最適化

3. **セキュリティ**
   - Row Level Security (RLS) の適切な設定
   - 入力値のサニタイゼーション
   - XSS対策の実装

## サポート

技術的な問題や質問がある場合は、開発チームまでお問い合わせください。

---

**最終更新**: 2025年1月20日
