#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { SupabaseFAQClient } from './supabase-client.js';
import {
  GetFAQListArgsSchema,
  GetFAQDetailArgsSchema,
  GetCategoriesArgsSchema,
  SearchFAQsArgsSchema,
  IncrementViewCountArgsSchema,
  UpdateFAQFeedbackArgsSchema,
  MCPToolResponse,
  GetFAQsParams,
} from './types.js';

// 環境変数を読み込み
config();

/**
 * Health Center FAQ Management MCP Server
 * Supabaseと連携してFAQ管理機能を提供
 */
class FAQMCPServer {
  private server: Server;
  private supabaseClient: SupabaseFAQClient;

  constructor() {
    // 環境変数の検証
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
    }

    // Supabaseクライアントを初期化
    const cacheTimeout = parseInt(process.env.CACHE_TTL_SECONDS || '300') * 1000;
    this.supabaseClient = new SupabaseFAQClient(supabaseUrl, supabaseKey, cacheTimeout);

    // MCPサーバーを初期化
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'health-center-faq',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandlers();
  }

  /**
   * ツールハンドラーを設定
   */
  private setupToolHandlers(): void {
    // ツール一覧を返すハンドラー
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getToolDefinitions(),
      };
    });

    // ツール実行ハンドラー
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_faq_list':
            return await this.handleGetFAQList(args);
          
          case 'get_faq_detail':
            return await this.handleGetFAQDetail(args);
          
          case 'get_faq_categories':
            return await this.handleGetCategories(args);
          
          case 'search_faqs':
            return await this.handleSearchFAQs(args);
          
          case 'get_popular_faqs':
            return await this.handleGetPopularFAQs(args);
          
          case 'increment_view_count':
            return await this.handleIncrementViewCount(args);
          
          case 'update_faq_feedback':
            return await this.handleUpdateFeedback(args);
          
          case 'get_cache_stats':
            return await this.handleGetCacheStats();
          
          case 'clear_cache':
            return await this.handleClearCache();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Tool execution error for ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                tool: name,
              } as MCPToolResponse, null, 2),
            },
          ],
        };
      }
    });
  }

  /**
   * エラーハンドラーを設定
   */
  private setupErrorHandlers(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('Shutting down MCP FAQ Server...');
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * ツール定義を取得
   */
  private getToolDefinitions(): Tool[] {
    return [
      {
        name: 'get_faq_list',
        description: 'FAQ一覧を取得します。ページネーション、カテゴリフィルター、検索、ソートに対応しています。',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '取得するFAQ数の上限（1-100）',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            offset: {
              type: 'number',
              description: '取得開始位置',
              minimum: 0,
              default: 0,
            },
            category_code: {
              type: 'string',
              description: 'カテゴリコード（例: RECEIPT, DPC, BILLING）',
            },
            search: {
              type: 'string',
              description: '検索キーワード（質問、回答内容を検索）',
            },
            sort_by: {
              type: 'string',
              enum: ['created_at', 'view_count', 'helpful_count'],
              description: 'ソート基準',
              default: 'view_count',
            },
          },
        },
      },
      {
        name: 'get_faq_detail',
        description: 'FAQ詳細を取得します。オプションで閲覧回数を自動増加できます。',
        inputSchema: {
          type: 'object',
          properties: {
            faq_id: {
              type: 'string',
              description: 'FAQ ID（UUID形式）',
              pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            },
            increment_view: {
              type: 'boolean',
              description: '閲覧回数を増加させるか',
              default: true,
            },
          },
          required: ['faq_id'],
        },
      },
      {
        name: 'get_faq_categories',
        description: 'FAQカテゴリ一覧を取得します。',
        inputSchema: {
          type: 'object',
          properties: {
            include_count: {
              type: 'boolean',
              description: 'FAQ数を含めるか',
              default: true,
            },
            active_only: {
              type: 'boolean',
              description: 'アクティブなカテゴリのみ取得するか',
              default: true,
            },
          },
        },
      },
      {
        name: 'search_faqs',
        description: 'FAQを検索します。質問タイトル、内容、回答内容から検索します。',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '検索クエリ',
              minLength: 1,
            },
            limit: {
              type: 'number',
              description: '取得するFAQ数の上限（1-50）',
              minimum: 1,
              maximum: 50,
              default: 10,
            },
            category_code: {
              type: 'string',
              description: '検索対象のカテゴリコード',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_popular_faqs',
        description: '人気FAQ（閲覧回数順）を取得します。',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '取得するFAQ数の上限',
              minimum: 1,
              maximum: 50,
              default: 10,
            },
          },
        },
      },
      {
        name: 'increment_view_count',
        description: 'FAQ閲覧回数を増加させます。',
        inputSchema: {
          type: 'object',
          properties: {
            faq_id: {
              type: 'string',
              description: 'FAQ ID（UUID形式）',
              pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            },
          },
          required: ['faq_id'],
        },
      },
      {
        name: 'update_faq_feedback',
        description: 'FAQフィードバック（役立った/役立たなかった）を更新します。',
        inputSchema: {
          type: 'object',
          properties: {
            faq_id: {
              type: 'string',
              description: 'FAQ ID（UUID形式）',
              pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            },
            feedback_type: {
              type: 'string',
              enum: ['helpful', 'not_helpful'],
              description: 'フィードバックの種類',
            },
          },
          required: ['faq_id', 'feedback_type'],
        },
      },
      {
        name: 'get_cache_stats',
        description: 'キャッシュ統計情報を取得します。',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'clear_cache',
        description: 'キャッシュを全クリアします。',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * FAQ一覧取得ハンドラー
   */
  private async handleGetFAQList(args: any) {
    const validatedArgs = GetFAQListArgsSchema.parse(args);
    
    const params: GetFAQsParams = {
      limit: validatedArgs.limit,
      offset: validatedArgs.offset,
      category_code: validatedArgs.category_code,
      status: 'resolved',
      search: validatedArgs.search,
      sort_by: validatedArgs.sort_by,
      sort_order: 'desc',
    };

    const { data, count, error } = await this.supabaseClient.getFAQs(params);

    const response: MCPToolResponse = {
      success: !error,
      data: {
        faqs: data,
        count,
        page: Math.floor(validatedArgs.offset / validatedArgs.limit) + 1,
        limit: validatedArgs.limit,
        total_pages: Math.ceil(count / validatedArgs.limit),
      },
      error: error?.message,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * FAQ詳細取得ハンドラー
   */
  private async handleGetFAQDetail(args: any) {
    const validatedArgs = GetFAQDetailArgsSchema.parse(args);
    
    const { data, error } = await this.supabaseClient.getFAQDetail(validatedArgs.faq_id);

    if (!error && data && validatedArgs.increment_view) {
      // 閲覧回数を増加（バックグラウンドで実行）
      this.supabaseClient.incrementViewCount(validatedArgs.faq_id).catch(console.error);
    }

    const response: MCPToolResponse = {
      success: !error,
      data,
      error: error?.message,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * カテゴリ一覧取得ハンドラー
   */
  private async handleGetCategories(args: any) {
    const validatedArgs = GetCategoriesArgsSchema.parse(args);
    
    const { data, error } = await this.supabaseClient.getCategories(validatedArgs.active_only);

    const response: MCPToolResponse = {
      success: !error,
      data,
      error: error?.message,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * FAQ検索ハンドラー
   */
  private async handleSearchFAQs(args: any) {
    const validatedArgs = SearchFAQsArgsSchema.parse(args);
    
    const { data, error } = await this.supabaseClient.searchFAQs(
      validatedArgs.query,
      validatedArgs.limit,
      validatedArgs.category_code
    );

    const response: MCPToolResponse = {
      success: !error,
      data,
      error: error?.message,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * 人気FAQ取得ハンドラー
   */
  private async handleGetPopularFAQs(args: any = {}) {
    const limit = args.limit || 10;
    
    const { data, error } = await this.supabaseClient.getPopularFAQs(limit);

    const response: MCPToolResponse = {
      success: !error,
      data,
      error: error?.message,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * 閲覧回数増加ハンドラー
   */
  private async handleIncrementViewCount(args: any) {
    const validatedArgs = IncrementViewCountArgsSchema.parse(args);
    
    const { success, error } = await this.supabaseClient.incrementViewCount(validatedArgs.faq_id);

    const response: MCPToolResponse = {
      success,
      message: success ? '閲覧回数を増加しました' : '閲覧回数の増加に失敗しました',
      error: error?.message,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * フィードバック更新ハンドラー
   */
  private async handleUpdateFeedback(args: any) {
    const validatedArgs = UpdateFAQFeedbackArgsSchema.parse(args);
    
    const { success, error } = await this.supabaseClient.updateFeedback(
      validatedArgs.faq_id,
      validatedArgs.feedback_type
    );

    const response: MCPToolResponse = {
      success,
      message: success ? 'フィードバックを更新しました' : 'フィードバックの更新に失敗しました',
      error: error?.message,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * キャッシュ統計取得ハンドラー
   */
  private async handleGetCacheStats() {
    const stats = this.supabaseClient.getCacheStats();

    const response: MCPToolResponse = {
      success: true,
      data: stats,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * キャッシュクリアハンドラー
   */
  private async handleClearCache() {
    this.supabaseClient.clearCache();

    const response: MCPToolResponse = {
      success: true,
      message: 'キャッシュをクリアしました',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  /**
   * サーバーを開始
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Health Center FAQ MCP Server running on stdio');
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new FAQMCPServer();
  server.run().catch(console.error);
}
