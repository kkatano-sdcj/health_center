"use client";

import React, { useState } from 'react';

export default function ApiTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const addResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, `[${timestamp}] ${result}`]);
  };

  const testConnection = async () => {
    setTestResults([]);
    addResult('Starting API connection test...');
    
    // Test 1: Check if backend is reachable
    try {
      addResult('Test 1: Checking backend health...');
      const healthResponse = await fetch('http://localhost:8000/health');
      const healthData = await healthResponse.json();
      addResult(`✅ Backend health check: ${JSON.stringify(healthData)}`);
    } catch (error) {
      addResult(`❌ Backend health check failed: ${error}`);
    }

    // Test 2: Check API formats endpoint
    try {
      addResult('Test 2: Checking supported formats...');
      const formatsResponse = await fetch('http://localhost:8000/api/v1/conversion/supported-formats');
      const formatsData = await formatsResponse.json();
      addResult(`✅ Supported formats: ${formatsData.formats.length} formats`);
    } catch (error) {
      addResult(`❌ Formats check failed: ${error}`);
    }

    // Test 3: Test WebSocket connection
    try {
      addResult('Test 3: Testing WebSocket...');
      const ws = new WebSocket('ws://localhost:8000/ws');
      
      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          addResult('✅ WebSocket connected');
          ws.send('ping');
        };
        
        ws.onmessage = (event) => {
          addResult(`✅ WebSocket response: ${event.data}`);
          ws.close();
          resolve(true);
        };
        
        ws.onerror = (error) => {
          addResult(`❌ WebSocket error: ${error}`);
          reject(error);
        };
        
        setTimeout(() => {
          ws.close();
          resolve(false);
        }, 3000);
      });
    } catch (error) {
      addResult(`❌ WebSocket test failed: ${error}`);
    }
  };

  const testFileUpload = async () => {
    if (!file) {
      addResult('❌ Please select a file first');
      return;
    }

    addResult('Starting file upload test...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ai_mode', 'false');
    formData.append('use_api_enhancement', 'false');

    try {
      addResult(`Uploading file: ${file.name}`);
      addResult(`File size: ${file.size} bytes`);
      addResult(`File type: ${file.type}`);
      
      const response = await fetch('http://localhost:8000/api/v1/conversion/upload', {
        method: 'POST',
        body: formData,
      });

      addResult(`Response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult('✅ Upload successful!');
        addResult(`Conversion ID: ${data.id}`);
        addResult(`Status: ${data.status}`);
        addResult(`Output file: ${data.output_file}`);
        addResult(`Processing time: ${data.processing_time}s`);
        if (data.markdown_content) {
          addResult(`Content length: ${data.markdown_content.length} chars`);
          addResult('--- MARKDOWN CONTENT ---');
          addResult(data.markdown_content.substring(0, 500) + '...');
        }
      } else {
        const errorText = await response.text();
        addResult(`❌ Upload failed: ${errorText}`);
      }
    } catch (error) {
      addResult(`❌ Upload error: ${error}`);
      console.error('Full error:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      addResult(`File selected: ${e.target.files[0].name}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Connection Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testConnection}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test API Connection
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>File Upload Test</h3>
        <input 
          type="file" 
          onChange={handleFileChange}
          style={{ marginBottom: '10px' }}
        />
        <br />
        <button 
          onClick={testFileUpload}
          disabled={!file}
          style={{
            padding: '10px 20px',
            backgroundColor: file ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: file ? 'pointer' : 'not-allowed'
          }}
        >
          Test File Upload
        </button>
      </div>

      <div style={{
        backgroundColor: '#f4f4f4',
        padding: '10px',
        borderRadius: '4px',
        maxHeight: '500px',
        overflow: 'auto'
      }}>
        <h3>Test Results:</h3>
        {testResults.length === 0 ? (
          <p>No tests run yet</p>
        ) : (
          testResults.map((result, index) => (
            <div key={index} style={{ 
              marginBottom: '5px',
              color: result.includes('❌') ? 'red' : result.includes('✅') ? 'green' : 'black'
            }}>
              {result}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
        <h4>Instructions:</h4>
        <ol>
          <li>Click &quot;Test API Connection&quot; to verify backend connectivity</li>
          <li>Select a file and click &quot;Test File Upload&quot; to test conversion</li>
          <li>Check the results above for any errors</li>
        </ol>
        <p><strong>Expected results:</strong></p>
        <ul>
          <li>✅ Backend health check should return {`{"status": "healthy"}`}</li>
          <li>✅ WebSocket should connect and respond to ping</li>
          <li>✅ File upload should return conversion result with markdown content</li>
        </ul>
      </div>
    </div>
  );
}