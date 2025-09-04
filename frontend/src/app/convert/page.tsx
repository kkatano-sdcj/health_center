"use client";

import React, { useState } from 'react';
import { convertFiles, convertUrl, cancelConversion } from '@/services/api';
import { ConversionResult } from '@/types';
import PreviewModal from '@/components/convert/PreviewModal';
import FileUploader from '@/components/convert/FileUploader';
import ConversionResults from '@/components/convert/ConversionResults';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Navigation } from '@/components/layout/Navigation';
import { AxiosError } from 'axios';

export default function ConvertPage() {
  console.log('ConvertPage mounted');
  const [files, setFiles] = useState<File[]>([]);
  const [converting, setConverting] = useState(false);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [useAiMode, setUseAiMode] = useState(false);
  const { progressData, clearProgress, isConnected } = useWebSocket();
  
  // WebSocket接続状態の監視
  React.useEffect(() => {
    console.log('WebSocket connection status changed:', isConnected);
    if (!isConnected) {
      console.warn('WebSocket is not connected - progress updates may not work');
    }
  }, [isConnected]);
  const [currentConversionId, setCurrentConversionId] = useState<string | null>(null);
  
  // Get the latest progress for current conversion
  const progress = currentConversionId ? progressData[currentConversionId] : null;
  
  // Monitor all progress data changes
  React.useEffect(() => {
    console.log('📊 Progress data changed:', progressData);
    console.log('🔍 Current conversion ID:', currentConversionId);
    console.log('🎯 Current progress for this conversion:', progress);
    
    // If we have progress data but no current conversion ID set, try to find a matching one
    if (Object.keys(progressData).length > 0 && !currentConversionId && converting) {
      console.warn('⚠️ Progress data available but no conversion ID set:', Object.keys(progressData));
      
      // If there's only one progress entry and we're currently converting, assume it's ours
      const progressIds = Object.keys(progressData);
      if (progressIds.length === 1) {
        console.log('🔄 Auto-setting conversion ID from progress data:', progressIds[0]);
        setCurrentConversionId(progressIds[0]);
        
        // Also create a result entry if we don't have one yet for this conversion
        const hasResultForConversion = results.some(r => r.id === progressIds[0]);
        if (!hasResultForConversion) {
          const progressEntry = progressData[progressIds[0]];
          if (progressEntry.file_name) {
            console.log('📝 Creating temporary result entry from progress data');
            const tempResult: ConversionResult = {
              id: progressIds[0],
              input_file: progressEntry.file_name,
              status: 'processing' as const,
              created_at: new Date().toISOString()
            };
            setResults(prevResults => {
              // Double-check to prevent race conditions
              const alreadyExists = prevResults.some(r => r.id === progressIds[0]);
              if (!alreadyExists) {
                return [...prevResults, tempResult];
              }
              return prevResults;
            });
          }
        }
      }
    }
  }, [progressData, currentConversionId, progress, converting, results]);

  // Listen for WebSocket completion events to update the conversion state
  React.useEffect(() => {
    if (progress && progress.type === 'completion' && currentConversionId) {
      console.log('Received completion event for conversion:', currentConversionId);
      
      // Update result status to completed if needed
      setResults(prevResults => {
        const updatedResults = prevResults.map(result => 
          result.id === currentConversionId 
            ? { 
                ...result, 
                status: progress.success ? 'completed' as const : 'failed' as const,
                error_message: progress.success ? undefined : progress.error_message,
                processing_time: progress.processing_time,
                markdown_content: progress.markdown_content || result.markdown_content,
                output_file: progress.output_file || result.output_file
              }
            : result
        );
        console.log('Updated results with completion data:', updatedResults);
        
        // Log the updated content
        const completedResult = updatedResults.find(r => r.id === currentConversionId);
        if (completedResult && completedResult.status === 'completed') {
          console.log('✅ Conversion completed successfully');
          console.log('📄 Markdown content length:', completedResult.markdown_content?.length || 0);
          console.log('📁 Output file:', completedResult.output_file);
          console.log('⏱️ Processing time:', completedResult.processing_time);
        }
        
        return updatedResults;
      });
      
      // Only set converting to false after a brief delay to ensure UI update
      setTimeout(() => {
        setConverting(false);
        console.log('Conversion state set to false');
      }, 100);
    }
  }, [progress, currentConversionId]);

  const handleFilesSelect = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  const handleConvert = async () => {
    console.log('=== handleConvert called ===');
    console.log('Current files state:', files);
    
    if (files.length === 0) {
      console.log('No files selected');
      alert('Please select a file first');
      return;
    }
    
    console.log('=== Starting conversion ===');
    console.log('Files:', files);
    console.log('AI Mode:', useAiMode);
    console.log('WebSocket connected:', isConnected);
    console.log('Current progress data:', progressData);
    
    // WebSocket接続チェック
    if (!isConnected) {
      console.warn('⚠️ WebSocket is not connected - progress updates may not work properly');
      console.warn('Expected WebSocket URL:', process.env.NEXT_PUBLIC_API_URL?.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws' || 'ws://localhost:8000/ws');
    }
    
    setConverting(true);
    // Don't clear previous results - they should persist
    // setResults([]); // Removed to keep previous results
    
    // Clear previous progress if any
    if (currentConversionId) {
      console.log('Clearing previous conversion ID:', currentConversionId);
      clearProgress(currentConversionId);
    }
    
    try {
      console.log('About to call convertFiles API...');
      console.log('Files to convert:', files);
      console.log('Use AI Mode:', useAiMode);
      
      const conversionResults = await convertFiles(files, false, useAiMode);
      
      console.log('=== Conversion API Response ===');
      console.log('Results:', conversionResults);
      
      if (conversionResults && conversionResults.length > 0) {
        console.log('Setting conversion results:', conversionResults);
        console.log('📊 API Response Analysis:');
        conversionResults.forEach((result, index) => {
          console.log(`Result ${index + 1}:`);
          console.log('- ID:', result.id);
          console.log('- Status:', result.status);
          console.log('- Input file:', result.input_file);
          console.log('- Output file:', result.output_file);
          console.log('- Has markdown content:', !!result.markdown_content);
          console.log('- Markdown content length:', result.markdown_content?.length || 0);
          console.log('- Processing time:', result.processing_time);
        });
        
        // 結果を追加（重複を避けるため、既存のIDをチェック）
        setResults(prevResults => {
          const existingIds = new Set(prevResults.map(r => r.id));
          const newResults = conversionResults.filter(r => !existingIds.has(r.id));
          
          if (newResults.length > 0) {
            console.log(`Adding ${newResults.length} new results`);
            return [...prevResults, ...newResults];
          } else {
            console.log('Updating existing results instead of adding duplicates');
            // Update existing results with new data
            return prevResults.map(existingResult => {
              const updatedResult = conversionResults.find(r => r.id === existingResult.id);
              return updatedResult || existingResult;
            });
          }
        });
        const newConversionId = conversionResults[0]?.id;
        console.log('Setting new conversion ID:', newConversionId);
        setCurrentConversionId(newConversionId || null);
        
        // Check if conversion actually completed immediately
        if (conversionResults[0]?.status === 'completed') {
          console.log('✅ Conversion completed immediately');
          // Ensure markdown_content is available for display
          if (conversionResults[0].markdown_content) {
            console.log('📄 Markdown content available:', conversionResults[0].markdown_content.length, 'characters');
          }
          // Set converting to false after a short delay to ensure UI updates
          setTimeout(() => {
            setConverting(false);
            console.log('🔄 Converting state set to false (immediate completion)');
          }, 100);
        } else {
          console.log('⏳ Conversion status:', conversionResults[0]?.status, '- waiting for WebSocket updates');
          // Keep converting state true - will be set to false by WebSocket completion event
          
          // Set a fallback timeout in case WebSocket messages are missed
          setTimeout(() => {
            if (converting) {
              console.warn('⚠️ No WebSocket completion message received within 30 seconds, checking result status...');
              // Optionally poll for result status or show a message to user
            }
          }, 30000);
        }
      } else {
        console.error('No results returned from conversion');
        setConverting(false);
        alert('変換結果が取得できませんでした。');
      }
    } catch (error) {
      console.error('=== Conversion Error ===');
      console.error('Full error object:', error);
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Check if it's an Axios error
      if (error instanceof AxiosError) {
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          console.error('Response headers:', error.response.headers);
        } else if (error.request) {
          console.error('Request was made but no response:', error.request);
        }
      }
      
      alert(`変換エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setConverting(false);
    } finally {
      console.log('handleConvert completed');
    }
  };

  const handleUrlConvert = async () => {
    if (!urlInput.trim()) return;
    
    setConverting(true);
    // Clear previous progress if any
    if (currentConversionId) {
      clearProgress(currentConversionId);
    }
    
    try {
      const result = await convertUrl(urlInput, false, useAiMode);
      // 結果を追加（重複を避けるため、既存のIDをチェック）
      setResults(prevResults => {
        const existingIndex = prevResults.findIndex(r => r.id === result.id);
        if (existingIndex === -1) {
          return [...prevResults, result];
        } else {
          // Update existing result
          const updatedResults = [...prevResults];
          updatedResults[existingIndex] = result;
          return updatedResults;
        }
      });
      setCurrentConversionId(result.id);
    } catch (error) {
      console.error('URL conversion error:', error);
    } finally {
      setConverting(false);
      setUrlInput('');
    }
  };

  const handleCancel = async () => {
    if (currentConversionId) {
      try {
        await cancelConversion(currentConversionId);
        setConverting(false);
        clearProgress(currentConversionId);
      } catch (error) {
        console.error('Failed to cancel conversion:', error);
      }
    }
  };

  const closePreview = () => {
    setPreviewContent(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Document Converter</h1>
          <p className="mt-2 text-gray-600">Convert documents to Markdown format</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upload Files</h2>
          </div>
          
          <FileUploader 
            onFilesSelect={handleFilesSelect} 
            isConverting={converting}
            onConvert={handleConvert}
            useAiMode={useAiMode}
            onAiModeChange={setUseAiMode}
            progress={progress}
            progressData={progressData}
            onCancel={handleCancel}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Convert from URL</h2>
          <div className="flex space-x-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL to convert..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            <button
              onClick={handleUrlConvert}
              disabled={!urlInput.trim() || converting}
              className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Convert URL
            </button>
          </div>
        </div>


        {/* 結果表示 */}
        {results.length > 0 ? (
          <ConversionResults
            results={results}
            onClearAll={() => setResults([])}
          />
        ) : converting ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
              <p className="text-gray-600">ファイルを変換中です...</p>
              {progress && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{progress.current_step}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progress.progress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{progress.progress || 0}%</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
        
        {/* Debug information */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 rounded-lg p-4 mt-4 text-xs">
            <h3 className="font-semibold mb-2">Debug Info</h3>
            <p>WebSocket Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Current Conversion ID: {currentConversionId || 'None'}</p>
            <p>Converting: {converting ? 'Yes' : 'No'}</p>
            <p>Results Count: {results.length}</p>
            <p>Files Selected: {files.length}</p>
            
            {results.length > 0 && (
              <div className="mt-2">
                <h4 className="font-medium">Results:</h4>
                {results.map((result, index) => (
                  <div key={result.id} className="ml-2 mt-1 p-1 bg-gray-200 rounded">
                    <p>#{index + 1}: {result.input_file}</p>
                    <p>Status: {result.status}</p>
                    <p>ID: {result.id}</p>
                    <p>Output: {result.output_file || 'None'}</p>
                    <p>Has Content: {result.markdown_content ? 'Yes' : 'No'}</p>
                    {result.markdown_content && (
                      <p>Content Length: {result.markdown_content.length} chars</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {progress && (
              <div className="mt-2">
                <h4 className="font-medium">Progress:</h4>
                <p>Type: {progress.type}</p>
                <p>Progress: {progress.progress}%</p>
                <p>Status: {progress.status}</p>
                <p>Step: {progress.current_step}</p>
                <p>Success: {progress.success !== undefined ? String(progress.success) : 'undefined'}</p>
              </div>
            )}
            
            <div className="mt-2">
              <h4 className="font-medium">All Progress Data:</h4>
              <pre className="text-xs bg-gray-300 p-1 rounded">
                {JSON.stringify(progressData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {previewContent && (
          <PreviewModal
            isOpen={!!previewContent}
            content={previewContent}
            fileName="preview.md"
            onClose={closePreview}
          />
        )}
      </main>
    </div>
  );
}