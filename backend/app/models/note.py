"""
Note model for storing conversation summaries and documents
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from datetime import datetime, timezone
import uuid
import enum


class NoteType(enum.Enum):
    """Note types for different purposes"""
    CONVERSATION_SUMMARY = "conversation_summary"  # AI会話の要約
    USER_NOTE = "user_note"                        # ユーザー作成のノート
    DOCUMENT = "document"                           # ドキュメント
    FAQ = "faq"                                     # FAQ項目


class NoteStatus(enum.Enum):
    """Note status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Note(Base):
    """Note model for storing various types of notes and documents"""
    __tablename__ = "notes"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Note identification
    note_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    note_type = Column(SQLEnum(NoteType), nullable=False, default=NoteType.USER_NOTE)
    
    # Content
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text)  # Brief summary for list display
    
    # Metadata
    tags = Column(JSON, default=list)  # タグのリスト
    category = Column(String(100))  # カテゴリー
    source_thread_id = Column(UUID(as_uuid=True))  # 元の会話スレッドID（会話要約の場合）
    
    # Status and visibility
    status = Column(SQLEnum(NoteStatus), nullable=False, default=NoteStatus.PUBLISHED)
    is_pinned = Column(Boolean, default=False)  # ピン留め
    is_favorite = Column(Boolean, default=False)  # お気に入り
    
    # Statistics
    view_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Search optimization
    search_vector = Column(Text)  # Full-text search vector
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": str(self.id),
            "note_id": str(self.note_id),
            "note_type": self.note_type.value if self.note_type else None,
            "title": self.title,
            "content": self.content,
            "summary": self.summary,
            "tags": self.tags or [],
            "category": self.category,
            "source_thread_id": str(self.source_thread_id) if self.source_thread_id else None,
            "status": self.status.value if self.status else None,
            "is_pinned": self.is_pinned,
            "is_favorite": self.is_favorite,
            "view_count": self.view_count,
            "last_viewed_at": self.last_viewed_at.isoformat() if self.last_viewed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }