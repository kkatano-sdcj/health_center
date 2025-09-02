from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.database import get_db
from app.services.conversation_service import ConversationService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversation"])

conversation_service = ConversationService()


class CreateThreadRequest(BaseModel):
    title: Optional[str] = None


class UpdateThreadTitleRequest(BaseModel):
    title: str


class AddMessageRequest(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None


class ThreadResponse(BaseModel):
    id: str
    thread_id: str
    title: str
    messages: List[Dict[str, Any]]
    is_active: bool
    created_at: Optional[str]
    updated_at: Optional[str]
    message_count: int


@router.post("/threads", response_model=ThreadResponse)
async def create_thread(
    request: CreateThreadRequest = CreateThreadRequest(),
    db: Session = Depends(get_db)
):
    """新しい会話スレッドを作成"""
    try:
        thread = conversation_service.create_thread(db, request.title)
        return thread
    except Exception as e:
        logger.error(f"Error creating thread: {e}")
        raise HTTPException(status_code=500, detail="Failed to create thread")


@router.get("/threads", response_model=List[ThreadResponse])
async def list_threads(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """アクティブなスレッド一覧を取得"""
    try:
        threads = conversation_service.list_threads(db, limit)
        return threads
    except Exception as e:
        logger.error(f"Error listing threads: {e}")
        raise HTTPException(status_code=500, detail="Failed to list threads")


@router.get("/threads/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    db: Session = Depends(get_db)
):
    """特定のスレッドを取得"""
    try:
        thread = conversation_service.get_thread(db, thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        return thread
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread: {e}")
        raise HTTPException(status_code=500, detail="Failed to get thread")


@router.post("/threads/{thread_id}/messages", response_model=ThreadResponse)
async def add_message(
    thread_id: str,
    request: AddMessageRequest,
    db: Session = Depends(get_db)
):
    """スレッドにメッセージを追加"""
    try:
        message = {
            "role": request.role,
            "content": request.content,
            "timestamp": request.timestamp
        }
        thread = conversation_service.add_message(db, thread_id, message)
        return thread
    except Exception as e:
        logger.error(f"Error adding message: {e}")
        raise HTTPException(status_code=500, detail="Failed to add message")


@router.put("/threads/{thread_id}/title")
async def update_thread_title(
    thread_id: str,
    request: UpdateThreadTitleRequest,
    db: Session = Depends(get_db)
):
    """スレッドのタイトルを更新"""
    try:
        thread = conversation_service.update_thread_title(db, thread_id, request.title)
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        return thread
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating thread title: {e}")
        raise HTTPException(status_code=500, detail="Failed to update thread title")


@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: str,
    db: Session = Depends(get_db)
):
    """スレッドを削除"""
    try:
        success = conversation_service.delete_thread(db, thread_id)
        if not success:
            raise HTTPException(status_code=404, detail="Thread not found")
        return {"message": "Thread deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting thread: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete thread")


@router.delete("/threads")
async def clear_all_threads(
    db: Session = Depends(get_db)
):
    """すべてのスレッドをクリア"""
    try:
        success = conversation_service.clear_all_threads(db)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to clear threads")
        return {"message": "All threads cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing threads: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear threads")