"use client";

import React, { useState } from 'react';

export default function DebugTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [converting, setConverting] = useState(false);

  const addLog = (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
    setLogs(prev => [...prev, `[${timestamp}] ${logMessage}`]);
    console.log(logMessage, data || '');
  };

  const testFileUpload = async () => {
    setLogs([]);
    setConverting(true);
    
    try {
      // 1. Create test file
      addLog('Creating test file...');
      const testContent = 'Test file content created at ' + new Date().toISOString();
      const blob = new Blob([testContent], { type: 'text/plain' });
      const testFile = new File([blob], 'debug_test.txt', { type: 'text/plain' });
      addLog('Test file created', { name: testFile.name, size: testFile.size });

      // 2. Create FormData
      addLog('Creating FormData...');
      const formData = new FormData();
      formData.append('file', testFile);
      formData.append('use_ai_mode', 'false');
      formData.append('use_api_enhancement', 'false');
      
      // Log FormData contents
      const formDataEntries: Record<string, string> = {};
      formData.forEach((value, key) => {
        formDataEntries[key] = value instanceof File ? `File: ${value.name}` : value;
      });
      addLog('FormData contents', formDataEntries);

      // 3. Make API call
      const url = 'http://localhost:8000/api/v1/conversion/upload';
      addLog('Making API call to', url);
      
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // Note: Don't set Content-Type header - browser will set it with boundary
      });
      
      const endTime = Date.now();
      addLog('Response received', {
        status: response.status,
        statusText: response.statusText,
        time: `${endTime - startTime}ms`,
        headers: Object.fromEntries(response.headers.entries())
      });

      // 4. Process response
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        addLog('Response content-type', contentType);
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          addLog('✅ SUCCESS - Response data', data);
          
          // Display results
          addLog('=== CONVERSION RESULTS ===');
          addLog('Conversion ID', data.id);
          addLog('Status', data.status);
          addLog('Input file', data.input_file);
          addLog('Output file', data.output_file);
          addLog('Processing time', `${data.processing_time}s`);
          
          if (data.markdown_content) {
            addLog('Markdown content length', `${data.markdown_content.length} chars`);
            addLog('Content preview', data.markdown_content.substring(0, 100) + '...');
          }
        } else {
          const text = await response.text();
          addLog('Response text', text);
        }
      } else {
        // Error response
        const errorText = await response.text();
        addLog('❌ ERROR - Response', errorText);
      }
      
    } catch (error) {
      addLog('❌ EXCEPTION caught', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        addLog('⚠️ Network error - possible causes:');
        addLog('1. Backend not running');
        addLog('2. CORS blocking the request');
        addLog('3. Network connectivity issue');
      }
    } finally {
      setConverting(false);
      addLog('=== Test completed ===');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testFileUpload}
          disabled={converting}
          style={{
            padding: '10px 20px',
            backgroundColor: converting ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: converting ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {converting ? 'Testing...' : 'Run Debug Test'}
        </button>
        
        <button 
          onClick={clearLogs}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Logs
        </button>
      </div>

      <div style={{
        backgroundColor: '#000',
        color: '#0f0',
        padding: '15px',
        borderRadius: '4px',
        maxHeight: '600px',
        overflow: 'auto',
        fontSize: '12px',
        lineHeight: '1.5'
      }}>
        <pre style={{ margin: 0 }}>
          {logs.length === 0 ? 'No logs yet. Click "Run Debug Test" to start.' : logs.join('\n')}
        </pre>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <h3>What this test does:</h3>
        <ol>
          <li>Creates a test file in memory</li>
          <li>Prepares FormData with the file</li>
          <li>Makes a POST request to the backend API</li>
          <li>Logs all steps and responses</li>
        </ol>
        <p><strong>Check the browser console (F12) for additional details.</strong></p>
      </div>
    </div>
  );
}