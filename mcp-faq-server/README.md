# Health Center FAQ MCP Server

医療センターのFAQ管理システム用のMCP（Model Context Protocol）サーバーです。SupabaseのFAQデータベースと連携し、FAQ取得、検索、閲覧回数管理などの機能を提供します。

## 機能

- ✅ FAQ一覧取得（ページネーション、ソート、フィルタリング対応）
- ✅ FAQ詳細取得（閲覧回数自動更新）
- ✅ FAQカテゴリ管理
- ✅ FAQ検索（全文検索）
- ✅ 人気FAQ取得
- ✅ 閲覧回数管理
- ✅ フィードバック管理（役立った/役立たなかった）
- ✅ インメモリキャッシュ機能
- ✅ エラーハンドリング

## インストール

```bash
# パッケージのインストール
npm install

# 環境変数の設定
cp env.example .env
# .envファイルを編集してSupabaseの設定を入力

# TypeScriptのビルド
npm run build
```

## 環境変数

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# MCP Server Configuration
MCP_SERVER_NAME=health-center-faq
MCP_SERVER_VERSION=1.0.0

# Cache Configuration
CACHE_TTL_SECONDS=300
MAX_CACHE_SIZE=1000

# Logging Configuration
LOG_LEVEL=info
```

## 使用方法

### 開発環境での起動

```bash
npm run dev
```

### 本番環境での起動

```bash
npm run build
npm start
```

## MCPクライアント設定

### Claude Desktop設定例

`claude_desktop_config.json`に以下を追加：

```json
{
  "mcpServers": {
    "health-center-faq": {
      "command": "node",
      "args": ["/path/to/mcp-faq-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://ivpwniudlxktnruxnmfy.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

## 利用可能なツール

### 1. get_faq_list
FAQ一覧を取得します。

```json
{
  "name": "get_faq_list",
  "arguments": {
    "limit": 20,
    "offset": 0,
    "category_code": "RECEIPT",
    "search": "レセプト",
    "sort_by": "view_count"
  }
}
```

### 2. get_faq_detail
FAQ詳細を取得し、オプションで閲覧回数を増加します。

```json
{
  "name": "get_faq_detail",
  "arguments": {
    "faq_id": "637d75dd-ad4b-4c52-b4e9-1a1141cd1a5b",
    "increment_view": true
  }
}
```

### 3. get_faq_categories
FAQカテゴリ一覧を取得します。

```json
{
  "name": "get_faq_categories",
  "arguments": {
    "active_only": true,
    "include_count": true
  }
}
```

### 4. search_faqs
FAQを検索します。

```json
{
  "name": "search_faqs",
  "arguments": {
    "query": "レセプト エラー",
    "limit": 10,
    "category_code": "RECEIPT"
  }
}
```

### 5. get_popular_faqs
人気FAQ（閲覧回数順）を取得します。

```json
{
  "name": "get_popular_faqs",
  "arguments": {
    "limit": 10
  }
}
```

### 6. increment_view_count
FAQ閲覧回数を増加させます。

```json
{
  "name": "increment_view_count",
  "arguments": {
    "faq_id": "637d75dd-ad4b-4c52-b4e9-1a1141cd1a5b"
  }
}
```

### 7. update_faq_feedback
FAQフィードバックを更新します。

```json
{
  "name": "update_faq_feedback",
  "arguments": {
    "faq_id": "637d75dd-ad4b-4c52-b4e9-1a1141cd1a5b",
    "feedback_type": "helpful"
  }
}
```

### 8. get_cache_stats
キャッシュ統計情報を取得します。

```json
{
  "name": "get_cache_stats",
  "arguments": {}
}
```

### 9. clear_cache
キャッシュを全クリアします。

```json
{
  "name": "clear_cache",
  "arguments": {}
}
```

## レスポンス形式

すべてのツールは以下の形式でレスポンスを返します：

```json
{
  "success": true,
  "data": {
    // ツール固有のデータ
  },
  "error": null,
  "message": "成功メッセージ（オプション）"
}
```

エラー時：

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "tool": "ツール名"
}
```

## 実装例

### React/Next.js での使用例

```typescript
// MCP経由でFAQ一覧を取得
const getFAQList = async (page: number = 1, categoryCode?: string) => {
  const limit = 20;
  const offset = (page - 1) * limit;
  
  // MCPクライアント経由でツールを呼び出し
  const response = await mcpClient.callTool('get_faq_list', {
    limit,
    offset,
    category_code: categoryCode,
    sort_by: 'view_count'
  });
  
  return response.data;
};

// FAQ詳細を取得し、閲覧回数を増加
const getFAQDetail = async (faqId: string) => {
  const response = await mcpClient.callTool('get_faq_detail', {
    faq_id: faqId,
    increment_view: true
  });
  
  return response.data;
};

// FAQ検索
const searchFAQs = async (query: string, categoryCode?: string) => {
  const response = await mcpClient.callTool('search_faqs', {
    query,
    category_code: categoryCode,
    limit: 10
  });
  
  return response.data;
};
```

### Python での使用例

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def get_faq_list():
    # MCPサーバーに接続
    server_params = StdioServerParameters(
        command="node",
        args=["/path/to/mcp-faq-server/dist/index.js"],
        env={
            "SUPABASE_URL": "https://ivpwniudlxktnruxnmfy.supabase.co",
            "SUPABASE_ANON_KEY": "your-anon-key"
        }
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # FAQ一覧を取得
            result = await session.call_tool("get_faq_list", {
                "limit": 20,
                "category_code": "RECEIPT",
                "sort_by": "view_count"
            })
            
            return result

# 使用例
if __name__ == "__main__":
    faqs = asyncio.run(get_faq_list())
    print(faqs)
```

## パフォーマンス最適化

### キャッシュ機能
- インメモリキャッシュによる高速なデータ取得
- 設定可能なキャッシュTTL（デフォルト5分）
- パターンマッチによる効率的なキャッシュ無効化

### データベース最適化
- 適切なインデックス使用によるクエリ最適化
- ページネーション対応による大量データの効率的な処理
- 必要なカラムのみを選択するSELECTクエリ

## セキュリティ

### アクセス制御
- Supabase RLS（Row Level Security）による適切なアクセス制御
- 解決済みFAQのみを一般ユーザーに公開
- 匿名キーによる安全な読み取り専用アクセス

### データ検証
- Zodスキーマによる厳密な入力値検証
- UUID形式の検証
- 適切な範囲制限（limit, offsetなど）

## トラブルシューティング

### よくある問題

1. **環境変数が設定されていない**
   ```
   Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set
   ```
   → `.env`ファイルを作成し、必要な環境変数を設定してください。

2. **Supabaseへの接続エラー**
   ```
   FAQ取得エラー: invalid API key
   ```
   → SUPABASE_ANON_KEYが正しく設定されているか確認してください。

3. **MCPクライアント接続エラー**
   → サーバーが正しく起動しているか、パスが正しいか確認してください。

### ログ確認
```bash
# 開発環境でのログ確認
npm run dev

# 本番環境でのログ確認
npm start 2>&1 | tee mcp-server.log
```

## 開発

### テスト実行
```bash
npm test
```

### リンター実行
```bash
npm run lint
```

### 型チェック
```bash
npm run type-check
```

## ライセンス

MIT License

## 貢献

バグ報告や機能要求は、GitHubのIssuesページでお願いします。

## 更新履歴

### v1.0.0
- 初期リリース
- 基本的なFAQ管理機能
- Supabase連携
- キャッシュ機能
- 包括的なエラーハンドリング
