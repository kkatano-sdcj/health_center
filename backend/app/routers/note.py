"""
Note management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.database import get_db
from app.services.note_service import NoteService
from app.models.note import NoteType, NoteStatus
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["notes"])

note_service = NoteService()


class CreateNoteRequest(BaseModel):
    """Create note request"""
    title: str
    content: str
    note_type: Optional[str] = "user_note"
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    source_thread_id: Optional[str] = None


class UpdateNoteRequest(BaseModel):
    """Update note request"""
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    status: Optional[str] = None


class NoteResponse(BaseModel):
    """Note response model"""
    id: str
    note_id: str
    note_type: str
    title: str
    content: str
    summary: Optional[str]
    tags: List[str]
    category: Optional[str]
    source_thread_id: Optional[str]
    status: str
    is_pinned: bool
    is_favorite: bool
    view_count: int
    last_viewed_at: Optional[str]
    created_at: str
    updated_at: str


@router.post("/notes", response_model=NoteResponse)
async def create_note(
    request: CreateNoteRequest,
    db: Session = Depends(get_db)
):
    """Create a new note"""
    try:
        # Convert string to enum
        note_type = NoteType(request.note_type) if request.note_type else NoteType.USER_NOTE
        
        note = note_service.create_note(
            db=db,
            title=request.title,
            content=request.content,
            note_type=note_type,
            summary=request.summary,
            tags=request.tags,
            category=request.category,
            source_thread_id=request.source_thread_id
        )
        
        return note
        
    except Exception as e:
        logger.error(f"Error creating note: {e}")
        raise HTTPException(status_code=500, detail="Failed to create note")


@router.get("/notes", response_model=List[NoteResponse])
async def list_notes(
    note_type: Optional[str] = None,
    status: Optional[str] = "published",
    tags: Optional[str] = None,  # Comma-separated tags
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List notes with filtering"""
    try:
        # Convert parameters
        note_type_enum = NoteType(note_type) if note_type else None
        status_enum = NoteStatus(status) if status else NoteStatus.PUBLISHED
        tag_list = tags.split(",") if tags else None
        
        notes = note_service.list_notes(
            db=db,
            note_type=note_type_enum,
            status=status_enum,
            tags=tag_list,
            category=category,
            search_query=search,
            limit=limit,
            offset=offset
        )
        
        return notes
        
    except Exception as e:
        logger.error(f"Error listing notes: {e}")
        raise HTTPException(status_code=500, detail="Failed to list notes")


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific note"""
    try:
        note = note_service.get_note(db, note_id)
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return note
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting note: {e}")
        raise HTTPException(status_code=500, detail="Failed to get note")


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    request: UpdateNoteRequest,
    db: Session = Depends(get_db)
):
    """Update a note"""
    try:
        # Convert status string to enum if provided
        status_enum = NoteStatus(request.status) if request.status else None
        
        note = note_service.update_note(
            db=db,
            note_id=note_id,
            title=request.title,
            content=request.content,
            summary=request.summary,
            tags=request.tags,
            category=request.category,
            status=status_enum
        )
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return note
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating note: {e}")
        raise HTTPException(status_code=500, detail="Failed to update note")


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: str,
    db: Session = Depends(get_db)
):
    """Delete a note (soft delete)"""
    try:
        success = note_service.delete_note(db, note_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return {"message": "Note deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting note: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete note")


@router.post("/notes/{note_id}/pin")
async def toggle_pin(
    note_id: str,
    db: Session = Depends(get_db)
):
    """Toggle pin status of a note"""
    try:
        note = note_service.toggle_pin(db, note_id)
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return {"is_pinned": note["is_pinned"], "note_id": note_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling pin: {e}")
        raise HTTPException(status_code=500, detail="Failed to toggle pin")


@router.post("/notes/{note_id}/favorite")
async def toggle_favorite(
    note_id: str,
    db: Session = Depends(get_db)
):
    """Toggle favorite status of a note"""
    try:
        note = note_service.toggle_favorite(db, note_id)
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        return {"is_favorite": note["is_favorite"], "note_id": note_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling favorite: {e}")
        raise HTTPException(status_code=500, detail="Failed to toggle favorite")


@router.get("/notes/tags/all")
async def get_all_tags(
    db: Session = Depends(get_db)
):
    """Get all unique tags with counts"""
    try:
        tags = note_service.get_tags(db)
        return {"tags": tags}
        
    except Exception as e:
        logger.error(f"Error getting tags: {e}")
        raise HTTPException(status_code=500, detail="Failed to get tags")