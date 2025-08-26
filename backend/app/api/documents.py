from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
import uuid
from datetime import datetime

from app.schemas.document import Document, DocumentUploadResponse
from app.services.document_service import DocumentService
from app.services.vector_search import VectorSearchService
from app.core.database import get_mongodb

router = APIRouter()

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    mongodb=Depends(get_mongodb)
):
    """ドキュメントのアップロード"""
    try:
        # ファイルの検証
        if file.content_type not in ["application/pdf", "text/plain", "application/msword"]:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Only PDF, TXT, and DOC files are allowed."
            )
        
        # サービスの初期化
        doc_service = DocumentService()
        vector_service = VectorSearchService()
        
        # ドキュメントの処理
        document_id = str(uuid.uuid4())
        content = await doc_service.process_document(file)
        
        # ベクトル化と保存
        await vector_service.index_document(
            document_id=document_id,
            content=content,
            metadata={
                "filename": file.filename,
                "content_type": file.content_type,
                "uploaded_at": datetime.now().isoformat()
            }
        )
        
        # メタデータの保存
        document = {
            "id": document_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": file.size,
            "uploaded_at": datetime.now(),
            "status": "indexed"
        }
        
        await mongodb.documents.insert_one(document)
        
        return DocumentUploadResponse(
            document_id=document_id,
            filename=file.filename,
            status="success",
            message="Document uploaded and indexed successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}", response_model=Document)
async def get_document(
    document_id: str,
    mongodb=Depends(get_mongodb)
):
    """ドキュメントの取得"""
    try:
        document = await mongodb.documents.find_one({"id": document_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return Document(**document)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Document])
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    mongodb=Depends(get_mongodb)
):
    """ドキュメント一覧の取得"""
    try:
        cursor = mongodb.documents.find().skip(skip).limit(limit).sort("uploaded_at", -1)
        
        documents = []
        async for doc in cursor:
            documents.append(Document(**doc))
        
        return documents
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))