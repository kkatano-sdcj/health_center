import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  progress: number;
  status?: 'processing' | 'completed' | 'error' | 'cancelled';
  fileName?: string;
  currentStep?: string;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  status = 'processing', 
  fileName,
  currentStep,
  onCancel,
  showCancelButton = false
}) => {
  const getStatusIcon = () => {
    switch(status) {
      case 'completed':
        return <i className="fas fa-check-circle"></i>;
      case 'error':
        return <i className="fas fa-exclamation-circle"></i>;
      case 'cancelled':
        return <i className="fas fa-times-circle"></i>;
      default:
        return <i className="fas fa-spinner fa-spin"></i>;
    }
  };

  const getStatusColor = () => {
    switch(status) {
      case 'completed':
        return 'progress-success';
      case 'error':
        return 'progress-error';
      case 'cancelled':
        return 'progress-cancelled';
      default:
        return 'progress-active';
    }
  };

  return (
    <div className={`progress-container ${getStatusColor()}`}>
      <div className="progress-header">
        <div className="progress-info">
          {getStatusIcon()}
          {fileName && <span className="progress-filename">{fileName}</span>}
        </div>
        <div className="progress-actions">
          <span className="progress-percentage">{Math.round(progress)}%</span>
          {showCancelButton && status === 'processing' && onCancel && (
            <button 
              className="progress-cancel-button"
              onClick={onCancel}
              title="変換をキャンセル"
            >
              <i className="fas fa-times"></i> キャンセル
            </button>
          )}
        </div>
      </div>
      
      <div className="progress-bar-wrapper">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progress}%` }}
        >
          <div className="progress-bar-glow"></div>
        </div>
      </div>
      
      {currentStep && (
        <div className="progress-step">
          <span className="progress-step-text">{currentStep}</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;