"use client";

import React, { useState, useEffect, useCallback } from 'react';

export default function WorkingConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  }, []);

  // WebSocket接続
  const connectWebSocket = useCallback(() => {
      const websocket = new WebSocket('ws://localhost:8000/ws');
      
      websocket.onopen = () => {
        setWsConnected(true);
        addLog('✅ WebSocket接続成功');
      };
      
      websocket.onmessage = (event) => {
        if (event.data !== 'pong') {
          try {
            const data = JSON.parse(event.data);
            addLog(`📨 WebSocket: ${data.type} - ${data.progress}%`);
          } catch {
            addLog(`📨 WebSocket: ${event.data}`);
          }
        }
      };
      
      websocket.onerror = (error) => {
        addLog(`❌ WebSocketエラー: ${error}`);
      };
      
      websocket.onclose = () => {
        setWsConnected(false);
        addLog('WebSocket切断');
        // 3秒後に再接続
        setTimeout(connectWebSocket, 3000);
      };
      
      setWs(websocket);
    }, [addLog]);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket, ws]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError('');
      setResult(null);
      addLog(`ファイル選択: ${selectedFile.name} (${selectedFile.size} bytes)`);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    setLogs([]); // ログをクリア
    setConverting(true);
    setError('');
    setResult(null);

    addLog('=== 変換開始 ===');
    addLog(`ファイル: ${file.name}`);
    addLog(`サイズ: ${file.size} bytes`);
    addLog(`タイプ: ${file.type}`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ai_mode', 'false');
    formData.append('use_api_enhancement', 'false');

    try {
      const url = '/api/v1/conversion/upload';
      addLog(`API呼び出し: POST ${url}`);
      
      const startTime = Date.now();
      
      // fetchを使用してAPIを呼び出し
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // headers は設定しない（ブラウザが自動的に設定）
      });
      
      const endTime = Date.now();
      addLog(`レスポンス受信: ${endTime - startTime}ms`);
      addLog(`ステータス: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        addLog('✅ 変換成功！');
        addLog(`ID: ${data.id}`);
        addLog(`状態: ${data.status}`);
        addLog(`処理時間: ${data.processing_time}秒`);
        
        setResult(data);
        
        if (data.markdown_content) {
          addLog(`コンテンツ長: ${data.markdown_content.length}文字`);
        }
      } else {
        const errorText = await response.text();
        addLog(`❌ エラー: ${errorText}`);
        setError(`変換エラー: ${response.status}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorStack = err instanceof Error ? err.stack : 'No stack trace';
      addLog(`❌ 例外エラー: ${errorMessage}`);
      addLog(`エラー詳細: ${errorStack}`);
      setError(`エラー: ${errorMessage}`);
      
      // ネットワークエラーの詳細
      if (errorMessage.includes('fetch')) {
        addLog('⚠️ ネットワークエラーの可能性:');
        addLog('1. バックエンドが起動していない');
        addLog('2. CORSでブロックされている');
        addLog('3. ネットワーク接続の問題');
      }
    } finally {
      setConverting(false);
      addLog('=== 処理終了 ===');
    }
  };

  const handleDownload = async () => {
    if (!result || !result.output_file) return;

    try {
      addLog(`ダウンロード開始: ${result.output_file}`);
      const response = await fetch(`/api/v1/conversion/download/${result.output_file}`);
      
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
        addLog('✅ ダウンロード成功');
      } else {
        addLog(`❌ ダウンロード失敗: ${response.status}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`❌ ダウンロードエラー: ${errorMessage}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ color: '#333' }}>動作確認用変換ページ</h1>
      
      {/* ステータス表示 */}
      <div style={{
        padding: '10px',
        marginBottom: '20px',
        backgroundColor: wsConnected ? '#d4edda' : '#f8d7da',
        border: `1px solid ${wsConnected ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px',
        color: wsConnected ? '#155724' : '#721c24'
      }}>
        WebSocket: {wsConnected ? '🟢 接続中' : '🔴 未接続'}
      </div>

      {/* ファイル選択 */}
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          onChange={handleFileChange}
          disabled={converting}
          style={{ marginBottom: '10px' }}
        />
        {file && (
          <div style={{ color: '#666', fontSize: '14px' }}>
            選択: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </div>
        )}
      </div>

      {/* 変換ボタン */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleConvert}
          disabled={!file || converting}
          style={{
            padding: '10px 20px',
            backgroundColor: !file || converting ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !file || converting ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {converting ? '変換中...' : 'ファイル変換'}
        </button>
        
        {result && result.output_file && (
          <button
            onClick={handleDownload}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ダウンロード
          </button>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '4px',
          color: '#0c5460'
        }}>
          <h3 style={{ marginTop: 0 }}>変換結果</h3>
          <div style={{ fontSize: '14px' }}>
            <p>📌 状態: {result.status === 'completed' ? '✅ 完了' : result.status}</p>
            <p>📄 入力: {result.input_file}</p>
            <p>💾 出力: {result.output_file}</p>
            <p>⏱️ 処理時間: {result.processing_time?.toFixed(3)} 秒</p>
          </div>
          
          {result.markdown_content && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                変換されたコンテンツを表示 ({result.markdown_content.length} 文字)
              </summary>
              <pre style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '12px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {result.markdown_content}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* ログ表示 */}
      <div style={{
        padding: '15px',
        backgroundColor: '#2b2b2b',
        color: '#00ff00',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxHeight: '300px',
        overflow: 'auto'
      }}>
        <div style={{ marginBottom: '5px', color: '#888' }}>📋 実行ログ:</div>
        {logs.length === 0 ? (
          <div style={{ color: '#888' }}>ログはここに表示されます...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ 
              color: log.includes('✅') ? '#00ff00' : 
                     log.includes('❌') ? '#ff4444' : 
                     log.includes('📨') ? '#00aaff' : '#aaa'
            }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}