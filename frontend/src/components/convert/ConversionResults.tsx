import React, { useState } from 'react';
import './ConversionResults.css';
import { ConversionResult } from '../../types';
import { downloadFile } from '../../services/api';
import PreviewModal from './PreviewModal';

interface ConversionResultsProps {
  results: ConversionResult[];
  onClearAll?: () => void;
}

const ConversionResults: React.FC<ConversionResultsProps> = ({ results, onClearAll }) => {
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  
  // Debug: Log results to console
  React.useEffect(() => {
    console.log('ConversionResults received:', results);
    console.log('Results count:', results.length);
    results.forEach((result, index) => {
      console.log(`Result ${index}:`, {
        id: result.id,
        status: result.status,
        input_file: result.input_file,
        output_file: result.output_file,
        has_markdown: !!result.markdown_content,
        markdown_length: result.markdown_content?.length || 0
      });
    });
  }, [results]);
  const handleDownload = async (filename: string) => {
    try {
      const blob = await downloadFile(filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      alert('ファイルのダウンロードに失敗しました');
    }
  };

  const handlePreview = async (result: ConversionResult) => {
    console.log('Preview requested for result:', result);
    
    if (result.markdown_content) {
      console.log('Using embedded markdown content');
      setPreviewContent(result.markdown_content);
      setPreviewFileName(result.output_file || 'preview.md');
    } else if (result.output_file) {
      console.log('Downloading file for preview:', result.output_file);
      try {
        const blob = await downloadFile(result.output_file);
        const text = await blob.text();
        setPreviewContent(text);
        setPreviewFileName(result.output_file);
      } catch (error) {
        console.error('Failed to load file for preview:', error);
        alert('プレビューファイルの読み込みに失敗しました');
      }
    } else {
      console.warn('No content available for preview');
      alert('プレビュー可能なコンテンツがありません');
    }
  };

  const closePreview = () => {
    setPreviewContent(null);
    setPreviewFileName('');
  };

  const getStatusIcon = (status: ConversionResult['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'processing':
        return '⏳';
      default:
        return '⏸️';
    }
  };

  const getStatusText = (status: ConversionResult['status']) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'failed':
        return '失敗';
      case 'processing':
        return '処理中';
      default:
        return '待機中';
    }
  };

  return (
    <div className="conversion-results">
      <div className="results-header">
        <h2>変換結果</h2>
        {onClearAll && results.length > 0 && (
          <button
            className="clear-all-button"
            onClick={onClearAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginLeft: 'auto'
            }}
          >
            すべてクリア
          </button>
        )}
      </div>
      <div className="results-summary">
        <p>
          総ファイル数: {results.length} | 
          成功: {results.filter(r => r.status === 'completed').length} | 
          失敗: {results.filter(r => r.status === 'failed').length}
        </p>
      </div>
      <div className="results-list">
        {results.map((result) => (
          <div key={result.id} className={`result-item ${result.status}`}>
            <div className="result-info">
              <span className="status-icon">{getStatusIcon(result.status)}</span>
              <div className="file-info">
                <span className="filename">{result.input_file}</span>
                <span className="status-text">{getStatusText(result.status)}</span>
                {result.processing_time && (
                  <span className="processing-time">
                    処理時間: {result.processing_time.toFixed(2)}秒
                  </span>
                )}
              </div>
            </div>
            {result.status === 'completed' && (
              <div className="result-actions">
                {(result.markdown_content || result.output_file) && (
                  <button
                    className="preview-button"
                    onClick={() => handlePreview(result)}
                  >
                    プレビュー
                  </button>
                )}
                {result.output_file && (
                  <button
                    className="download-button"
                    onClick={() => handleDownload(result.output_file!)}
                  >
                    ダウンロード
                  </button>
                )}
              </div>
            )}
            {result.status === 'failed' && result.error_message && (
              <div className="error-message">{result.error_message}</div>
            )}
          </div>
        ))}
      </div>
      
      {previewContent && (
        <PreviewModal
          isOpen={!!previewContent}
          content={previewContent}
          fileName={previewFileName}
          onClose={closePreview}
        />
      )}
    </div>
  );
};

export default ConversionResults;