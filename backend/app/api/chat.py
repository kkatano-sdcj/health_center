from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import uuid

from app.schemas.chat import ChatRequest, ChatResponse, Message
from app.services.chat_service import ChatService
from app.services.vector_search import VectorSearchService
from app.core.database import get_mongodb, get_redis

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    mongodb=Depends(get_mongodb),
    redis_client=Depends(get_redis)
):
    """チャットエンドポイント"""
    try:
        # サービスの初期化
        chat_service = ChatService()
        vector_service = VectorSearchService()
        
        # 関連ドキュメントの検索
        relevant_docs = await vector_service.search(
            query=request.message,
            top_k=5
        )
        
        # AI応答の生成
        response_content = await chat_service.generate_response(
            user_message=request.message,
            context_documents=relevant_docs,
            chat_history=request.chat_history
        )
        
        # メッセージの作成
        message = Message(
            id=str(uuid.uuid4()),
            type="assistant",
            content=response_content,
            timestamp=datetime.now().isoformat(),
            documents=relevant_docs[:3],  # Top 3 documents
            metadata={
                "relatedDocsCount": len(relevant_docs),
                "confidence": 95  # Placeholder
            }
        )
        
        # 履歴の保存
        await mongodb.chat_history.insert_one({
            "session_id": request.session_id,
            "message": message.dict(),
            "created_at": datetime.now()
        })
        
        return ChatResponse(
            message=message,
            session_id=request.session_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{session_id}", response_model=List[Message])
async def get_chat_history(
    session_id: str,
    limit: int = 50,
    mongodb=Depends(get_mongodb)
):
    """チャット履歴の取得"""
    try:
        cursor = mongodb.chat_history.find(
            {"session_id": session_id}
        ).sort("created_at", -1).limit(limit)
        
        messages = []
        async for doc in cursor:
            messages.append(Message(**doc["message"]))
        
        return messages[::-1]  # 時系列順に並び替え
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))