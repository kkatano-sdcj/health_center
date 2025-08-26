import os
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class MockFirebaseService:
    """Firebase機能のモック実装（ローカルファイルシステムを使用）"""
    
    def __init__(self):
        self.storage_dir = "./firebase_storage"
        os.makedirs(self.storage_dir, exist_ok=True)
    
    def save_markdown(self, file_id: str, content: str, metadata: Dict[str, Any]) -> bool:
        """Markdownファイルをローカルストレージに保存"""
        try:
            # メタデータを含むドキュメントを作成
            doc_data = {
                'file_id': file_id,
                'content': content,
                'metadata': metadata,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            # ファイルとして保存
            file_path = os.path.join(self.storage_dir, f"{file_id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(doc_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Saved markdown file {file_id} to mock Firebase storage")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save markdown to mock Firebase: {str(e)}")
            return False
    
    def get_markdown(self, file_id: str) -> Optional[Dict[str, Any]]:
        """保存されたMarkdownファイルを取得"""
        try:
            file_path = os.path.join(self.storage_dir, f"{file_id}.json")
            
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.warning(f"Markdown file {file_id} not found")
                return None
                
        except Exception as e:
            logger.error(f"Failed to retrieve markdown from mock Firebase: {str(e)}")
            return None
    
    def list_markdown_files(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """保存されたMarkdownファイルのリストを取得"""
        try:
            files = []
            json_files = [f for f in os.listdir(self.storage_dir) if f.endswith('.json')]
            
            # 作成日時でソート（新しい順）
            json_files.sort(key=lambda x: os.path.getmtime(os.path.join(self.storage_dir, x)), reverse=True)
            
            # ページネーション
            for file_name in json_files[offset:offset + limit]:
                file_path = os.path.join(self.storage_dir, file_name)
                with open(file_path, 'r', encoding='utf-8') as f:
                    files.append(json.load(f))
            
            return files
            
        except Exception as e:
            logger.error(f"Failed to list markdown files: {str(e)}")
            return []
    
    def delete_markdown(self, file_id: str) -> bool:
        """Markdownファイルを削除"""
        try:
            file_path = os.path.join(self.storage_dir, f"{file_id}.json")
            
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted markdown file {file_id} from mock Firebase")
                return True
            else:
                logger.warning(f"Markdown file {file_id} not found for deletion")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete markdown from mock Firebase: {str(e)}")
            return False