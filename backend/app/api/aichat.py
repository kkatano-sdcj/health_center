"""
AI Chat API Endpoints with RAG and Thread Management
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from datetime import datetime
import logging
import uuid

from app.services.rag_chat_service import RAGChatService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize service as singleton
_rag_chat_service = None

def get_rag_chat_service():
    global _rag_chat_service
    if _rag_chat_service is None:
        logger.info("Initializing RAG chat service (singleton)")
        _rag_chat_service = RAGChatService()
    return _rag_chat_service

class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    conversation_id: Optional[str] = None
    use_reranking: Optional[bool] = True
    n_results: Optional[int] = 10
    use_database: Optional[bool] = True
    use_web_search: Optional[bool] = False

class ChatResponse(BaseModel):
    """Chat response model"""
    query: str
    response: str
    sources: List[Dict[str, Any]]
    conversation_id: str
    search_results: int
    processing_time: float

class ConversationHistoryRequest(BaseModel):
    """Conversation history request"""
    conversation_id: str

class RerankerWeightsRequest(BaseModel):
    """Reranker weights update request"""
    weights: Dict[str, float]

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    RAG-enhanced chat endpoint
    
    Args:
        request: Chat request with message and options
        
    Returns:
        AI-generated response with sources
    """
    try:
        # Get service instance
        rag_chat_service = get_rag_chat_service()
        
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # Process chat
        result = await rag_chat_service.chat(
            query=request.message,
            conversation_id=conversation_id,
            n_results=request.n_results,
            use_reranking=request.use_reranking,
            use_database=request.use_database,
            use_web_search=request.use_web_search
        )
        
        # Add conversation ID to result
        result['conversation_id'] = conversation_id
        
        return result
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint (for future implementation)
    
    Args:
        request: Chat request
        
    Returns:
        Streamed response chunks
    """
    # Placeholder for streaming implementation
    raise HTTPException(
        status_code=501, 
        detail="Streaming chat not yet implemented"
    )

@router.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str):
    """
    Get conversation history
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        Conversation history
    """
    try:
        rag_chat_service = get_rag_chat_service()
        history = rag_chat_service.get_conversation_history(conversation_id)
        
        return {
            "conversation_id": conversation_id,
            "history": history,
            "message_count": len(history)
        }
        
    except Exception as e:
        logger.error(f"Get conversation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/conversation/{conversation_id}")
async def clear_conversation(conversation_id: str):
    """
    Clear conversation history
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        Success status
    """
    try:
        rag_chat_service = get_rag_chat_service()
        success = rag_chat_service.clear_conversation(conversation_id)
        
        if success:
            return {"success": True, "message": f"Conversation {conversation_id} cleared"}
        else:
            return {"success": False, "message": "Conversation not found"}
            
    except Exception as e:
        logger.error(f"Clear conversation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reranker/weights")
async def update_reranker_weights(request: RerankerWeightsRequest):
    """
    Update reranker weights for experimentation
    
    Args:
        request: New weights configuration
        
    Returns:
        Success status
    """
    try:
        # Validate weights (should sum to 1.0 approximately)
        weight_sum = sum(request.weights.values())
        if abs(weight_sum - 1.0) > 0.01:
            raise ValueError(f"Weights should sum to 1.0, got {weight_sum}")
        
        rag_chat_service = get_rag_chat_service()
        rag_chat_service.update_reranker_weights(request.weights)
        
        return {
            "success": True,
            "message": "Reranker weights updated",
            "weights": request.weights
        }
        
    except Exception as e:
        logger.error(f"Update weights error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/health")
async def health_check():
    """
    Health check for AI chat service
    
    Returns:
        Service health status
    """
    try:
        rag_chat_service = get_rag_chat_service()
        
        # Check vector service
        vector_stats = rag_chat_service.vector_service.get_collection_stats()
        
        # Check LLM availability
        llm_available = rag_chat_service.llm is not None
        
        return {
            "status": "healthy",
            "vector_db": {
                "status": "connected",
                "documents": vector_stats.get("unique_documents", 0),
                "chunks": vector_stats.get("total_chunks", 0)
            },
            "llm": {
                "status": "available" if llm_available else "unavailable",
                "model": "gpt-4o-mini" if llm_available else None
            },
            "reranker": {
                "status": "active",
                "weights": rag_chat_service.reranker.weights
            }
        }
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@router.get("/stats")
async def get_stats():
    """
    Get chat service statistics
    
    Returns:
        Service statistics
    """
    try:
        rag_chat_service = get_rag_chat_service()
        
        # Get thread statistics from memory service
        threads = rag_chat_service.memory_service.list_threads()
        total_messages = sum(t["message_count"] for t in threads)
        
        return {
            "active_threads": len(threads),
            "total_messages": total_messages,
            "vector_db_stats": rag_chat_service.vector_service.get_collection_stats(),
            "reranker_weights": rag_chat_service.reranker.weights
        }
        
    except Exception as e:
        logger.error(f"Get stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Thread Management Endpoints

@router.get("/threads")
async def list_threads():
    """
    List all conversation threads
    
    Returns:
        List of threads with metadata
    """
    try:
        rag_chat_service = get_rag_chat_service()
        threads = rag_chat_service.memory_service.list_threads()
        
        # Format timestamps for frontend
        for thread in threads:
            # Convert ISO timestamp to relative time
            try:
                created = datetime.fromisoformat(thread["created_at"])
                updated = datetime.fromisoformat(thread["updated_at"])
                now = datetime.now()
                
                # Calculate time difference
                diff = now - updated
                if diff.days > 0:
                    thread["timestamp"] = f"{diff.days}日前"
                elif diff.seconds > 3600:
                    thread["timestamp"] = f"{diff.seconds // 3600}時間前"
                elif diff.seconds > 60:
                    thread["timestamp"] = f"{diff.seconds // 60}分前"
                else:
                    thread["timestamp"] = "たった今"
                    
                # Rename for frontend compatibility
                thread["messageCount"] = thread.pop("message_count")
                
            except Exception as e:
                thread["timestamp"] = "不明"
                thread["messageCount"] = 0
        
        return {"threads": threads}
        
    except Exception as e:
        logger.error(f"List threads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/threads")
async def create_thread(title: Optional[str] = None):
    """
    Create a new conversation thread
    
    Args:
        title: Optional thread title
        
    Returns:
        Created thread metadata
    """
    try:
        rag_chat_service = get_rag_chat_service()
        thread_id = str(uuid.uuid4())
        thread = rag_chat_service.memory_service.create_thread(thread_id, title)
        
        return thread
        
    except Exception as e:
        logger.error(f"Create thread error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/threads/{thread_id}")
async def get_thread(thread_id: str):
    """
    Get thread information and messages
    
    Args:
        thread_id: Thread identifier
        
    Returns:
        Thread metadata and messages
    """
    try:
        rag_chat_service = get_rag_chat_service()
        thread_info = rag_chat_service.memory_service.get_thread_info(thread_id)
        
        if not thread_info:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Get full messages with metadata
        messages = []
        if hasattr(rag_chat_service.memory_service, 'get_messages'):
            messages = rag_chat_service.memory_service.get_messages(thread_id)
        
        # Also get context for backward compatibility
        context = rag_chat_service.memory_service.get_context(thread_id)
        
        return {
            "thread": thread_info,
            "context": context,
            "messages": messages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get thread error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/threads/{thread_id}/summarize")
async def summarize_thread(thread_id: str):
    """
    Summarize a conversation thread using LLM
    
    Args:
        thread_id: Thread identifier
        
    Returns:
        Summarized conversation
    """
    try:
        rag_chat_service = get_rag_chat_service()
        
        # Get thread info and messages
        thread_info = rag_chat_service.memory_service.get_thread_info(thread_id)
        if not thread_info:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Get full conversation context
        context = rag_chat_service.memory_service.get_context(thread_id, max_messages=50)
        
        if not context:
            return {
                "summary": "会話内容がありません。",
                "title": thread_info.get("title", "無題の会話"),
                "thread_id": thread_id
            }
        
        # Generate summary using LLM
        if rag_chat_service.llm:
            from langchain.schema import SystemMessage, HumanMessage
            
            summary_prompt = f"""以下の会話を要約してください。重要なポイント、質問と回答、結論を含めて、構造化された要約を作成してください。

会話内容:
{context}

要約形式:
1. 会話の概要
2. 主な質問と回答
3. 重要なポイント
4. 結論または次のアクション（もしあれば）"""
            
            messages = [
                SystemMessage(content="あなたは会話を要約する専門家です。明確で簡潔な要約を作成してください。"),
                HumanMessage(content=summary_prompt)
            ]
            
            try:
                response = rag_chat_service.llm.invoke(messages)
                summary = response.content
            except Exception as e:
                logger.error(f"LLM summarization error: {e}")
                # Fallback to simple summary
                summary = f"会話タイトル: {thread_info.get('title', '無題')}\n\n{context[:500]}..."
        else:
            # Simple fallback if no LLM available
            summary = f"会話タイトル: {thread_info.get('title', '無題')}\n\n{context[:500]}..."
        
        return {
            "summary": summary,
            "title": thread_info.get("title", "無題の会話"),
            "thread_id": thread_id,
            "message_count": thread_info.get("message_count", 0),
            "created_at": thread_info.get("created_at"),
            "updated_at": thread_info.get("updated_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summarize thread error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    """
    Delete a conversation thread
    
    Args:
        thread_id: Thread identifier
        
    Returns:
        Success status
    """
    try:
        rag_chat_service = get_rag_chat_service()
        success = rag_chat_service.memory_service.delete_thread(thread_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        return {"success": True, "message": f"Thread {thread_id} deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete thread error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/threads")
async def clear_all_threads():
    """
    Clear all conversation threads
    
    Returns:
        Number of threads deleted
    """
    try:
        rag_chat_service = get_rag_chat_service()
        count = rag_chat_service.memory_service.clear_all_threads()
        
        return {"success": True, "deleted_count": count}
        
    except Exception as e:
        logger.error(f"Clear threads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))