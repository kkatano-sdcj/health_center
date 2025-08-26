export interface ConversionResult {
  id: string;
  input_file: string;
  output_file?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  processing_time?: number;
  markdown_content?: string;
  created_at: string;
  completed_at?: string;
}

export interface BatchConversionResult {
  total_files: number;
  successful: number;
  failed: number;
  results: ConversionResult[];
}

export interface APISettings {
  api_key?: string;
  is_configured: boolean;
}

export interface APITestResult {
  is_valid: boolean;
  error_message?: string;
}