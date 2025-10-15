"use client";

import React, { useState, useEffect } from 'react';

export default function TestDirectPage() {
  const [status, setStatus] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testDirectUpload = async () => {
    setLogs([]);
    addLog('Starting direct upload test...');
    
    // Create a test file
    const testContent = 'This is a test file content for conversion';
    const blob = new Blob([testContent], { type: 'text/plain' });
    const testFile = new File([blob], 'test.txt', { type: 'text/plain' });
    
    addLog(`Created test file: ${testFile.name}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', testFile);
    formData.append('use_ai_mode', 'false');
    formData.append('use_api_enhancement', 'false');
    
    addLog('FormData created');
    
    try {
      addLog('Sending request to backend...');
      const response = await fetch('http://localhost:8000/api/v1/conversion/upload', {
        method: 'POST',
        body: formData,
      });
      
      addLog(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`Error response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      addLog(`Success! Conversion ID: ${data.id}`);
      addLog(`Status: ${data.status}`);
      addLog(`Output file: ${data.output_file}`);
      
      setStatus('Success! File converted successfully.');
      
      // Display the markdown content if available
      if (data.markdown_content) {
        addLog('Markdown content received:');
        addLog(data.markdown_content);
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error: ${errorMessage}`);
      setStatus(`Error: ${errorMessage}`);
    }
  };

  useEffect(() => {
    // Test WebSocket connection
    addLog('Testing WebSocket connection...');
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
      addLog('WebSocket connected successfully');
      ws.send('ping');
    };
    
    ws.onmessage = (event) => {
      addLog(`WebSocket message: ${event.data}`);
    };
    
    ws.onerror = (error) => {
      addLog(`WebSocket error: ${error}`);
    };
    
    ws.onclose = () => {
      addLog('WebSocket disconnected');
    };
    
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Direct API Test</h1>
      
      <button 
        onClick={testDirectUpload}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Test Direct Upload
      </button>
      
      {status && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: status.includes('Error') ? '#ffdddd' : '#ddffdd',
          border: '1px solid ' + (status.includes('Error') ? '#ff0000' : '#00ff00'),
          borderRadius: '4px'
        }}>
          {status}
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
          <div key={index} style={{ marginBottom: '5px' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}