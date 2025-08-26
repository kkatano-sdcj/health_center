"""
API endpoints for RAG (Retrieval-Augmented Generation) operations
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any
import logging
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/rag",
    tags=["rag"],
    responses={404: {"description": "Not found"}},
)

# Initialize RAG service
rag_service = RAGService()

@router.post("/query")
async def query_rag(
    query: str = Body(..., description="Query to search and generate response"),
    n_results: Optional[int] = Body(5, ge=1, le=20, description="Number of vector results"),
    use_llm: Optional[bool] = Body(True, description="Use LLM for response generation"),
    return_sources: Optional[bool] = Body(True, description="Return source documents")
) -> Dict[str, Any]:
    """
    Perform RAG query on vectorized documents
    
    Args:
        query: User query
        n_results: Number of vector search results (1-20)
        use_llm: Whether to use LLM for response generation
        return_sources: Whether to return source documents
        
    Returns:
        RAG response with sources and metadata
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        result = rag_service.query(
            query=query,
            n_results=n_results,
            use_llm=use_llm,
            return_sources=return_sources
        )
        return result
    except Exception as e:
        logger.error(f"RAG query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_only(
    query: str = Body(..., description="Query to search"),
    n_results: Optional[int] = Body(5, ge=1, le=20, description="Number of results")
) -> Dict[str, Any]:
    """
    Perform vector search only without LLM generation
    
    Args:
        query: Search query
        n_results: Number of results to return (1-20)
        
    Returns:
        Vector search results
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        # Use RAG service with LLM disabled
        result = rag_service.query(
            query=query,
            n_results=n_results,
            use_llm=False,
            return_sources=True
        )
        return result
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_rag_stats() -> Dict[str, Any]:
    """
    Get RAG service statistics
    
    Returns:
        Service statistics including vector database info
    """
    try:
        stats = rag_service.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/context")
async def build_context(
    query: str = Body(..., description="Query to search"),
    n_results: Optional[int] = Body(5, ge=1, le=20, description="Number of results"),
    max_length: Optional[int] = Body(3000, ge=100, le=10000, description="Maximum context length")
) -> Dict[str, Any]:
    """
    Build context from vector search results
    
    Args:
        query: Search query
        n_results: Number of vector results to use
        max_length: Maximum context length in characters
        
    Returns:
        Context string and metadata
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        # Get vector search results
        search_results = rag_service.vector_service.search(query, n_results)
        
        if not search_results.get("results"):
            return {
                "query": query,
                "context": "",
                "sources_used": 0,
                "message": "No relevant documents found"
            }
        
        # Build context
        context = rag_service.build_context(
            search_results["results"],
            max_context_length=max_length
        )
        
        # Get source filenames
        sources = list(set(
            result["metadata"].get("filename", "unknown")
            for result in search_results["results"]
        ))
        
        return {
            "query": query,
            "context": context,
            "context_length": len(context),
            "sources_used": len(search_results["results"]),
            "source_files": sources
        }
        
    except Exception as e:
        logger.error(f"Context building error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear-cache")
async def clear_rag_cache() -> Dict[str, Any]:
    """
    Clear any cached data in RAG service
    
    Returns:
        Cache clear status
    """
    try:
        rag_service.clear_cache()
        return {
            "status": "success",
            "message": "RAG cache cleared"
        }
    except Exception as e:
        logger.error(f"Cache clear error: {e}")
        raise HTTPException(status_code=500, detail=str(e))