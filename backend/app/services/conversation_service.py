from typing import List, Optional, Dict, Any
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc
import redis
from app.models.conversation import Conversation
from app.database import get_db
import logging

logger = logging.getLogger(__name__)


class ConversationService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host='redis',
            port=6379,
            db=0,
            decode_responses=True
        )
        self.session_ttl = 3600  # 1 hour for active sessions
        
    def create_thread(self, db: Session, title: Optional[str] = None) -> Dict[str, Any]:
        """新しい会話スレッドを作成"""
        try:
            thread_id = uuid.uuid4()
            conversation = Conversation(
                thread_id=thread_id,
                title=title or f"会話 {datetime.now().strftime('%Y/%m/%d %H:%M')}",
                messages=[],
                message_count=0
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            
            # Redisにセッション情報を保存
            self._save_to_redis(str(thread_id), conversation.to_dict())
            
            return conversation.to_dict()
        except Exception as e:
            logger.error(f"Failed to create thread: {e}")
            db.rollback()
            raise
    
    def get_thread(self, db: Session, thread_id: str) -> Optional[Dict[str, Any]]:
        """スレッドを取得（最新のメッセージを含む）"""
        try:
            # まずRedisから取得を試みる
            cached = self._get_from_redis(thread_id)
            if cached:
                return cached
            
            # RedisになければDBから取得（最新のレコードを取得）
            conversation = db.query(Conversation).filter(
                Conversation.thread_id == uuid.UUID(thread_id),
                Conversation.is_active == True
            ).order_by(desc(Conversation.updated_at)).first()
            
            if conversation:
                data = conversation.to_dict()
                self._save_to_redis(thread_id, data)
                return data
            
            return None
        except Exception as e:
            logger.error(f"Failed to get thread: {e}")
            return None
    
    def list_threads(self, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        """アクティブなスレッド一覧を取得"""
        try:
            # シンプルにアクティブなスレッドを取得
            conversations = db.query(Conversation).filter(
                Conversation.is_active == True
            ).order_by(
                desc(Conversation.updated_at)
            ).limit(limit).all()
            
            # thread_idごとに最新のものだけを保持
            seen_threads = set()
            unique_conversations = []
            for conv in conversations:
                if conv.thread_id not in seen_threads:
                    seen_threads.add(conv.thread_id)
                    unique_conversations.append(conv.to_dict())
            
            return unique_conversations
        except Exception as e:
            logger.error(f"Failed to list threads: {e}")
            return []
    
    def add_message(self, db: Session, thread_id: str, message: Dict[str, Any]) -> Dict[str, Any]:
        """メッセージを追加"""
        try:
            conversation = db.query(Conversation).filter(
                Conversation.thread_id == uuid.UUID(thread_id)
            ).first()
            
            if not conversation:
                # 新規作成
                conversation = Conversation(
                    thread_id=uuid.UUID(thread_id),
                    title=self._generate_title_from_message(message),
                    messages=[message],
                    message_count=1
                )
                db.add(conversation)
            else:
                # 既存に追加 - JSON列の更新のため新しいリストを作成
                messages = list(conversation.messages or [])
                messages.append(message)
                # SQLAlchemyのJSONフィールド更新を確実にするため、新しいオブジェクトを設定
                from sqlalchemy.orm.attributes import flag_modified
                conversation.messages = messages
                flag_modified(conversation, 'messages')
                conversation.message_count = len(messages)
                conversation.updated_at = datetime.now(timezone.utc)
                
                # 最初のユーザーメッセージでタイトルを更新
                if conversation.message_count == 1 and message.get("role") == "user":
                    conversation.title = self._generate_title_from_message(message)
            
            db.commit()
            db.refresh(conversation)
            
            # Redisを更新
            data = conversation.to_dict()
            self._save_to_redis(thread_id, data)
            
            return data
        except Exception as e:
            logger.error(f"Failed to add message: {e}")
            db.rollback()
            raise
    
    def update_thread_title(self, db: Session, thread_id: str, title: str) -> Dict[str, Any]:
        """スレッドのタイトルを更新"""
        try:
            conversation = db.query(Conversation).filter(
                Conversation.thread_id == uuid.UUID(thread_id)
            ).first()
            
            if conversation:
                conversation.title = title
                conversation.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(conversation)
                
                data = conversation.to_dict()
                self._save_to_redis(thread_id, data)
                return data
            
            return None
        except Exception as e:
            logger.error(f"Failed to update thread title: {e}")
            db.rollback()
            raise
    
    def delete_thread(self, db: Session, thread_id: str) -> bool:
        """スレッドを削除（論理削除）"""
        try:
            conversation = db.query(Conversation).filter(
                Conversation.thread_id == uuid.UUID(thread_id)
            ).first()
            
            if conversation:
                conversation.is_active = False
                conversation.updated_at = datetime.now(timezone.utc)
                db.commit()
                
                # Redisから削除
                self._delete_from_redis(thread_id)
                return True
            
            return False
        except Exception as e:
            logger.error(f"Failed to delete thread: {e}")
            db.rollback()
            return False
    
    def clear_all_threads(self, db: Session) -> bool:
        """すべてのスレッドをクリア"""
        try:
            db.query(Conversation).update({"is_active": False})
            db.commit()
            
            # Redisもクリア
            for key in self.redis_client.scan_iter("conversation:*"):
                self.redis_client.delete(key)
            
            return True
        except Exception as e:
            logger.error(f"Failed to clear all threads: {e}")
            db.rollback()
            return False
    
    def _save_to_redis(self, thread_id: str, data: Dict[str, Any]):
        """Redisに保存"""
        try:
            key = f"conversation:{thread_id}"
            self.redis_client.setex(
                key,
                self.session_ttl,
                json.dumps(data, default=str)
            )
        except Exception as e:
            logger.error(f"Failed to save to Redis: {e}")
    
    def _get_from_redis(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """Redisから取得"""
        try:
            key = f"conversation:{thread_id}"
            data = self.redis_client.get(key)
            if data:
                # TTLをリセット
                self.redis_client.expire(key, self.session_ttl)
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get from Redis: {e}")
            return None
    
    def _delete_from_redis(self, thread_id: str):
        """Redisから削除"""
        try:
            key = f"conversation:{thread_id}"
            self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Failed to delete from Redis: {e}")
    
    def _generate_title_from_message(self, message: Dict[str, Any]) -> str:
        """メッセージからタイトルを生成"""
        content = message.get("content", "")
        if len(content) > 30:
            return content[:30] + "..."
        return content if content else "新しい会話"