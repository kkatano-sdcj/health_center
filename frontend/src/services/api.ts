import axios from 'axios';
import { ConversionResult, BatchConversionResult, APISettings, APITestResult } from '../types';

interface UrlFile {
  isUrl: true;
  url: string;
  name?: string;
}

type FileOrUrl = File | UrlFile;

// Use relative URLs to leverage Next.js rewrites
const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10分のタイムアウト
  maxContentLength: 100 * 1024 * 1024, // 100MB
  maxBodyLength: 100 * 1024 * 1024, // 100MB
});

// ファイル変換API
export const convertFiles = async (files: FileOrUrl[], useApiEnhancement: boolean = false, useAiMode: boolean = false): Promise<ConversionResult[]> => {
  console.log('=== convertFiles API function called ===');
  console.log('Files:', files);
  console.log('File count:', files.length);
  console.log('Use API Enhancement:', useApiEnhancement);
  console.log('Use AI Mode:', useAiMode);
  console.log('API Base URL:', API_BASE_URL);
  
  // Check if any file is actually a URL
  const urlFiles = files.filter((file): file is UrlFile => 'isUrl' in file && file.isUrl);
  const regularFiles = files.filter((file): file is File => file instanceof File);
  
  console.log('URL files:', urlFiles);
  console.log('Regular files:', regularFiles);
  
  const results: ConversionResult[] = [];
  
  // Convert URLs
  for (const urlFile of urlFiles) {
    try {
      const response = await api.post<ConversionResult>(
        useAiMode ? '/api/v1/conversion/convert-youtube-enhanced' : '/api/v1/conversion/convert-url',
        useAiMode
          ? { url: urlFile.url, use_ai_mode: true }
          : { url: urlFile.url, use_api_enhancement: false }
      );
      results.push(response.data);
    } catch (error) {
      console.error('URL conversion error:', error);
      throw error;
    }
  }
  
  // Convert regular files
  if (regularFiles.length > 0) {
    // Use standard upload endpoint with AI mode parameter
    if (regularFiles.length === 1) {
      // Single file upload
      const formData = new FormData();
      formData.append('file', regularFiles[0]);
      formData.append('use_ai_mode', String(useAiMode));
      formData.append('use_api_enhancement', String(useApiEnhancement));
      
      console.log('=== Sending single file upload request ===');
      console.log('File name:', regularFiles[0].name);
      console.log('File size:', regularFiles[0].size);
      console.log('File type:', regularFiles[0].type);
      console.log('FormData contents:', {
        file: regularFiles[0].name,
        use_ai_mode: String(useAiMode),
        use_api_enhancement: String(useApiEnhancement)
      });
      console.log('Request URL:', `${API_BASE_URL}/api/v1/conversion/upload`);
      
      try {
        console.log('Making POST request...');
        const response = await api.post<ConversionResult>(
          '/api/v1/conversion/upload',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        console.log('=== Upload response received ===');
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        console.log('Response data structure:');
        console.log('- ID:', response.data.id);
        console.log('- Status:', response.data.status);
        console.log('- Input file:', response.data.input_file);
        console.log('- Output file:', response.data.output_file);
        console.log('- Has markdown content:', !!response.data.markdown_content);
        console.log('- Markdown content length:', response.data.markdown_content?.length || 0);
        console.log('- Processing time:', response.data.processing_time);
        results.push(response.data);
      } catch (error) {
        console.error('=== Upload error occurred ===');
        console.error('Full error:', error);
        if (axios.isAxiosError(error)) {
          console.error('Axios error details:');
          console.error('Response data:', error.response?.data);
          console.error('Response status:', error.response?.status);
          console.error('Request URL:', error.config?.url);
          console.error('Request method:', error.config?.method);
          console.error('Request headers:', error.config?.headers);
        }
        throw error;
      }
    } else {
      // Batch upload
      const formData = new FormData();
      regularFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('use_ai_mode', String(useAiMode));

      try {
        const response = await api.post<BatchConversionResult>(
          '/api/v1/conversion/batch',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        results.push(...response.data.results);
      } catch (error) {
        console.error('Batch upload error:', error);
        if (axios.isAxiosError(error)) {
          console.error('Response data:', error.response?.data);
          console.error('Response status:', error.response?.status);
        }
        throw error;
      }
    }
  }

  console.log('Final results:', results);
  return results;
};

// URL変換API
export const convertUrl = async (url: string, useApiEnhancement: boolean = false, useAiMode: boolean = false): Promise<ConversionResult> => {
  const endpoint = useAiMode 
    ? '/api/v1/conversion/convert-youtube-enhanced'
    : '/api/v1/conversion/convert-url';
  
  const params = useAiMode
    ? { url, use_ai_mode: true }
    : { url, use_api_enhancement: useApiEnhancement };
  
  const response = await api.post<ConversionResult>(endpoint, params);
  return response.data;
};

// ファイルダウンロード
export const downloadFile = async (filename: string): Promise<Blob> => {
  const response = await api.get(`/api/v1/conversion/download/${filename}`, {
    responseType: 'blob',
  });
  return response.data;
};

// サポートされているファイル形式を取得
export const getSupportedFormats = async (): Promise<string[]> => {
  const response = await api.get<{ formats: string[] }>('/api/v1/conversion/supported-formats');
  return response.data.formats;
};

// API設定を取得
export const getAPISettings = async (): Promise<APISettings> => {
  const response = await api.get<APISettings>('/api/v1/settings/api');
  return response.data;
};

// APIキーを設定
export const configureAPI = async (apiKey: string): Promise<APISettings> => {
  const response = await api.post<APISettings>('/api/v1/settings/api/configure', {
    api_key: apiKey,
  });
  return response.data;
};

// API接続をテスト
export const testAPIConnection = async (apiKey: string): Promise<APITestResult> => {
  const response = await api.post<APITestResult>('/api/v1/settings/api/test', {
    api_key: apiKey,
  });
  return response.data;
};

// 変換をキャンセル
export const cancelConversion = async (conversionId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>(`/api/v1/conversion/cancel/${conversionId}`);
  return response.data;
};

// ストレージAPI - 変換済みファイルの管理
export const listStorageFiles = async (): Promise<{ files: StorageFile[]; total: number }> => {
  const response = await api.get<{ files: StorageFile[]; total: number }>('/api/v1/conversion/storage/list');
  return response.data;
};

export const getStorageFileContent = async (filename: string): Promise<StorageFileContent> => {
  const response = await api.get<StorageFileContent>(`/api/v1/conversion/storage/file/${filename}`);
  return response.data;
};

export const deleteStorageFile = async (filename: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/api/v1/conversion/storage/file/${filename}`);
  return response.data;
};

// Types for storage
export interface StorageFile {
  filename: string;
  size: number;
  modified: string;
  preview: string;
  size_formatted: string;
}

export interface StorageFileContent {
  filename: string;
  content: string;
  size: number;
  modified: string;
  size_formatted: string;
}