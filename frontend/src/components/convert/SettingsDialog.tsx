import React, { useState, useEffect } from 'react';
import './SettingsDialog.css';
import { getAPISettings, configureAPI, testAPIConnection } from '../../services/api';

interface SettingsDialogProps {
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // 現在の設定を読み込み
    getAPISettings().then(settings => {
      if (settings.api_key) {
        setApiKey(settings.api_key);
      }
      setIsConfigured(settings.is_configured);
    }).catch(console.error);
  }, []);

  const handleTest = async () => {
    if (!apiKey || apiKey.includes('...')) {
      setTestResult({ success: false, message: 'APIキーを入力してください' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testAPIConnection(apiKey);
      setTestResult({
        success: result.is_valid,
        message: result.is_valid ? '接続成功！' : result.error_message || '接続に失敗しました'
      });
    } catch (error) {
      setTestResult({ success: false, message: 'テスト中にエラーが発生しました' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey || apiKey.includes('...')) {
      setTestResult({ success: false, message: 'APIキーを入力してください' });
      return;
    }

    setIsSaving(true);
    try {
      await configureAPI(apiKey);
      setTestResult({ success: true, message: '設定を保存しました' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setTestResult({ success: false, message: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-dialog-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>設定</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content">
          <div className="setting-section">
            <h3>OpenAI API設定</h3>
            <p className="setting-description">
              OpenAI APIキーを設定することで、変換結果をAIで強化できます。
            </p>
            
            <div className="api-key-input-group">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="api-key-input"
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>

            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.message}
              </div>
            )}

            <div className="button-group">
              <button
                onClick={handleTest}
                disabled={isTesting || isSaving}
                className="test-button"
              >
                {isTesting ? 'テスト中...' : '接続テスト'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isTesting}
                className="save-button"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>

            {isConfigured && (
              <p className="configured-status">✅ API設定済み</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;