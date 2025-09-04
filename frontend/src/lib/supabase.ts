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
  question_content: string;  // 実際のカラム名に変更
  answer_content: string;    // 実際のカラム名に変更
  category?: string;
  tags?: string[];
  view_count?: number;
  helpful_count?: number;
  created_at: string;
  updated_at?: string;
}