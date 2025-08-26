from typing import List, Dict, Any, Optional
import numpy as np
import asyncio
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
import chromadb
from chromadb.config import Settings

from app.core.config import settings

class VectorSearchService:
    def __init__(self):
        # Sentence Transformerの初期化（利用可能な場合のみ）
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            self.encoder = SentenceTransformer(settings.EMBEDDING_MODEL)
        else:
            self.encoder = None
        
        # ChromaDBの初期化
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # コレクションの取得または作成
        self.collection = self._initialize_collection()
        
    def _initialize_collection(self):
        """ChromaDBコレクションの初期化"""
        collection_name = settings.CHROMA_COLLECTION_NAME
        
        try:
            # 既存のコレクションを取得
            collection = self.client.get_collection(name=collection_name)
        except Exception:
            # コレクションが存在しない場合は作成
            collection = self.client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        
        return collection
    
    async def index_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ):
        """ドキュメントをベクトル化してインデックスに追加"""
        # テキストをチャンクに分割
        chunks = self._split_text(content)
        
        # 各チャンクをベクトル化
        documents = []
        embeddings = []
        ids = []
        metadatas = []
        
        for i, chunk in enumerate(chunks):
            # 非同期でベクトル化を実行
            if self.encoder:
                loop = asyncio.get_event_loop()
                embedding = await loop.run_in_executor(None, self.encoder.encode, chunk)
            else:
                # エンコーダーが利用できない場合はダミーベクトルを使用
                embedding = np.random.rand(384)  # デフォルトのembedding size
            
            chunk_id = f"{document_id}_{i}"
            chunk_metadata = {
                **metadata,
                "chunk_index": i,
                "document_id": document_id
            }
            
            documents.append(chunk)
            embeddings.append(embedding.tolist())
            ids.append(chunk_id)
            metadatas.append(chunk_metadata)
        
        # バッチでコレクションに追加
        self.collection.add(
            documents=documents,
            embeddings=embeddings,
            ids=ids,
            metadatas=metadatas
        )
    
    async def search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """クエリに基づいてベクトル検索を実行"""
        # クエリをベクトル化
        if self.encoder:
            loop = asyncio.get_event_loop()
            query_embedding = await loop.run_in_executor(None, self.encoder.encode, query)
        else:
            # エンコーダーが利用できない場合はダミーベクトルを使用
            query_embedding = np.random.rand(384)
        
        # 検索実行
        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            where=filters,
            n_results=top_k
        )
        
        # 結果の整形
        documents = []
        for i in range(len(results['ids'][0])):
            doc = {
                "id": results['metadatas'][0][i].get("document_id", results['ids'][0][i].split("_")[0]),
                "score": 1 - results['distances'][0][i],  # ChromaDBは距離を返すので類似度に変換
                "text": results['documents'][0][i],
                "title": results['metadatas'][0][i].get("filename", "Unknown"),
                "type": self._get_file_type(results['metadatas'][0][i].get("content_type", "")),
                "updatedAt": results['metadatas'][0][i].get("uploaded_at", ""),
                "chunk_index": results['metadatas'][0][i].get("chunk_index", 0)
            }
            documents.append(doc)
        
        # 重複を除去（同じドキュメントの異なるチャンク）
        unique_docs = {}
        for doc in documents:
            if doc["id"] not in unique_docs or doc["score"] > unique_docs[doc["id"]]["score"]:
                unique_docs[doc["id"]] = doc
        
        return list(unique_docs.values())[:top_k]
    
    async def delete_document(self, document_id: str):
        """ドキュメントとその全チャンクを削除"""
        # ドキュメントIDに基づいてチャンクを検索
        results = self.collection.get(
            where={"document_id": document_id}
        )
        
        if results['ids']:
            # 該当するチャンクを削除
            self.collection.delete(ids=results['ids'])
    
    async def update_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ):
        """ドキュメントを更新（既存を削除して新規追加）"""
        # 既存のドキュメントを削除
        await self.delete_document(document_id)
        
        # 新しいコンテンツでインデックス
        await self.index_document(document_id, content, metadata)
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """コレクションの統計情報を取得"""
        count = self.collection.count()
        return {
            "total_documents": count,
            "collection_name": settings.CHROMA_COLLECTION_NAME
        }
    
    def _split_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """テキストをチャンクに分割"""
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            
            # 文の途中で切れないように調整
            if end < len(text):
                last_period = chunk.rfind("。")
                if last_period > chunk_size * 0.8:
                    end = start + last_period + 1
                    chunk = text[start:end]
            
            chunks.append(chunk.strip())
            start = end - overlap
        
        return chunks
    
    def _get_file_type(self, content_type: str) -> str:
        """コンテンツタイプからファイルタイプを取得"""
        type_mapping = {
            "application/pdf": "pdf",
            "text/plain": "txt",
            "application/msword": "doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "doc"
        }
        return type_mapping.get(content_type, "txt")