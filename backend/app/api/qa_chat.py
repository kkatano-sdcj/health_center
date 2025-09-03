"""
QAChat用のAPIエンドポイント
FAQデータベースのベクトル検索を提供
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import logging
from app.services.qa_vector_service import QAVectorService
from app.core.config import settings
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/qa", tags=["QA Chat"])


class QASearchRequest(BaseModel):
    """QA検索リクエスト"""
    query: str = Field(..., description="検索クエリ")
    n_results: int = Field(5, description="返す結果の数", ge=1, le=20)
    category_filter: Optional[str] = Field(None, description="カテゴリフィルター")
    status_filter: Optional[str] = Field(None, description="ステータスフィルター")


class QASearchResult(BaseModel):
    """QA検索結果"""
    faq_id: str
    record_number: str
    question_title: str
    question_content: str
    answer_content: str
    category_name: str
    category_code: str
    similarity_score: float
    metadata: Dict[str, Any]


class QASearchResponse(BaseModel):
    """QA検索レスポンス"""
    results: List[QASearchResult]
    total_results: int
    query: str


class QAIndexStats(BaseModel):
    """インデックス統計情報"""
    total_faqs: int
    collection_name: str
    category_distribution: Dict[str, int]
    last_updated: str


# QAVectorServiceのシングルトンインスタンス
_qa_service: Optional[QAVectorService] = None


def get_qa_service() -> QAVectorService:
    """QAVectorServiceのインスタンスを取得"""
    global _qa_service
    if _qa_service is None:
        _qa_service = QAVectorService()
        # 初期化
        supabase_url = os.getenv('SUPABASE_URL', settings.SUPABASE_URL)
        supabase_key = os.getenv('SUPABASE_KEY', settings.SUPABASE_KEY)
        
        if not supabase_url or not supabase_key:
            logger.warning("Supabase credentials not configured")
            # Supabase未設定でも動作するように（ローカルインデックスのみ使用）
            _qa_service.initialize(
                persist_directory=settings.CHROMA_PERSIST_DIR,
                collection_name=settings.QA_CHROMA_COLLECTION_NAME
            )
        else:
            _qa_service.initialize(
                persist_directory=settings.CHROMA_PERSIST_DIR,
                collection_name=settings.QA_CHROMA_COLLECTION_NAME,
                supabase_url=supabase_url,
                supabase_key=supabase_key
            )
    return _qa_service


@router.post("/search", response_model=QASearchResponse)
async def search_faqs(
    request: QASearchRequest,
    qa_service: QAVectorService = Depends(get_qa_service)
) -> QASearchResponse:
    """
    FAQデータベースをベクトル検索
    
    - **query**: 検索クエリテキスト
    - **n_results**: 返す結果の最大数（1-20）
    - **category_filter**: カテゴリコードでフィルター（オプション）
    - **status_filter**: ステータスでフィルター（オプション）
    """
    try:
        logger.info(f"QA search request: query='{request.query}', n_results={request.n_results}")
        
        # 類似FAQ検索
        results = qa_service.search_similar_faqs(
            query=request.query,
            n_results=request.n_results,
            category_filter=request.category_filter,
            status_filter=request.status_filter
        )
        
        # 結果の整形
        search_results = []
        for result in results:
            metadata = result.get('metadata', {})
            document = result.get('document', '')
            
            # ドキュメントから質問と回答を抽出
            lines = document.split('\n')
            question_content = ""
            answer_content = ""
            
            for i, line in enumerate(lines):
                if '質問内容:' in line:
                    question_content = line.replace('質問内容:', '').strip()
                elif '回答内容:' in line:
                    answer_content = line.replace('回答内容:', '').strip()
            
            search_results.append(QASearchResult(
                faq_id=metadata.get('faq_id', ''),
                record_number=metadata.get('record_number', ''),
                question_title=metadata.get('question_title', ''),
                question_content=question_content,
                answer_content=answer_content,
                category_name=metadata.get('category_name', ''),
                category_code=metadata.get('category_code', ''),
                similarity_score=result.get('similarity_score', 0),
                metadata={
                    'status': metadata.get('status', ''),
                    'priority': metadata.get('priority', ''),
                    'created_at': metadata.get('created_at', ''),
                    'updated_at': metadata.get('updated_at', ''),
                    'tags': metadata.get('tags', '')
                }
            ))
        
        logger.info(f"Found {len(search_results)} results for query '{request.query}'")
        
        return QASearchResponse(
            results=search_results,
            total_results=len(search_results),
            query=request.query
        )
        
    except Exception as e:
        logger.error(f"Error in QA search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@router.get("/stats", response_model=QAIndexStats)
async def get_index_stats(
    qa_service: QAVectorService = Depends(get_qa_service)
) -> QAIndexStats:
    """
    インデックスの統計情報を取得
    """
    try:
        stats = qa_service.get_collection_stats()
        
        return QAIndexStats(
            total_faqs=stats.get('total_faqs', 0),
            collection_name=stats.get('collection_name', ''),
            category_distribution=stats.get('category_distribution', {}),
            last_updated=stats.get('last_updated', '')
        )
        
    except Exception as e:
        logger.error(f"Error getting index stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")


@router.post("/index/rebuild")
async def rebuild_index(
    qa_service: QAVectorService = Depends(get_qa_service)
) -> Dict[str, Any]:
    """
    インデックスを完全に再構築
    
    注意: この操作は時間がかかる場合があります
    """
    try:
        logger.info("Starting index rebuild...")
        
        success = qa_service.rebuild_index()
        
        if success:
            stats = qa_service.get_collection_stats()
            logger.info(f"Index rebuilt successfully with {stats.get('total_faqs', 0)} FAQs")
            
            return {
                "status": "success",
                "message": "Index rebuilt successfully",
                "total_faqs": stats.get('total_faqs', 0)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to rebuild index")
            
    except Exception as e:
        logger.error(f"Error rebuilding index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Rebuild error: {str(e)}")


@router.post("/index/update/{faq_id}")
async def update_faq_in_index(
    faq_id: str,
    faq_data: Dict[str, Any],
    qa_service: QAVectorService = Depends(get_qa_service)
) -> Dict[str, Any]:
    """
    特定のFAQをインデックスで更新
    
    - **faq_id**: FAQ ID
    - **faq_data**: 更新するFAQデータ
    """
    try:
        success = qa_service.update_faq_in_index(faq_id, faq_data)
        
        if success:
            return {
                "status": "success",
                "message": f"FAQ {faq_id} updated in index"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update FAQ in index")
            
    except Exception as e:
        logger.error(f"Error updating FAQ in index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Update error: {str(e)}")


@router.delete("/index/{faq_id}")
async def delete_faq_from_index(
    faq_id: str,
    qa_service: QAVectorService = Depends(get_qa_service)
) -> Dict[str, Any]:
    """
    特定のFAQをインデックスから削除
    
    - **faq_id**: 削除するFAQ ID
    """
    try:
        success = qa_service.delete_faq_from_index(faq_id)
        
        if success:
            return {
                "status": "success",
                "message": f"FAQ {faq_id} deleted from index"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete FAQ from index")
            
    except Exception as e:
        logger.error(f"Error deleting FAQ from index: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delete error: {str(e)}")


@router.get("/categories")
async def get_categories(
    qa_service: QAVectorService = Depends(get_qa_service)
) -> Dict[str, Any]:
    """
    利用可能なカテゴリ一覧を取得
    """
    try:
        stats = qa_service.get_collection_stats()
        categories = list(stats.get('category_distribution', {}).keys())
        
        return {
            "categories": categories,
            "total": len(categories)
        }
        
    except Exception as e:
        logger.error(f"Error getting categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Categories error: {str(e)}")