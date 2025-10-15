import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isConfigured = supabaseUrl && supabaseAnonKey && 
                     supabaseUrl !== 'your_supabase_url_here' && 
                     supabaseAnonKey !== 'your_supabase_anon_key_here';

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface FAQ {
  id: string;
  record_number?: string;
  question_title?: string;
  question_content: string;
  answer_content: string;
  status?: string;
  priority?: string;
  category_id?: string;
  package_name?: string;
  tags?: string[];
  related_ticket_number?: string;
  related_faq_ids?: string[];
  questioner_id?: string;
  assignee_id?: string;
  view_count: number;
  helpful_count: number;
  not_helpful_count?: number;
  question_date?: string;
  response_date?: string;
  resolved_date?: string;
  metadata?: Record<string, unknown>;
  search_vector?: string;
  created_at: string;
  updated_at: string;
  // カテゴリ情報（JOIN）
  faq_categories?: {
    id: string;
    code: string;
    name: string;
    description?: string;
    color_code?: string;
    icon_name?: string;
    is_active: boolean;
    faq_count: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };
}