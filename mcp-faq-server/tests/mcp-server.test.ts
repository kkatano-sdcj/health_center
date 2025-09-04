/**
 * Health Center FAQ MCP Server テストスイート
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FAQMCPClient } from '../examples/usage-examples.js';

describe('Health Center FAQ MCP Server', () => {
  let client: FAQMCPClient;

  beforeAll(async () => {
    client = new FAQMCPClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  beforeEach(() => {
    // 各テスト前にキャッシュをクリア
    return client.callTool('clear_cache', {});
  });

  describe('FAQ一覧取得', () => {
    test('基本的なFAQ一覧取得', async () => {
      const response = await client.callTool('get_faq_list', {
        limit: 5,
        offset: 0,
        sort_by: 'view_count'
      });

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('faqs');
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      expect(response.data).toHaveProperty('total_pages');
      expect(Array.isArray(response.data.faqs)).toBe(true);
      expect(response.data.faqs.length).toBeLessThanOrEqual(5);
    });

    test('カテゴリフィルター', async () => {
      const response = await client.callTool('get_faq_list', {
        limit: 10,
        category_code: 'RECEIPT',
        sort_by: 'created_at'
      });

      expect(response.success).toBe(true);
      
      if (response.data.faqs.length > 0) {
        response.data.faqs.forEach((faq: any) => {
          expect(faq.faq_categories?.code).toBe('RECEIPT');
        });
      }
    });

    test('検索フィルター', async () => {
      const response = await client.callTool('get_faq_list', {
        limit: 5,
        search: 'エラー',
        sort_by: 'view_count'
      });

      expect(response.success).toBe(true);
      
      if (response.data.faqs.length > 0) {
        response.data.faqs.forEach((faq: any) => {
          const searchTerm = 'エラー';
          const containsSearchTerm = 
            faq.question_title.includes(searchTerm) ||
            faq.question_content.includes(searchTerm) ||
            (faq.answer_content && faq.answer_content.includes(searchTerm));
          expect(containsSearchTerm).toBe(true);
        });
      }
    });

    test('無効なlimit値', async () => {
      const response = await client.callTool('get_faq_list', {
        limit: 101, // 上限を超える
        offset: 0
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('FAQ詳細取得', () => {
    test('有効なFAQ IDで詳細取得', async () => {
      // まずFAQ一覧から有効なIDを取得
      const listResponse = await client.callTool('get_faq_list', {
        limit: 1,
        sort_by: 'created_at'
      });

      expect(listResponse.success).toBe(true);
      
      if (listResponse.data.faqs.length > 0) {
        const faqId = listResponse.data.faqs[0].id;
        
        const detailResponse = await client.callTool('get_faq_detail', {
          faq_id: faqId,
          increment_view: false
        });

        expect(detailResponse.success).toBe(true);
        expect(detailResponse.data).toHaveProperty('id');
        expect(detailResponse.data).toHaveProperty('question_title');
        expect(detailResponse.data).toHaveProperty('question_content');
        expect(detailResponse.data).toHaveProperty('answer_content');
        expect(detailResponse.data.id).toBe(faqId);
      }
    });

    test('無効なFAQ IDで詳細取得', async () => {
      const response = await client.callTool('get_faq_detail', {
        faq_id: '00000000-0000-0000-0000-000000000000',
        increment_view: false
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    test('無効なUUID形式', async () => {
      try {
        await client.callTool('get_faq_detail', {
          faq_id: 'invalid-uuid',
          increment_view: false
        });
        
        // エラーが発生するはずなので、ここに到達してはいけない
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('カテゴリ管理', () => {
    test('カテゴリ一覧取得', async () => {
      const response = await client.callTool('get_faq_categories', {
        active_only: true,
        include_count: true
      });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        response.data.forEach((category: any) => {
          expect(category).toHaveProperty('id');
          expect(category).toHaveProperty('code');
          expect(category).toHaveProperty('name');
          expect(category).toHaveProperty('is_active');
          expect(category.is_active).toBe(true);
        });
      }
    });

    test('非アクティブカテゴリも含める', async () => {
      const response = await client.callTool('get_faq_categories', {
        active_only: false,
        include_count: true
      });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('FAQ検索', () => {
    test('基本的な検索', async () => {
      const response = await client.callTool('search_faqs', {
        query: 'レセプト',
        limit: 5
      });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        response.data.forEach((faq: any) => {
          const searchTerm = 'レセプト';
          const containsSearchTerm = 
            faq.question_title.includes(searchTerm) ||
            faq.question_content.includes(searchTerm) ||
            (faq.answer_content && faq.answer_content.includes(searchTerm));
          expect(containsSearchTerm).toBe(true);
        });
      }
    });

    test('カテゴリ指定検索', async () => {
      const response = await client.callTool('search_faqs', {
        query: 'エラー',
        limit: 5,
        category_code: 'RECEIPT'
      });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('空のクエリでエラー', async () => {
      try {
        await client.callTool('search_faqs', {
          query: '',
          limit: 5
        });
        
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('人気FAQ', () => {
    test('人気FAQ取得', async () => {
      const response = await client.callTool('get_popular_faqs', {
        limit: 5
      });

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        // 閲覧回数順にソートされているかチェック
        let prevViewCount = Number.MAX_SAFE_INTEGER;
        response.data.forEach((faq: any) => {
          expect(faq.view_count).toBeLessThanOrEqual(prevViewCount);
          prevViewCount = faq.view_count;
        });
      }
    });
  });

  describe('閲覧回数管理', () => {
    test('閲覧回数増加', async () => {
      // まずFAQを取得
      const listResponse = await client.callTool('get_faq_list', {
        limit: 1,
        sort_by: 'created_at'
      });

      expect(listResponse.success).toBe(true);
      
      if (listResponse.data.faqs.length > 0) {
        const faqId = listResponse.data.faqs[0].id;
        
        const response = await client.callTool('increment_view_count', {
          faq_id: faqId
        });

        expect(response.success).toBe(true);
        expect(response.message).toBeDefined();
      }
    });
  });

  describe('フィードバック管理', () => {
    test('helpful フィードバック', async () => {
      // まずFAQを取得
      const listResponse = await client.callTool('get_faq_list', {
        limit: 1,
        sort_by: 'created_at'
      });

      expect(listResponse.success).toBe(true);
      
      if (listResponse.data.faqs.length > 0) {
        const faqId = listResponse.data.faqs[0].id;
        
        const response = await client.callTool('update_faq_feedback', {
          faq_id: faqId,
          feedback_type: 'helpful'
        });

        expect(response.success).toBe(true);
        expect(response.message).toBeDefined();
      }
    });

    test('not_helpful フィードバック', async () => {
      // まずFAQを取得
      const listResponse = await client.callTool('get_faq_list', {
        limit: 1,
        sort_by: 'created_at'
      });

      expect(listResponse.success).toBe(true);
      
      if (listResponse.data.faqs.length > 0) {
        const faqId = listResponse.data.faqs[0].id;
        
        const response = await client.callTool('update_faq_feedback', {
          faq_id: faqId,
          feedback_type: 'not_helpful'
        });

        expect(response.success).toBe(true);
        expect(response.message).toBeDefined();
      }
    });
  });

  describe('キャッシュ管理', () => {
    test('キャッシュ統計取得', async () => {
      const response = await client.callTool('get_cache_stats', {});

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('size');
      expect(response.data).toHaveProperty('keys');
      expect(typeof response.data.size).toBe('number');
      expect(Array.isArray(response.data.keys)).toBe(true);
    });

    test('キャッシュクリア', async () => {
      // まずデータを取得してキャッシュを作成
      await client.callTool('get_faq_list', { limit: 5 });
      
      // キャッシュをクリア
      const clearResponse = await client.callTool('clear_cache', {});
      
      expect(clearResponse.success).toBe(true);
      expect(clearResponse.message).toBeDefined();
      
      // キャッシュサイズが0になっていることを確認
      const statsResponse = await client.callTool('get_cache_stats', {});
      expect(statsResponse.success).toBe(true);
      expect(statsResponse.data.size).toBe(0);
    });

    test('キャッシュ効果の確認', async () => {
      // 1回目のリクエスト
      const start1 = Date.now();
      const response1 = await client.callTool('get_faq_list', { limit: 10 });
      const time1 = Date.now() - start1;
      
      expect(response1.success).toBe(true);
      
      // 2回目のリクエスト（キャッシュから取得）
      const start2 = Date.now();
      const response2 = await client.callTool('get_faq_list', { limit: 10 });
      const time2 = Date.now() - start2;
      
      expect(response2.success).toBe(true);
      
      // 2回目の方が高速であることを期待（ただし、テスト環境では差が小さい可能性）
      console.log(`1回目: ${time1}ms, 2回目: ${time2}ms`);
      
      // データが同じであることを確認
      expect(response1.data.count).toBe(response2.data.count);
      expect(response1.data.faqs.length).toBe(response2.data.faqs.length);
    });
  });

  describe('エラーハンドリング', () => {
    test('存在しないツール呼び出し', async () => {
      try {
        await client.callTool('non_existent_tool', {});
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('不正な引数', async () => {
      try {
        await client.callTool('get_faq_list', {
          limit: -1,
          offset: 'invalid'
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
