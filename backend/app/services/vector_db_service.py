import os
import hashlib
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import logging
import numpy as np

logger = logging.getLogger(__name__)


class VectorDBService:
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.client = None
            self.collection = None
            self.embedding_model = None
            self._initialized = True
    
    def initialize(self, persist_directory: str = "./chroma_db", collection_name: str = "markdown_embeddings"):
        try:
            os.makedirs(persist_directory, exist_ok=True)
            
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            try:
                self.collection = self.client.get_collection(name=collection_name)
                logger.info(f"Using existing collection: {collection_name}")
            except Exception:
                self.collection = self.client.create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
                logger.info(f"Created new collection: {collection_name}")
            
            logger.info("Vector database initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize vector database: {str(e)}")
            return False
    
    def generate_embedding(self, text: str) -> List[float]:
        try:
            if not self.embedding_model:
                logger.error("Embedding model not initialized")
                return []
            
            embedding = self.embedding_model.encode(text)
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            return []
    
    def add_document(self, file_id: str, content: str, metadata: Dict[str, Any]) -> bool:
        try:
            if not self.collection:
                logger.error("Vector database not initialized")
                return False
            
            chunks = self._chunk_text(content)
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"{file_id}_chunk_{i}"
                embedding = self.generate_embedding(chunk)
                
                if embedding:
                    chunk_metadata = {
                        **metadata,
                        'file_id': file_id,
                        'chunk_index': i,
                        'chunk_text': chunk[:500]
                    }
                    
                    self.collection.add(
                        ids=[chunk_id],
                        embeddings=[embedding],
                        documents=[chunk],
                        metadatas=[chunk_metadata]
                    )
            
            logger.info(f"Added {len(chunks)} chunks for file {file_id} to vector database")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document to vector database: {str(e)}")
            return False
    
    def search_similar(self, query: str, n_results: int = 5, filter_metadata: Optional[Dict] = None) -> List[Dict[str, Any]]:
        try:
            if not self.collection:
                logger.error("Vector database not initialized")
                return []
            
            query_embedding = self.generate_embedding(query)
            
            if not query_embedding:
                return []
            
            where_clause = filter_metadata if filter_metadata else None
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause
            )
            
            formatted_results = []
            if results['ids'] and len(results['ids'][0]) > 0:
                for i in range(len(results['ids'][0])):
                    formatted_results.append({
                        'id': results['ids'][0][i],
                        'document': results['documents'][0][i] if results['documents'] else '',
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results['distances'] else 0
                    })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Failed to search similar documents: {str(e)}")
            return []
    
    def delete_document(self, file_id: str) -> bool:
        try:
            if not self.collection:
                logger.error("Vector database not initialized")
                return False
            
            self.collection.delete(
                where={"file_id": file_id}
            )
            
            logger.info(f"Deleted all chunks for file {file_id} from vector database")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete document from vector database: {str(e)}")
            return False
    
    def update_document(self, file_id: str, content: str, metadata: Dict[str, Any]) -> bool:
        try:
            self.delete_document(file_id)
            
            return self.add_document(file_id, content, metadata)
            
        except Exception as e:
            logger.error(f"Failed to update document in vector database: {str(e)}")
            return False
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = min(start + chunk_size, text_length)
            
            if end < text_length:
                last_period = text.rfind('.', start, end)
                last_newline = text.rfind('\n', start, end)
                
                split_point = max(last_period, last_newline)
                if split_point > start:
                    end = split_point + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap if end < text_length else end
        
        return chunks
    
    def get_collection_stats(self) -> Dict[str, Any]:
        try:
            if not self.collection:
                logger.error("Vector database not initialized")
                return {}
            
            count = self.collection.count()
            
            return {
                'total_documents': count,
                'collection_name': self.collection.name,
                'metadata': self.collection.metadata
            }
            
        except Exception as e:
            logger.error(f"Failed to get collection stats: {str(e)}")
            return {}