"use client";

import React, { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function SimpleConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string>('');
  const { progressData, isConnected } = useWebSocket();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    setConverting(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ai_mode', 'false');
    formData.append('use_api_enhancement', 'false');

    try {
      console.log('Uploading file:', file.name);
      
      const response = await fetch('http://localhost:8000/api/v1/conversion/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Conversion result:', data);
        setResult(data);
      } else {
        const errorText = await response.text();
        setError(`変換エラー: ${errorText}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`エラー: ${err}`);
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = async () => {
    if (!result || !result.output_file) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/conversion/download/${result.output_file}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.output_file;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
      setError(`ダウンロードエラー: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">シンプル変換テスト</h1>
        
        {/* WebSocket Status */}
        <div className={`mb-6 p-4 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          WebSocket: {isConnected ? '🟢 接続中' : '🔴 未接続'}
        </div>

        {/* File Input */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">ファイル選択</h2>
          <input 
            type="file" 
            onChange={handleFileChange}
            disabled={converting}
            className="mb-4"
          />
          {file && (
            <p className="text-sm text-gray-600">
              選択されたファイル: {file.name} ({file.size} bytes)
            </p>
          )}
        </div>

        {/* Convert Button */}
        <div className="mb-6">
          <button
            onClick={handleConvert}
            disabled={!file || converting}
            className={`px-6 py-3 rounded-lg font-semibold text-white ${
              !file || converting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            }`}
          >
            {converting ? '変換中...' : 'ファイルを変換'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">変換結果</h2>
            
            <div className="mb-4">
              <p><strong>状態:</strong> {result.status === 'completed' ? '✅ 完了' : result.status}</p>
              <p><strong>入力ファイル:</strong> {result.input_file}</p>
              <p><strong>出力ファイル:</strong> {result.output_file}</p>
              <p><strong>処理時間:</strong> {result.processing_time?.toFixed(3)} 秒</p>
            </div>

            {result.markdown_content && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">変換されたコンテンツ:</h3>
                <div className="bg-gray-100 p-4 rounded max-h-96 overflow-auto">
                  <pre className="whitespace-pre-wrap">{result.markdown_content}</pre>
                </div>
              </div>
            )}

            {result.output_file && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ダウンロード
              </button>
            )}
          </div>
        )}

        {/* Progress Display */}
        {Object.keys(progressData).length > 0 && (
          <div className="mt-6 bg-yellow-50 p-4 rounded">
            <h3 className="font-semibold mb-2">進捗状況:</h3>
            <pre className="text-xs">{JSON.stringify(progressData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}