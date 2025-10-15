import React from 'react';
import './ProgressBar.css';

interface FileProgress {
  fileName: string;
  progress: number;
  status: 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  error?: string;
}

interface MultiFileProgressBarProps {
  files: File[];
  progressData: Record<string, Record<string, unknown>>;
  onCancel?: (fileId: string) => void;
}

const MultiFileProgressBar: React.FC<MultiFileProgressBarProps> = ({
  files,
  progressData,
  onCancel
}) => {
  const getFileProgress = (file: File): FileProgress => {
    // progressDataから該当ファイルの進捗を探す
    const fileProgressKey = Object.keys(progressData).find(key => 
      progressData[key]?.file_name === file.name
    );
    
    if (fileProgressKey && progressData[fileProgressKey]) {
      const data = progressData[fileProgressKey] as Record<string, unknown>;
      return {
        fileName: file.name,
        progress: (data.progress as number) || 0,
        status: (data.status as string) || 'waiting',
        currentStep: data.current_step as string,
        error: data.error_message as string | undefined
      };
    }
    
    return {
      fileName: file.name,
      progress: 0,
      status: 'waiting',
      currentStep: '待機中...'
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'processing':
        return '⏳';
      case 'cancelled':
        return '🚫';
      default:
        return '⏸️';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'cancelled':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div className="multi-file-progress">
      <h3 className="text-lg font-semibold mb-4">変換進捗</h3>
      <div className="space-y-4">
        {files.map((file) => {
          const progress = getFileProgress(file);
          return (
            <div key={file.name} className="file-progress-item">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <span>{getStatusIcon(progress.status)}</span>
                  <span className="font-medium">{progress.fileName}</span>
                  <span className="text-sm text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                {progress.status === 'processing' && onCancel && (
                  <button
                    onClick={() => {
                      const fileProgressKey = Object.keys(progressData).find(key => 
                        progressData[key]?.file_name === file.name
                      );
                      if (fileProgressKey) {
                        onCancel(fileProgressKey);
                      }
                    }}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    キャンセル
                  </button>
                )}
              </div>
              
              <div className="relative w-full h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full transition-all duration-300"
                  style={{
                    width: `${progress.progress}%`,
                    backgroundColor: getProgressColor(progress.status)
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                  {progress.status === 'completed' ? '完了' : 
                   progress.status === 'failed' ? 'エラー' :
                   progress.status === 'cancelled' ? 'キャンセル済み' :
                   progress.status === 'waiting' ? '待機中' :
                   `${progress.progress}%`}
                </div>
              </div>
              
              {progress.currentStep && progress.status === 'processing' && (
                <p className="mt-1 text-sm text-gray-600">{progress.currentStep}</p>
              )}
              
              {progress.error && (
                <p className="mt-1 text-sm text-red-600">{progress.error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MultiFileProgressBar;