import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FAQ, FAQCategory, FAQWithCategory, GetFAQsParams } from './types.js';

/**
 * Supabaseクライアントラッパークラス
 * FAQ管理に特化したメソッドを提供
 */
export class SupabaseFAQClient {
  private client: SupabaseClient;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTimeout: number;

  constructor(supabaseUrl: string, supabaseKey: string, cacheTimeout = 300000) {
    this.client = createClient(supabaseUrl, supabaseKey);
    this.cache = new Map();
    this.cacheTimeout = cacheTimeout; // 5分間のキャッシュ
  }

  /**
   * キャッシュからデータを取得
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * データをキャッシュに保存
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * FAQ一覧を取得
   */
  async getFAQs(params: GetFAQsParams): Promise<{
    data: FAQWithCategory[];
    count: number;
    error: any;
  }> {
    try {
      const cacheKey = `faqs_${JSON.stringify(params)}`;
      const cached = this.getCachedData<{ data: FAQWithCategory[]; count: number }>(cacheKey);
      if (cached) {
        return { ...cached, error: null };
      }

      let query = this.client
        .from('faqs')
        .select(`
          id,
          record_number,
          question_title,
          question_content,
          answer_content,
          status,
          priority,
          view_count,
          helpful_count,
          not_helpful_count,
          question_date,
          response_date,
          resolved_date,
          tags,
          related_faq_ids,
          created_at,
          updated_at,
          faq_categories (
            id,
            code,
            name,
            description,
            color_code,
            icon_name,
            is_active,
            faq_count,
            sort_order,
            created_at,
            updated_at
          )
        `, { count: 'exact' })
        .eq('status', params.status)
        .not('answer_content', 'is', null);

      // カテゴリフィルター
      if (params.category_code) {
        query = query.eq('faq_categories.code', params.category_code);
      }

      // 検索フィルター
      if (params.search) {
        query = query.or(
          `question_title.ilike.%${params.search}%,question_content.ilike.%${params.search}%,answer_content.ilike.%${params.search}%`
        );
      }

      // ソート
      const ascending = params.sort_order === 'asc';
      query = query.order(params.sort_by, { ascending });

      // 追加ソート（同じ値の場合の安定ソート）
      if (params.sort_by !== 'created_at') {
        query = query.order('created_at', { ascending: false });
      }

      // ページネーション
      query = query.range(params.offset, params.offset + params.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('FAQ取得エラー:', error);
        return { data: [], count: 0, error };
      }

      const result = {
        data: data as FAQWithCategory[] || [],
        count: count || 0
      };

      this.setCachedData(cacheKey, result);
      return { ...result, error: null };

    } catch (error) {
      console.error('FAQ取得例外:', error);
      return { data: [], count: 0, error };
    }
  }

  /**
   * FAQ詳細を取得
   */
  async getFAQDetail(faqId: string): Promise<{
    data: FAQWithCategory | null;
    error: any;
  }> {
    try {
      const cacheKey = `faq_detail_${faqId}`;
      const cached = this.getCachedData<FAQWithCategory>(cacheKey);
      if (cached) {
        return { data: cached, error: null };
      }

      const { data, error } = await this.client
        .from('faqs')
        .select(`
          id,
          record_number,
          question_title,
          question_content,
          answer_content,
          status,
          priority,
          view_count,
          helpful_count,
          not_helpful_count,
          question_date,
          response_date,
          resolved_date,
          tags,
          related_faq_ids,
          created_at,
          updated_at,
          faq_categories (
            id,
            code,
            name,
            description,
            color_code,
            icon_name,
            is_active,
            faq_count,
            sort_order,
            created_at,
            updated_at
          )
        `)
        .eq('id', faqId)
        .eq('status', 'resolved')
        .single();

      if (error) {
        console.error('FAQ詳細取得エラー:', error);
        return { data: null, error };
      }

      const result = data as FAQWithCategory;
      this.setCachedData(cacheKey, result);
      return { data: result, error: null };

    } catch (error) {
      console.error('FAQ詳細取得例外:', error);
      return { data: null, error };
    }
  }

  /**
   * FAQカテゴリ一覧を取得
   */
  async getCategories(activeOnly = true): Promise<{
    data: FAQCategory[];
    error: any;
  }> {
    try {
      const cacheKey = `categories_${activeOnly}`;
      const cached = this.getCachedData<FAQCategory[]>(cacheKey);
      if (cached) {
        return { data: cached, error: null };
      }

      let query = this.client
        .from('faq_categories')
        .select(`
          id,
          code,
          name,
          description,
          color_code,
          icon_name,
          is_active,
          faq_count,
          sort_order,
          created_at,
          updated_at
        `)
        .order('sort_order')
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('カテゴリ取得エラー:', error);
        return { data: [], error };
      }

      const result = data as FAQCategory[] || [];
      this.setCachedData(cacheKey, result);
      return { data: result, error: null };

    } catch (error) {
      console.error('カテゴリ取得例外:', error);
      return { data: [], error };
    }
  }

  /**
   * FAQ検索
   */
  async searchFAQs(query: string, limit = 10, categoryCode?: string): Promise<{
    data: FAQWithCategory[];
    error: any;
  }> {
    try {
      const cacheKey = `search_${query}_${limit}_${categoryCode || 'all'}`;
      const cached = this.getCachedData<FAQWithCategory[]>(cacheKey);
      if (cached) {
        return { data: cached, error: null };
      }

      let supabaseQuery = this.client
        .from('faqs')
        .select(`
          id,
          record_number,
          question_title,
          question_content,
          answer_content,
          view_count,
          helpful_count,
          not_helpful_count,
          created_at,
          faq_categories (
            name,
            code,
            color_code,
            icon_name
          )
        `)
        .eq('status', 'resolved')
        .or(`question_title.ilike.%${query}%,question_content.ilike.%${query}%,answer_content.ilike.%${query}%`)
        .order('view_count', { ascending: false })
        .order('helpful_count', { ascending: false })
        .limit(limit);

      if (categoryCode) {
        supabaseQuery = supabaseQuery.eq('faq_categories.code', categoryCode);
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        console.error('FAQ検索エラー:', error);
        return { data: [], error };
      }

      const result = data as FAQWithCategory[] || [];
      this.setCachedData(cacheKey, result);
      return { data: result, error: null };

    } catch (error) {
      console.error('FAQ検索例外:', error);
      return { data: [], error };
    }
  }

  /**
   * FAQ閲覧回数を増加
   */
  async incrementViewCount(faqId: string): Promise<{ success: boolean; error: any }> {
    try {
      // キャッシュをクリア
      this.clearCacheByPattern(`faq_detail_${faqId}`);
      this.clearCacheByPattern('faqs_');

      const { error } = await this.client.rpc('increment_faq_view_count', {
        faq_id: faqId
      });

      if (error) {
        console.error('閲覧回数更新エラー:', error);
        return { success: false, error };
      }

      return { success: true, error: null };

    } catch (error) {
      console.error('閲覧回数更新例外:', error);
      return { success: false, error };
    }
  }

  /**
   * FAQフィードバックを更新
   */
  async updateFeedback(faqId: string, feedbackType: 'helpful' | 'not_helpful'): Promise<{
    success: boolean;
    error: any;
  }> {
    try {
      // キャッシュをクリア
      this.clearCacheByPattern(`faq_detail_${faqId}`);
      this.clearCacheByPattern('faqs_');

      const column = feedbackType === 'helpful' ? 'helpful_count' : 'not_helpful_count';

      const { error } = await this.client
        .from('faqs')
        .update({ 
          [column]: this.client.sql`${column} + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', faqId)
        .eq('status', 'resolved');

      if (error) {
        console.error('フィードバック更新エラー:', error);
        return { success: false, error };
      }

      return { success: true, error: null };

    } catch (error) {
      console.error('フィードバック更新例外:', error);
      return { success: false, error };
    }
  }

  /**
   * 人気FAQ（閲覧回数順）を取得
   */
  async getPopularFAQs(limit = 10): Promise<{
    data: FAQWithCategory[];
    error: any;
  }> {
    try {
      const cacheKey = `popular_faqs_${limit}`;
      const cached = this.getCachedData<FAQWithCategory[]>(cacheKey);
      if (cached) {
        return { data: cached, error: null };
      }

      const { data, error } = await this.client
        .from('faqs')
        .select(`
          id,
          record_number,
          question_title,
          view_count,
          helpful_count,
          created_at,
          faq_categories (
            name,
            code,
            color_code,
            icon_name
          )
        `)
        .eq('status', 'resolved')
        .gt('view_count', 0)
        .order('view_count', { ascending: false })
        .order('helpful_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('人気FAQ取得エラー:', error);
        return { data: [], error };
      }

      const result = data as FAQWithCategory[] || [];
      this.setCachedData(cacheKey, result);
      return { data: result, error: null };

    } catch (error) {
      console.error('人気FAQ取得例外:', error);
      return { data: [], error };
    }
  }

  /**
   * パターンマッチでキャッシュをクリア
   */
  private clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * キャッシュを全クリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
