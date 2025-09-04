/**
 * Jest テストセットアップファイル
 */

import { config } from 'dotenv';

// 環境変数を読み込み
config();

// テスト用の環境変数を設定
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // テスト中はエラーログのみ

// Supabase設定が不足している場合のデフォルト値
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://ivpwniudlxktnruxnmfy.supabase.co';
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.warn('SUPABASE_ANON_KEY が設定されていません。テストをスキップする場合があります。');
  process.env.SUPABASE_ANON_KEY = 'test-key';
}

// テストタイムアウトを延長
jest.setTimeout(30000);

// グローバルなテストフック
beforeAll(() => {
  console.log('Health Center FAQ MCP Server テストを開始します...');
});

afterAll(() => {
  console.log('すべてのテストが完了しました。');
});

// 未処理のPromise拒否をキャッチ
process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromise拒否:', reason);
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  console.error('未処理の例外:', error);
});
