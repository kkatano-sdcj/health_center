"""
設定管理サービス
アプリケーションの設定を管理
"""
import os
import json
from typing import Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class ConfigManager:
    """アプリケーション設定を管理するクラス"""
    
    def __init__(self):
        self.config_dir = Path.home() / ".markitdown-web"
        self.config_file = self.config_dir / "config.json"
        self.env_file = self.config_dir / ".env"
        self._ensure_config_dir()
        self._load_config()
    
    def _ensure_config_dir(self):
        """設定ディレクトリが存在することを確認"""
        self.config_dir.mkdir(parents=True, exist_ok=True)
    
    def _load_config(self):
        """設定ファイルを読み込み"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    self.config = json.load(f)
            except Exception as e:
                logger.error(f"設定ファイル読み込みエラー: {e}")
                self.config = self._get_default_config()
        else:
            self.config = self._get_default_config()
            self._save_config()
    
    def _save_config(self):
        """設定をファイルに保存"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"設定ファイル保存エラー: {e}")
    
    def _get_default_config(self) -> dict:
        """デフォルト設定を取得"""
        return {
            "use_api_enhancement": False,
            "max_file_size_mb": 10,
            "allowed_file_types": ["docx", "xlsx", "pdf", "pptx"],
            "cleanup_interval_hours": 24,
            "enable_database": False,
            "firebase_project_id": "",
            "vector_db_path": "./chroma_db"
        }
    
    def get(self, key: str, default=None):
        """設定値を取得"""
        return self.config.get(key, default)
    
    def set(self, key: str, value):
        """設定値を更新"""
        self.config[key] = value
        self._save_config()
    
    def save_api_key(self, api_key: str):
        """APIキーを環境ファイルに保存"""
        try:
            env_content = f"OPENAI_API_KEY={api_key}\n"
            with open(self.env_file, 'w') as f:
                f.write(env_content)
            # 環境変数も更新
            os.environ["OPENAI_API_KEY"] = api_key
            logger.info("APIキーを保存しました")
        except Exception as e:
            logger.error(f"APIキー保存エラー: {e}")
            raise
    
    def load_api_key(self) -> Optional[str]:
        """保存されたAPIキーを読み込み"""
        if self.env_file.exists():
            try:
                with open(self.env_file, 'r') as f:
                    for line in f:
                        if line.startswith("OPENAI_API_KEY="):
                            api_key = line.split("=", 1)[1].strip()
                            os.environ["OPENAI_API_KEY"] = api_key
                            return api_key
            except Exception as e:
                logger.error(f"APIキー読み込みエラー: {e}")
        return None
    
    def get_masked_api_key(self) -> Optional[str]:
        """マスクされたAPIキーを取得"""
        api_key = self.load_api_key()
        if api_key and len(api_key) > 8:
            return f"{api_key[:4]}...{api_key[-4:]}"
        return None
    
    def save_firebase_credentials(self, credentials: dict):
        """Firebase認証情報を保存"""
        try:
            firebase_file = self.config_dir / "firebase_credentials.json"
            with open(firebase_file, 'w', encoding='utf-8') as f:
                json.dump(credentials, f, indent=2)
            logger.info("Firebase認証情報を保存しました")
            return True
        except Exception as e:
            logger.error(f"Firebase認証情報保存エラー: {e}")
            return False
    
    def load_firebase_credentials(self) -> Optional[dict]:
        """Firebase認証情報を読み込み"""
        firebase_file = self.config_dir / "firebase_credentials.json"
        if firebase_file.exists():
            try:
                with open(firebase_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Firebase認証情報読み込みエラー: {e}")
        
        # 環境変数から読み込みを試みる
        firebase_creds_path = os.environ.get('FIREBASE_CREDENTIALS_PATH')
        if firebase_creds_path and os.path.exists(firebase_creds_path):
            try:
                with open(firebase_creds_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Firebase認証情報読み込みエラー（環境変数）: {e}")
        
        return None
    
    def get_database_config(self) -> dict:
        """データベース設定を取得"""
        return {
            "enable_database": self.get("enable_database", False),
            "firebase_project_id": self.get("firebase_project_id", ""),
            "vector_db_path": self.get("vector_db_path", "./chroma_db"),
            "firebase_credentials": self.load_firebase_credentials()
        }