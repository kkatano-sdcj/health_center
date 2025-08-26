from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from app.schemas.search import SearchRequest, SearchResponse, SearchResult
from app.services.vector_search import VectorSearchService
from app.core.database import get_mongodb, get_redis

router = APIRouter()

@router.post("/", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    mongodb=Depends(get_mongodb),
    redis_client=Depends(get_redis)
):
    """ドキュメント検索エンドポイント"""
    try:
        # キャッシュチェック
        cache_key = f"search:{request.query}:{request.filters}"
        cached_result = await redis_client.get(cache_key)
        
        if cached_result:
            import json
            return SearchResponse(**json.loads(cached_result))
        
        # ベクトル検索サービスの初期化
        vector_service = VectorSearchService()
        
        # 検索実行
        results = await vector_service.search(
            query=request.query,
            filters=request.filters,
            top_k=request.limit
        )
        
        # 検索結果の作成
        search_results = []
        for doc in results:
            # ドキュメントメタデータの取得
            doc_meta = await mongodb.documents.find_one({"id": doc["id"]})
            
            search_results.append(SearchResult(
                document_id=doc["id"],
                title=doc_meta.get("filename", "Unknown"),
                snippet=doc.get("text", "")[:200] + "...",
                score=doc.get("score", 0.0),
                metadata={
                    "updated_at": doc_meta.get("uploaded_at", "").isoformat() if doc_meta else None,
                    "type": doc_meta.get("content_type", "").split("/")[-1] if doc_meta else None
                }
            ))
        
        response = SearchResponse(
            query=request.query,
            results=search_results,
            total_count=len(search_results),
            filters=request.filters
        )
        
        # 結果をキャッシュ（5分間）
        await redis_client.setex(
            cache_key,
            300,
            response.json()
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=2),
    limit: int = Query(5, ge=1, le=10),
    mongodb=Depends(get_mongodb)
):
    """検索サジェスションの取得"""
    try:
        # 検索履歴から類似クエリを取得
        pipeline = [
            {
                "$match": {
                    "query": {"$regex": f"^{query}", "$options": "i"}
                }
            },
            {
                "$group": {
                    "_id": "$query",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            },
            {
                "$limit": limit
            }
        ]
        
        suggestions = []
        async for doc in mongodb.search_history.aggregate(pipeline):
            suggestions.append(doc["_id"])
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))