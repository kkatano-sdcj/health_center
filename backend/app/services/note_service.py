"""
Note service for managing notes with Redis caching and PostgreSQL storage
"""
from typing import List, Optional, Dict, Any
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
import redis
from app.models.note import Note, NoteType, NoteStatus
import logging

logger = logging.getLogger(__name__)


class NoteService:
    """Service for managing notes with Redis caching"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host='redis',
            port=6379,
            db=0,
            decode_responses=True
        )
        # Redis key prefixes for different data types
        self.KEY_PREFIX_NOTE = "note:"           # Individual notes
        self.KEY_PREFIX_NOTE_LIST = "notes:list:" # Note lists by type
        self.KEY_PREFIX_NOTE_TAGS = "notes:tags:" # Tag index
        self.CACHE_TTL = 3600  # 1 hour cache
        
    def create_note(
        self, 
        db: Session, 
        title: str,
        content: str,
        note_type: NoteType = NoteType.USER_NOTE,
        summary: Optional[str] = None,
        tags: Optional[List[str]] = None,
        category: Optional[str] = None,
        source_thread_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new note"""
        try:
            note_id = uuid.uuid4()
            
            # Auto-generate summary if not provided
            if not summary:
                summary = content[:200] + "..." if len(content) > 200 else content
            
            note = Note(
                note_id=note_id,
                note_type=note_type,
                title=title,
                content=content,
                summary=summary,
                tags=tags or [],
                category=category,
                source_thread_id=uuid.UUID(source_thread_id) if source_thread_id else None,
                status=NoteStatus.PUBLISHED
            )
            
            db.add(note)
            db.commit()
            db.refresh(note)
            
            # Cache in Redis
            note_data = note.to_dict()
            self._cache_note(str(note_id), note_data)
            
            # Update type-specific list cache
            self._invalidate_list_cache(note_type.value)
            
            # Update tag index
            if tags:
                self._update_tag_index(tags, str(note_id))
            
            logger.info(f"Created note {note_id} of type {note_type.value}")
            return note_data
            
        except Exception as e:
            logger.error(f"Failed to create note: {e}")
            db.rollback()
            raise
    
    def get_note(self, db: Session, note_id: str) -> Optional[Dict[str, Any]]:
        """Get a note by ID"""
        try:
            # Try Redis cache first
            cached = self._get_cached_note(note_id)
            if cached:
                return cached
            
            # Fetch from database
            note = db.query(Note).filter(
                Note.note_id == uuid.UUID(note_id)
            ).first()
            
            if note:
                # Update view count
                note.view_count = (note.view_count or 0) + 1
                note.last_viewed_at = datetime.now(timezone.utc)
                db.commit()
                
                note_data = note.to_dict()
                self._cache_note(note_id, note_data)
                return note_data
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get note: {e}")
            return None
    
    def list_notes(
        self, 
        db: Session,
        note_type: Optional[NoteType] = None,
        status: Optional[NoteStatus] = NoteStatus.PUBLISHED,
        tags: Optional[List[str]] = None,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List notes with filtering"""
        try:
            # Build query
            query = db.query(Note)
            
            # Apply filters
            filters = []
            if note_type:
                filters.append(Note.note_type == note_type)
            if status:
                filters.append(Note.status == status)
            if category:
                filters.append(Note.category == category)
            if tags:
                # Match any of the provided tags
                filters.append(Note.tags.contains(tags))
            
            if filters:
                query = query.filter(and_(*filters))
            
            # Search in title and content
            if search_query:
                search_pattern = f"%{search_query}%"
                query = query.filter(
                    or_(
                        Note.title.ilike(search_pattern),
                        Note.content.ilike(search_pattern),
                        Note.summary.ilike(search_pattern)
                    )
                )
            
            # Order by pinned first, then by updated date
            query = query.order_by(
                desc(Note.is_pinned),
                desc(Note.updated_at)
            )
            
            # Apply pagination
            notes = query.offset(offset).limit(limit).all()
            
            return [note.to_dict() for note in notes]
            
        except Exception as e:
            logger.error(f"Failed to list notes: {e}")
            return []
    
    def update_note(
        self,
        db: Session,
        note_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        summary: Optional[str] = None,
        tags: Optional[List[str]] = None,
        category: Optional[str] = None,
        status: Optional[NoteStatus] = None
    ) -> Optional[Dict[str, Any]]:
        """Update a note"""
        try:
            note = db.query(Note).filter(
                Note.note_id == uuid.UUID(note_id)
            ).first()
            
            if not note:
                return None
            
            # Update fields
            if title is not None:
                note.title = title
            if content is not None:
                note.content = content
                # Auto-update summary if content changed
                if not summary:
                    note.summary = content[:200] + "..." if len(content) > 200 else content
            if summary is not None:
                note.summary = summary
            if tags is not None:
                # Update tag index
                old_tags = note.tags or []
                self._remove_from_tag_index(old_tags, note_id)
                note.tags = tags
                self._update_tag_index(tags, note_id)
            if category is not None:
                note.category = category
            if status is not None:
                note.status = status
            
            note.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            db.refresh(note)
            
            # Update cache
            note_data = note.to_dict()
            self._cache_note(note_id, note_data)
            self._invalidate_list_cache(note.note_type.value)
            
            return note_data
            
        except Exception as e:
            logger.error(f"Failed to update note: {e}")
            db.rollback()
            return None
    
    def delete_note(self, db: Session, note_id: str) -> bool:
        """Delete a note (soft delete by setting status to ARCHIVED)"""
        try:
            note = db.query(Note).filter(
                Note.note_id == uuid.UUID(note_id)
            ).first()
            
            if not note:
                return False
            
            # Soft delete
            note.status = NoteStatus.ARCHIVED
            note.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            
            # Remove from cache
            self._remove_cached_note(note_id)
            self._invalidate_list_cache(note.note_type.value)
            
            # Remove from tag index
            if note.tags:
                self._remove_from_tag_index(note.tags, note_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete note: {e}")
            db.rollback()
            return False
    
    def toggle_pin(self, db: Session, note_id: str) -> Optional[Dict[str, Any]]:
        """Toggle pin status of a note"""
        try:
            note = db.query(Note).filter(
                Note.note_id == uuid.UUID(note_id)
            ).first()
            
            if not note:
                return None
            
            note.is_pinned = not note.is_pinned
            note.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            db.refresh(note)
            
            # Update cache
            note_data = note.to_dict()
            self._cache_note(note_id, note_data)
            self._invalidate_list_cache(note.note_type.value)
            
            return note_data
            
        except Exception as e:
            logger.error(f"Failed to toggle pin: {e}")
            db.rollback()
            return None
    
    def toggle_favorite(self, db: Session, note_id: str) -> Optional[Dict[str, Any]]:
        """Toggle favorite status of a note"""
        try:
            note = db.query(Note).filter(
                Note.note_id == uuid.UUID(note_id)
            ).first()
            
            if not note:
                return None
            
            note.is_favorite = not note.is_favorite
            note.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            db.refresh(note)
            
            # Update cache
            note_data = note.to_dict()
            self._cache_note(note_id, note_data)
            
            return note_data
            
        except Exception as e:
            logger.error(f"Failed to toggle favorite: {e}")
            db.rollback()
            return None
    
    def get_tags(self, db: Session) -> List[Dict[str, Any]]:
        """Get all unique tags with counts"""
        try:
            # Get all notes with tags
            notes = db.query(Note).filter(
                Note.status == NoteStatus.PUBLISHED,
                Note.tags != None
            ).all()
            
            # Count tags
            tag_counts = {}
            for note in notes:
                if note.tags:
                    for tag in note.tags:
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
            
            # Format result
            return [
                {"tag": tag, "count": count}
                for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
            ]
            
        except Exception as e:
            logger.error(f"Failed to get tags: {e}")
            return []
    
    # Redis cache helpers
    def _cache_note(self, note_id: str, note_data: Dict[str, Any]):
        """Cache a note in Redis"""
        try:
            key = f"{self.KEY_PREFIX_NOTE}{note_id}"
            self.redis_client.setex(
                key,
                self.CACHE_TTL,
                json.dumps(note_data, default=str)
            )
        except Exception as e:
            logger.error(f"Failed to cache note: {e}")
    
    def _get_cached_note(self, note_id: str) -> Optional[Dict[str, Any]]:
        """Get a cached note from Redis"""
        try:
            key = f"{self.KEY_PREFIX_NOTE}{note_id}"
            data = self.redis_client.get(key)
            if data:
                # Reset TTL on access
                self.redis_client.expire(key, self.CACHE_TTL)
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get cached note: {e}")
            return None
    
    def _remove_cached_note(self, note_id: str):
        """Remove a note from Redis cache"""
        try:
            key = f"{self.KEY_PREFIX_NOTE}{note_id}"
            self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Failed to remove cached note: {e}")
    
    def _invalidate_list_cache(self, note_type: str):
        """Invalidate list caches for a note type"""
        try:
            pattern = f"{self.KEY_PREFIX_NOTE_LIST}{note_type}:*"
            for key in self.redis_client.scan_iter(pattern):
                self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Failed to invalidate list cache: {e}")
    
    def _update_tag_index(self, tags: List[str], note_id: str):
        """Update tag index in Redis"""
        try:
            for tag in tags:
                key = f"{self.KEY_PREFIX_NOTE_TAGS}{tag}"
                self.redis_client.sadd(key, note_id)
                self.redis_client.expire(key, self.CACHE_TTL * 24)  # Longer TTL for tag index
        except Exception as e:
            logger.error(f"Failed to update tag index: {e}")
    
    def _remove_from_tag_index(self, tags: List[str], note_id: str):
        """Remove note from tag index"""
        try:
            for tag in tags:
                key = f"{self.KEY_PREFIX_NOTE_TAGS}{tag}"
                self.redis_client.srem(key, note_id)
        except Exception as e:
            logger.error(f"Failed to remove from tag index: {e}")