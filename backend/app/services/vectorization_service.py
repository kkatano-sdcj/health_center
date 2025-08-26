"""
Vector Database Service using ChromaDB for RAG implementation
"""
import os
import hashlib
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from langchain.text_splitter import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

class VectorizationService:
    """Service for vectorizing and storing converted documents in ChromaDB"""
    
    def __init__(self, persist_directory: str = "Vectorized"):
        """
        Initialize the vectorization service
        
        Args:
            persist_directory: Directory to store ChromaDB data
        """
        self.persist_directory = persist_directory
        self.converted_dir = "converted"
        
        # Initialize ChromaDB client with persistent storage
        self.client = chromadb.PersistentClient(
            path=os.path.join(self.persist_directory, "chroma_db"),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Initialize embedding function (using default sentence-transformers)
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"  # Lightweight model for Japanese and English
        )
        
        # Initialize or get collection
        self.collection_name = "converted_documents"
        try:
            self.collection = self.client.get_collection(
                name=self.collection_name,
                embedding_function=self.embedding_function
            )
            logger.info(f"Using existing collection: {self.collection_name}")
        except:
            self.collection = self.client.create_collection(
                name=self.collection_name,
                embedding_function=self.embedding_function,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Created new collection: {self.collection_name}")
        
        # Initialize text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", "。", ".", " ", ""]
        )
    
    def generate_doc_id(self, filename: str) -> str:
        """Generate a unique ID for a document based on filename"""
        return hashlib.md5(filename.encode()).hexdigest()
    
    def chunk_text(self, text: str, filename: str) -> List[Dict[str, Any]]:
        """
        Split text into chunks with metadata
        
        Args:
            text: The text content to split
            filename: The source filename
            
        Returns:
            List of chunks with metadata
        """
        chunks = self.text_splitter.split_text(text)
        doc_id = self.generate_doc_id(filename)
        
        chunk_data = []
        for i, chunk in enumerate(chunks):
            chunk_data.append({
                "id": f"{doc_id}_{i}",
                "text": chunk,
                "metadata": {
                    "filename": filename,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "doc_id": doc_id,
                    "timestamp": datetime.now().isoformat()
                }
            })
        
        return chunk_data
    
    def vectorize_file(self, filename: str) -> Dict[str, Any]:
        """
        Vectorize a single converted file and store in ChromaDB
        
        Args:
            filename: Name of the file in converted directory
            
        Returns:
            Status and statistics of the vectorization
        """
        filepath = os.path.join(self.converted_dir, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")
        
        if not filename.endswith('.md'):
            raise ValueError(f"Only markdown files are supported: {filename}")
        
        try:
            # Read file content
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if document already exists
            doc_id = self.generate_doc_id(filename)
            existing = self.collection.get(
                where={"doc_id": doc_id}
            )
            
            if existing and existing['ids']:
                # Delete existing chunks
                self.collection.delete(ids=existing['ids'])
                logger.info(f"Deleted {len(existing['ids'])} existing chunks for {filename}")
            
            # Create chunks
            chunks = self.chunk_text(content, filename)
            
            if not chunks:
                return {
                    "status": "skipped",
                    "message": "No content to vectorize",
                    "filename": filename
                }
            
            # Add chunks to collection
            self.collection.add(
                ids=[chunk["id"] for chunk in chunks],
                documents=[chunk["text"] for chunk in chunks],
                metadatas=[chunk["metadata"] for chunk in chunks]
            )
            
            logger.info(f"Vectorized {filename}: {len(chunks)} chunks")
            
            return {
                "status": "success",
                "filename": filename,
                "chunks_created": len(chunks),
                "doc_id": doc_id,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error vectorizing {filename}: {e}")
            raise
    
    def vectorize_all_files(self) -> Dict[str, Any]:
        """
        Vectorize all markdown files in the converted directory
        
        Returns:
            Summary of vectorization process
        """
        if not os.path.exists(self.converted_dir):
            raise FileNotFoundError(f"Converted directory not found: {self.converted_dir}")
        
        results = []
        errors = []
        
        # Get all markdown files
        files = [f for f in os.listdir(self.converted_dir) 
                if f.endswith('.md') and not f.startswith('.')]
        
        for filename in files:
            try:
                result = self.vectorize_file(filename)
                results.append(result)
            except Exception as e:
                errors.append({
                    "filename": filename,
                    "error": str(e)
                })
                logger.error(f"Failed to vectorize {filename}: {e}")
        
        return {
            "total_files": len(files),
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        }
    
    def search(self, query: str, n_results: int = 5) -> Dict[str, Any]:
        """
        Search for similar content in the vector database
        
        Args:
            query: Search query
            n_results: Number of results to return
            
        Returns:
            Search results with metadata
        """
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            formatted_results = []
            if results and results['ids'] and results['ids'][0]:
                for i in range(len(results['ids'][0])):
                    formatted_results.append({
                        "text": results['documents'][0][i],
                        "metadata": results['metadatas'][0][i],
                        "distance": results['distances'][0][i],
                        "similarity": 1 - results['distances'][0][i]  # Convert distance to similarity
                    })
            
            return {
                "query": query,
                "results": formatted_results,
                "count": len(formatted_results),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            raise
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the vector collection
        
        Returns:
            Collection statistics
        """
        try:
            # Get all documents to count unique files
            all_docs = self.collection.get()
            
            unique_files = set()
            if all_docs and all_docs['metadatas']:
                for metadata in all_docs['metadatas']:
                    if metadata and 'filename' in metadata:
                        unique_files.add(metadata['filename'])
            
            return {
                "collection_name": self.collection_name,
                "total_chunks": self.collection.count(),
                "unique_documents": len(unique_files),
                "documents": list(unique_files),
                "persist_directory": self.persist_directory,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            raise
    
    def delete_document(self, filename: str) -> Dict[str, Any]:
        """
        Delete a document from the vector database
        
        Args:
            filename: Name of the file to delete
            
        Returns:
            Deletion status
        """
        try:
            doc_id = self.generate_doc_id(filename)
            
            # Get all chunks for this document
            results = self.collection.get(
                where={"doc_id": doc_id}
            )
            
            if results and results['ids']:
                # Delete all chunks
                self.collection.delete(ids=results['ids'])
                
                return {
                    "status": "success",
                    "filename": filename,
                    "chunks_deleted": len(results['ids']),
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "status": "not_found",
                    "filename": filename,
                    "message": "Document not found in vector database",
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error deleting document {filename}: {e}")
            raise
    
    def reset_collection(self) -> Dict[str, Any]:
        """
        Reset the entire collection (delete all vectors)
        
        Returns:
            Reset status
        """
        try:
            # Delete the collection
            self.client.delete_collection(name=self.collection_name)
            
            # Recreate the collection
            self.collection = self.client.create_collection(
                name=self.collection_name,
                embedding_function=self.embedding_function,
                metadata={"hnsw:space": "cosine"}
            )
            
            return {
                "status": "success",
                "message": "Collection reset successfully",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error resetting collection: {e}")
            raise