# Health Center FAQ MCP Server - プロジェクト構造

```
mcp-faq-server/
├── package.json                 # パッケージ設定とスクリプト
├── tsconfig.json               # TypeScript設定
├── jest.config.js              # Jest テスト設定
├── env.example                 # 環境変数テンプレート
├── README.md                   # プロジェクト説明書
├── STRUCTURE.md               # この構造説明ファイル
│
├── src/                       # ソースコード
│   ├── index.ts              # MCPサーバーメイン実装
│   ├── types.ts              # 型定義とスキーマ
│   └── supabase-client.ts    # Supabaseクライアントラッパー
│
├── examples/                  # 使用例とサンプル
│   ├── usage-examples.ts     # TypeScript使用例
│   └── claude-desktop-config.json # Claude Desktop設定例
│
├── tests/                     # テストファイル
│   ├── setup.ts              # テストセットアップ
│   └── mcp-server.test.ts    # MCPサーバーテスト
│
└── dist/                      # ビルド出力（生成される）
    ├── index.js
    ├── types.js
    └── supabase-client.js
```

## ファイル詳細説明

### 設定ファイル

- **package.json**: Node.jsパッケージ設定、依存関係、スクリプト定義
- **tsconfig.json**: TypeScriptコンパイル設定
- **jest.config.js**: Jestテストフレームワーク設定
- **env.example**: 環境変数のテンプレートファイル

### ソースコード (src/)

- **index.ts**: MCPサーバーのメイン実装
  - FAQMCPServerクラス
  - ツールハンドラー定義
  - エラーハンドリング
  - サーバー起動処理

- **types.ts**: 型定義とバリデーションスキーマ
  - FAQ、FAQCategory型定義
  - リクエスト/レスポンス型
  - Zodスキーマによるバリデーション
  - MCPツール引数型定義

- **supabase-client.ts**: Supabaseとの連携クライアント
  - SupabaseFAQClientクラス
  - FAQ操作メソッド
  - キャッシュ機能
  - エラーハンドリング

### 使用例 (examples/)

- **usage-examples.ts**: TypeScript/Node.js使用例
  - FAQMCPClientクラス
  - 7つの使用例シナリオ
  - エラーハンドリング例

- **claude-desktop-config.json**: Claude Desktop設定例
  - MCPサーバー登録設定
  - 環境変数設定

### テスト (tests/)

- **setup.ts**: テスト環境セットアップ
  - 環境変数設定
  - グローバルフック
  - エラーハンドリング

- **mcp-server.test.ts**: 包括的テストスイート
  - FAQ一覧取得テスト
  - FAQ詳細取得テスト
  - カテゴリ管理テスト
  - 検索機能テスト
  - キャッシュ機能テスト
  - エラーハンドリングテスト

## アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCPクライアント   │    │   MCP FAQ Server │    │    Supabase     │
│  (Claude/Python) │    │                 │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │ MCP Protocol           │ HTTP API              │
         ├────────────────────────┤                       │
         │                        │                       │
         │ 1. get_faq_list       │ SELECT faqs...         │
         │ 2. get_faq_detail     │ SELECT faq WHERE...    │
         │ 3. search_faqs        │ SELECT ... LIKE...     │
         │ 4. increment_view     │ RPC increment_view...  │
         │ ...                   │ ...                    │
         │                        │                       │
         └────────────────────────┴───────────────────────┘
```

## データフロー

1. **リクエスト受信**: MCPクライアントからツール呼び出しを受信
2. **引数検証**: Zodスキーマによる厳密な引数検証
3. **キャッシュチェック**: インメモリキャッシュから高速データ取得
4. **Supabaseクエリ**: キャッシュミス時にSupabaseからデータ取得
5. **データ変換**: 型安全なデータ変換とフィルタリング
6. **キャッシュ更新**: 取得データをキャッシュに保存
7. **レスポンス返却**: 構造化されたJSONレスポンスを返却

## セキュリティ機能

- **入力検証**: 全ての入力パラメータをZodスキーマで検証
- **アクセス制御**: Supabase RLSによる行レベルセキュリティ
- **エラー処理**: 機密情報を漏洩しないエラーメッセージ
- **型安全性**: TypeScriptによる静的型チェック

## パフォーマンス最適化

- **インメモリキャッシュ**: 高速なデータアクセス
- **効率的クエリ**: 必要なカラムのみ選択
- **ページネーション**: 大量データの効率的処理
- **バックグラウンド処理**: 閲覧回数更新の非同期実行

## 拡張性

- **モジュラー設計**: 機能別にクラス分離
- **プラグイン対応**: 新しいツールの簡単な追加
- **設定外部化**: 環境変数による柔軟な設定
- **テスト駆動**: 包括的テストによる安全な機能追加
