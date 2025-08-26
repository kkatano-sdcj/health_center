import os
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore, initialize_app
from google.cloud.firestore_v1 import FieldFilter
import logging

logger = logging.getLogger(__name__)


class FirebaseService:
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.db = None
            self.app = None
            self._initialized = True
    
    def initialize(self, credentials_path: Optional[str] = None, credentials_dict: Optional[Dict] = None):
        try:
            if self.app:
                logger.info("Firebase already initialized")
                return True
            
            if credentials_dict:
                cred = credentials.Certificate(credentials_dict)
            elif credentials_path and os.path.exists(credentials_path):
                cred = credentials.Certificate(credentials_path)
            else:
                cred = credentials.ApplicationDefault()
            
            self.app = initialize_app(cred)
            self.db = firestore.client()
            logger.info("Firebase initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {str(e)}")
            return False
    
    def save_markdown(self, file_id: str, content: str, metadata: Dict[str, Any]) -> bool:
        try:
            if not self.db:
                logger.error("Firebase not initialized")
                return False
            
            doc_data = {
                'file_id': file_id,
                'content': content,
                'metadata': metadata,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            
            self.db.collection('markdown_files').document(file_id).set(doc_data)
            logger.info(f"Saved markdown file {file_id} to Firebase")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save markdown to Firebase: {str(e)}")
            return False
    
    def get_markdown(self, file_id: str) -> Optional[Dict[str, Any]]:
        try:
            if not self.db:
                logger.error("Firebase not initialized")
                return None
            
            doc = self.db.collection('markdown_files').document(file_id).get()
            
            if doc.exists:
                return doc.to_dict()
            else:
                logger.warning(f"Markdown file {file_id} not found")
                return None
                
        except Exception as e:
            logger.error(f"Failed to retrieve markdown from Firebase: {str(e)}")
            return None
    
    def list_markdown_files(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        try:
            if not self.db:
                logger.error("Firebase not initialized")
                return []
            
            query = self.db.collection('markdown_files').order_by('created_at', direction=firestore.Query.DESCENDING)
            query = query.limit(limit).offset(offset)
            
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            logger.error(f"Failed to list markdown files: {str(e)}")
            return []
    
    def delete_markdown(self, file_id: str) -> bool:
        try:
            if not self.db:
                logger.error("Firebase not initialized")
                return False
            
            self.db.collection('markdown_files').document(file_id).delete()
            logger.info(f"Deleted markdown file {file_id} from Firebase")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete markdown from Firebase: {str(e)}")
            return False
    
    def search_by_metadata(self, metadata_key: str, metadata_value: Any) -> List[Dict[str, Any]]:
        try:
            if not self.db:
                logger.error("Firebase not initialized")
                return []
            
            query = self.db.collection('markdown_files').where(
                filter=FieldFilter(f'metadata.{metadata_key}', '==', metadata_value)
            )
            
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
            
        except Exception as e:
            logger.error(f"Failed to search by metadata: {str(e)}")
            return []