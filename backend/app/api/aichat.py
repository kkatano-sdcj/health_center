"""
AI Chat API Endpoints with RAG
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import logging
import uuid

from app.services.rag_chat_service import RAGChatService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize service
rag_chat_service = RAGChatService()

class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    conversation_id: Optional[str] = None
    use_reranking: Optional[bool] = True
    n_results: Optional[int] = 10

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
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        # Process chat
        result = await rag_chat_service.chat(
            query=request.message,
            conversation_id=conversation_id,
            n_results=request.n_results,
            use_reranking=request.use_reranking
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
        # Get conversation count
        conversation_count = len(rag_chat_service.conversations)
        total_messages = sum(
            len(history) 
            for history in rag_chat_service.conversations.values()
        )
        
        return {
            "active_conversations": conversation_count,
            "total_messages": total_messages,
            "vector_db_stats": rag_chat_service.vector_service.get_collection_stats(),
            "reranker_weights": rag_chat_service.reranker.weights
        }
        
    except Exception as e:
        logger.error(f"Get stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))