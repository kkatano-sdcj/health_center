import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './PreviewModal.css';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  fileName: string;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, content, fileName }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      // Show a temporary tooltip instead of alert
      const btn = document.querySelector('.copy-btn') as HTMLElement;
      if (btn) {
        btn.setAttribute('data-copied', 'true');
        setTimeout(() => {
          btn.removeAttribute('data-copied');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="preview-modal-overlay" onClick={handleOverlayClick}>
      <div className="preview-modal">
        <div className="preview-modal-header">
          <h3 className="preview-modal-title">
            <i className="fas fa-file-alt"></i> {fileName}
          </h3>
          <div className="preview-modal-actions">
            <button 
              className="preview-action-btn copy-btn"
              onClick={handleCopyToClipboard}
              title="クリップボードにコピー"
            >
              <span className="btn-icon">📋</span>
            </button>
            <button 
              className="preview-close-btn"
              onClick={onClose}
              title="閉じる"
            >
              <span className="btn-icon">×</span>
            </button>
          </div>
        </div>
        <div className="preview-modal-content">
          <div className="preview-text markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;