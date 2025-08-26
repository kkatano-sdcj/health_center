import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileUploader.css';
import { getSupportedFormats } from '@/services/api';
import ProgressBar from './ProgressBar';
import MultiFileProgressBar from './MultiFileProgressBar';

interface FileUploaderProps {
  onFilesSelect: (files: File[]) => void;
  isConverting?: boolean;
  onConvert?: () => void;
  useAiMode?: boolean;
  onAiModeChange?: (enabled: boolean) => void;
  progress?: any;
  progressData?: Record<string, any>;  // 複数ファイルの進捗データ
  onCancel?: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFilesSelect, 
  isConverting = false, 
  onConvert,
  useAiMode = false,
  onAiModeChange,
  progress,
  progressData,
  onCancel 
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlMode, setUrlMode] = useState<boolean>(false);

  useEffect(() => {
    // サポートされているファイル形式を取得
    getSupportedFormats().then(setSupportedFormats).catch(console.error);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // 既存のファイルに新しいファイルを追加
    setSelectedFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
    setUrlMode(false);
  }, []);

  // MIMEタイプのマッピング
  const mimeTypeMap: Record<string, string[]> = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/bmp': ['.bmp'],
    'image/webp': ['.webp'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/mp4': ['.m4a'],
    'audio/flac': ['.flac'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    'application/xml': ['.xml'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/zip': ['.zip'],
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: mimeTypeMap,
    disabled: false,
    multiple: true,  // 複数ファイルの選択を明示的に許可
  });

  useEffect(() => {
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles);
    }
  }, [selectedFiles, onFilesSelect]);

  // 変換が完了したらファイルリストをクリア
  useEffect(() => {
    if (!isConverting && selectedFiles.length > 0) {
      // progressDataかprogressで完了状態を確認
      const hasCompleted = progress?.status === 'completed' || 
                          (progressData && Object.values(progressData).some((p: any) => p.status === 'completed'));
      
      if (hasCompleted) {
        setSelectedFiles([]);
        console.log('Cleared selected files after conversion completion');
      }
    }
  }, [isConverting, progress, progressData, selectedFiles.length]);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      // Create a pseudo-file for URL
      const urlFile = new File([urlInput], 'url.txt', { type: 'text/plain' });
      (urlFile as any).isUrl = true;
      (urlFile as any).url = urlInput;
      onFilesSelect([urlFile]);
      setUrlInput('');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleConvert = () => {
    console.log('FileUploader handleConvert called');
    console.log('selectedFiles:', selectedFiles);
    console.log('onConvert function exists:', !!onConvert);
    if (onConvert && selectedFiles.length > 0) {
      console.log('Calling onConvert function');
      onConvert();
    } else {
      console.log('Not calling onConvert:', {
        hasOnConvert: !!onConvert,
        filesCount: selectedFiles.length
      });
    }
  };

  return (
    <div className="file-uploader">
      <div className="upload-header">
        <div className="upload-tabs">
          <button 
            className={`tab ${!urlMode ? 'active' : ''}`}
            onClick={() => setUrlMode(false)}
          >
            ファイルアップロード
          </button>
          <button 
            className={`tab ${urlMode ? 'active' : ''}`}
            onClick={() => setUrlMode(true)}
          >
            YouTube変換
          </button>
        </div>
        
        <div className="conversion-mode">
          <label className="mode-toggle">
            <input
              type="checkbox"
              checked={useAiMode}
              onChange={(e) => onAiModeChange?.(e.target.checked)}
              disabled={isConverting}
            />
            <span className="toggle-slider"></span>
            <span className="mode-label">
              {useAiMode ? 'AI変換モード' : '通常モード'}
            </span>
          </label>
          {useAiMode && (
            <div className="ai-mode-info">
              <span className="info-icon">ℹ️</span>
              <span className="info-text">画像内のテキストも抽出します</span>
            </div>
          )}
        </div>
      </div>

      {!urlMode ? (
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''} ${isConverting ? 'disabled' : ''}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>ファイルをここにドロップしてください...</p>
          ) : (
            <div>
              <p>ファイルをドラッグ＆ドロップ、またはクリックして選択</p>
              <p className="info-text">複数ファイルを選択できます</p>
              <p className="supported-formats">
                対応形式: {supportedFormats.map(f => `.${f}`).join(', ')}
              </p>
              <p className="supported-formats">
                画像・音声・CSV・JSON・XML・ZIPファイルも対応
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="url-input-container">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="YouTube URLを入力してください"
            className="url-input"
            disabled={isConverting}
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim() || isConverting}
            className="convert-button"
          >
            YouTubeを変換
          </button>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h3>選択されたファイル ({selectedFiles.length}個):</h3>
          <ul>
            {selectedFiles.map((file, index) => (
              <li key={index}>
                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button
                  onClick={() => removeFile(index)}
                  disabled={isConverting}
                  className="remove-button"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          
          {!isConverting && (
            <div className="mt-4 flex space-x-4">
              <button
                onClick={handleConvert}
                disabled={selectedFiles.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {selectedFiles.length === 1 ? 'ファイルを変換' : `${selectedFiles.length}個のファイルを変換`}
              </button>
            </div>
          )}
          
          {isConverting && (
            <div className="file-progress-container">
              {selectedFiles.length > 1 && progressData ? (
                <MultiFileProgressBar
                  files={selectedFiles}
                  progressData={progressData}
                  onCancel={onCancel}
                />
              ) : progress ? (
                <ProgressBar
                  progress={progress.progress || 0}
                  status={progress.status || 'processing'}
                  fileName={progress.file_name}
                  currentStep={progress.current_step}
                  onCancel={onCancel}
                  showCancelButton={true}
                />
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;