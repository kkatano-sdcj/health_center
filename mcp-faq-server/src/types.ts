import { z } from 'zod';

// FAQ型定義
export const FAQSchema = z.object({
  id: z.string().uuid(),
  record_number: z.string(),
  question_title: z.string(),
  question_content: z.string(),
  answer_content: z.string().nullable(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  view_count: z.number().int().min(0).default(0),
  helpful_count: z.number().int().min(0).default(0),
  not_helpful_count: z.number().int().min(0).default(0),
  question_date: z.string().datetime(),
  response_date: z.string().datetime().nullable(),
  resolved_date: z.string().datetime().nullable(),
  tags: z.array(z.string()).default([]),
  related_faq_ids: z.array(z.string().uuid()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type FAQ = z.infer<typeof FAQSchema>;

// FAQカテゴリ型定義
export const FAQCategorySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color_code: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  icon_name: z.string().nullable(),
  is_active: z.boolean().default(true),
  faq_count: z.number().int().min(0).default(0),
  sort_order: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type FAQCategory = z.infer<typeof FAQCategorySchema>;

// FAQ with Category 型定義
export const FAQWithCategorySchema = FAQSchema.extend({
  faq_categories: FAQCategorySchema.nullable(),
});

export type FAQWithCategory = z.infer<typeof FAQWithCategorySchema>;

// クエリパラメータ型定義
export const GetFAQsParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  category_code: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('resolved'),
  search: z.string().optional(),
  sort_by: z.enum(['created_at', 'view_count', 'helpful_count']).default('view_count'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type GetFAQsParams = z.infer<typeof GetFAQsParamsSchema>;

// レスポンス型定義
export const FAQListResponseSchema = z.object({
  data: z.array(FAQWithCategorySchema),
  count: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  total_pages: z.number().int(),
});

export type FAQListResponse = z.infer<typeof FAQListResponseSchema>;

// エラー型定義
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// MCP Tool 引数型定義
export const GetFAQListArgsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).describe('取得するFAQ数の上限'),
  offset: z.number().int().min(0).default(0).describe('取得開始位置'),
  category_code: z.string().optional().describe('カテゴリコード（例: RECEIPT, DPC）'),
  search: z.string().optional().describe('検索キーワード'),
  sort_by: z.enum(['created_at', 'view_count', 'helpful_count']).default('view_count').describe('ソート基準'),
});

export const GetFAQDetailArgsSchema = z.object({
  faq_id: z.string().uuid().describe('FAQ ID'),
  increment_view: z.boolean().default(true).describe('閲覧回数を増加させるか'),
});

export const GetCategoriesArgsSchema = z.object({
  include_count: z.boolean().default(true).describe('FAQ数を含めるか'),
  active_only: z.boolean().default(true).describe('アクティブなカテゴリのみ取得するか'),
});

export const SearchFAQsArgsSchema = z.object({
  query: z.string().min(1).describe('検索クエリ'),
  limit: z.number().int().min(1).max(50).default(10).describe('取得するFAQ数の上限'),
  category_code: z.string().optional().describe('検索対象のカテゴリコード'),
});

export const IncrementViewCountArgsSchema = z.object({
  faq_id: z.string().uuid().describe('FAQ ID'),
});

export const UpdateFAQFeedbackArgsSchema = z.object({
  faq_id: z.string().uuid().describe('FAQ ID'),
  feedback_type: z.enum(['helpful', 'not_helpful']).describe('フィードバックの種類'),
});

// MCP Tool レスポンス型
export interface MCPToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
