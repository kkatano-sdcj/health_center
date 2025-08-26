"""
API endpoints for vector database operations
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import logging
from app.services.vectorization_service import VectorizationService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/vectorization",
    tags=["vectorization"],
    responses={404: {"description": "Not found"}},
)

# Initialize vectorization service
vector_service = VectorizationService()

@router.post("/vectorize/{filename}")
async def vectorize_file(filename: str) -> Dict[str, Any]:
    """
    Vectorize a single converted file
    
    Args:
        filename: Name of the file to vectorize
        
    Returns:
        Vectorization status and statistics
    """
    try:
        result = vector_service.vectorize_file(filename)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Vectorization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vectorize-all")
async def vectorize_all_files() -> Dict[str, Any]:
    """
    Vectorize all markdown files in the converted directory
    
    Returns:
        Summary of vectorization process
    """
    try:
        result = vector_service.vectorize_all_files()
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Batch vectorization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_vectors(
    query: str,
    n_results: Optional[int] = Query(5, ge=1, le=20, description="Number of results to return")
) -> Dict[str, Any]:
    """
    Search for similar content in the vector database
    
    Args:
        query: Search query text
        n_results: Number of results to return (1-20)
        
    Returns:
        Search results with similarity scores
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    try:
        results = vector_service.search(query, n_results)
        return results
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_collection_stats() -> Dict[str, Any]:
    """
    Get statistics about the vector collection
    
    Returns:
        Collection statistics including document count and chunk count
    """
    try:
        stats = vector_service.get_collection_stats()
        return stats
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/document/{filename}")
async def delete_document_vectors(filename: str) -> Dict[str, Any]:
    """
    Delete a document from the vector database
    
    Args:
        filename: Name of the file to delete
        
    Returns:
        Deletion status
    """
    try:
        result = vector_service.delete_document(filename)
        if result["status"] == "not_found":
            raise HTTPException(status_code=404, detail=result["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deletion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset")
async def reset_vector_collection() -> Dict[str, Any]:
    """
    Reset the entire vector collection (delete all vectors)
    WARNING: This will delete all vectorized data!
    
    Returns:
        Reset status
    """
    try:
        result = vector_service.reset_collection()
        return result
    except Exception as e:
        logger.error(f"Reset error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def list_vectorized_documents() -> Dict[str, Any]:
    """
    List all documents that have been vectorized
    
    Returns:
        List of vectorized documents
    """
    try:
        stats = vector_service.get_collection_stats()
        return {
            "documents": stats["documents"],
            "total": stats["unique_documents"],
            "total_chunks": stats["total_chunks"]
        }
    except Exception as e:
        logger.error(f"List documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))