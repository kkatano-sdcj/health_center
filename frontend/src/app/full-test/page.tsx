"use client";

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function FullTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const { progressData, isConnected, clearProgress } = useWebSocket();
  const [currentConversionId, setCurrentConversionId] = useState<string | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : '📝';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  // Monitor WebSocket connection
  useEffect(() => {
    if (isConnected) {
      addLog('WebSocket connected', 'success');
    } else {
      addLog('WebSocket disconnected', 'error');
    }
  }, [isConnected]);

  // Monitor progress data
  useEffect(() => {
    if (Object.keys(progressData).length > 0) {
      addLog(`Progress data updated: ${JSON.stringify(progressData)}`, 'info');
    }
  }, [progressData]);

  // Create test file
  const createTestFile = () => {
    const content = `# Test Document ${Date.now()}
This is a test document created at ${new Date().toISOString()}

## Test Content
- Line 1
- Line 2
- Line 3

This document is used to test the conversion API.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], `test_${Date.now()}.txt`, { type: 'text/plain' });
    setTestFile(file);
    addLog(`Test file created: ${file.name} (${file.size} bytes)`, 'success');
  };

  // Test full conversion flow
  const testConversion = async () => {
    if (!testFile) {
      addLog('Please create a test file first', 'error');
      return;
    }

    setLogs([]);
    setConverting(true);
    setResult(null);
    
    addLog('=== Starting Full Conversion Test ===', 'info');
    addLog(`WebSocket connected: ${isConnected}`, isConnected ? 'success' : 'error');
    
    // Clear previous progress
    if (currentConversionId) {
      clearProgress(currentConversionId);
      setCurrentConversionId(null);
    }

    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('use_ai_mode', 'false');
    formData.append('use_api_enhancement', 'false');

    try {
      addLog('Sending upload request to backend...', 'info');
      addLog(`URL: http://localhost:8000/api/v1/conversion/upload`, 'info');
      addLog(`File: ${testFile.name}`, 'info');

      const response = await fetch('http://localhost:8000/api/v1/conversion/upload', {
        method: 'POST',
        body: formData,
      });

      addLog(`Response status: ${response.status} ${response.statusText}`, 
             response.ok ? 'success' : 'error');

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setCurrentConversionId(data.id);
        
        addLog('=== Conversion Result ===', 'success');
        addLog(`Conversion ID: ${data.id}`, 'info');
        addLog(`Status: ${data.status}`, 'info');
        addLog(`Input file: ${data.input_file}`, 'info');
        addLog(`Output file: ${data.output_file}`, 'info');
        addLog(`Processing time: ${data.processing_time}s`, 'info');
        
        if (data.markdown_content) {
          addLog(`Markdown content: ${data.markdown_content.length} characters`, 'success');
          addLog('--- Content Preview ---', 'info');
          addLog(data.markdown_content.substring(0, 200) + '...', 'info');
        } else {
          addLog('No markdown content in response', 'error');
        }

        // Wait for WebSocket messages
        addLog('Waiting for WebSocket progress messages...', 'info');
        setTimeout(() => {
          const progress = currentConversionId ? progressData[currentConversionId] : null;
          if (progress) {
            addLog(`WebSocket progress received: ${JSON.stringify(progress)}`, 'success');
          } else {
            addLog('No WebSocket progress received', 'error');
          }
        }, 2000);

      } else {
        const errorText = await response.text();
        addLog(`Error response: ${errorText}`, 'error');
      }
    } catch (error) {
      addLog(`Exception: ${error}`, 'error');
      console.error('Full error:', error);
    } finally {
      setConverting(false);
    }
  };

  // Test download
  const testDownload = async () => {
    if (!result || !result.output_file) {
      addLog('No file to download', 'error');
      return;
    }

    try {
      addLog(`Downloading: ${result.output_file}`, 'info');
      
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
        addLog('Download successful', 'success');
      } else {
        addLog(`Download failed: ${response.status}`, 'error');
      }
    } catch (error) {
      addLog(`Download error: ${error}`, 'error');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Full Integration Test</h1>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
        border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px',
        color: isConnected ? '#155724' : '#721c24'
      }}>
        WebSocket Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={createTestFile}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          1. Create Test File
        </button>
        
        <button 
          onClick={testConversion}
          disabled={!testFile || converting}
          style={{
            padding: '10px 20px',
            backgroundColor: testFile && !converting ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: testFile && !converting ? 'pointer' : 'not-allowed',
            marginRight: '10px'
          }}
        >
          2. Test Conversion {converting && '⏳'}
        </button>
        
        <button 
          onClick={testDownload}
          disabled={!result}
          style={{
            padding: '10px 20px',
            backgroundColor: result ? '#ffc107' : '#6c757d',
            color: result ? '#212529' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: result ? 'pointer' : 'not-allowed'
          }}
        >
          3. Test Download
        </button>
      </div>

      {testFile && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
          <strong>Test File:</strong> {testFile.name} ({testFile.size} bytes)
        </div>
      )}

      {currentConversionId && progressData[currentConversionId] && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
          <strong>Progress:</strong>
          <pre>{JSON.stringify(progressData[currentConversionId], null, 2)}</pre>
        </div>
      )}

      {result && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '4px' }}>
          <strong>Result:</strong>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div style={{
        backgroundColor: '#f4f4f4',
        padding: '10px',
        borderRadius: '4px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        <h3>Logs:</h3>
        {logs.map((log, index) => (
          <div key={index} style={{ 
            marginBottom: '5px',
            color: log.includes('❌') ? 'red' : log.includes('✅') ? 'green' : 'black'
          }}>
            {log}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
        <h4>Data Flow Test Steps:</h4>
        <ol>
          <li><strong>Create Test File:</strong> Generate a test text file in memory</li>
          <li><strong>Test Conversion:</strong> Upload file and monitor both HTTP response and WebSocket messages</li>
          <li><strong>Test Download:</strong> Download the converted markdown file</li>
        </ol>
        <p><strong>Expected Results:</strong></p>
        <ul>
          <li>✅ WebSocket should be connected (green status)</li>
          <li>✅ Conversion should return status: completed</li>
          <li>✅ Should receive WebSocket progress messages (0% → 100%)</li>
          <li>✅ Should be able to download the converted file</li>
        </ul>
      </div>
    </div>
  );
}