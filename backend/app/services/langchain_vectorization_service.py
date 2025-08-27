"""
LangChain-based Vector Database Service with Semantic Chunking
"""
import os
import hashlib
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

# LangChain imports
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_text_splitters import CharacterTextSplitter
from langchain.docstore.document import Document
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain.schema import Document as LangChainDocument

# Metadata service
from app.services.metadata_service import MetadataService

logger = logging.getLogger(__name__)

class SemanticTextSplitter:
    """Custom semantic text splitter with sliding window and overlap"""
    
    def __init__(self, chunk_size: int = 1000, overlap_percentage: float = 0.15):
        """
        Initialize semantic text splitter
        
        Args:
            chunk_size: Target size of each chunk
            overlap_percentage: Percentage of overlap between chunks (0.15 = 15%)
        """
        self.chunk_size = chunk_size
        self.overlap_size = int(chunk_size * overlap_percentage)
        
        # Use RecursiveCharacterTextSplitter for semantic chunking
        # It tries to keep paragraphs, sentences, and words together
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=self.overlap_size,
            length_function=len,
            separators=[
                "\n\n",  # Double newline (paragraph break)
                "\n",    # Single newline
                "。",     # Japanese period
                ".",     # English period
                "！",     # Japanese exclamation
                "!",     # English exclamation
                "？",     # Japanese question mark
                "?",     # English question mark
                "；",     # Japanese semicolon
                ";",     # English semicolon
                "：",     # Japanese colon
                ":",     # English colon
                "、",     # Japanese comma
                ",",     # English comma
                " ",     # Space
                ""       # Character boundary
            ],
            is_separator_regex=False
        )
    
    def split_text(self, text: str, metadata: Dict[str, Any] = None) -> List[Document]:
        """
        Split text into semantic chunks with metadata
        
        Args:
            text: Text to split
            metadata: Metadata to attach to each chunk
            
        Returns:
            List of Document objects with chunks and metadata
        """
        # Create chunks using the splitter
        chunks = self.splitter.split_text(text)
        
        # Create Document objects with metadata
        documents = []
        for i, chunk in enumerate(chunks):
            chunk_metadata = {
                "chunk_index": i,
                "total_chunks": len(chunks),
                "chunk_size": len(chunk),
                "overlap_size": self.overlap_size,
                "timestamp": datetime.now().isoformat()
            }
            
            # Merge with provided metadata
            if metadata:
                chunk_metadata.update(metadata)
            
            documents.append(
                Document(
                    page_content=chunk,
                    metadata=chunk_metadata
                )
            )
        
        return documents

class LangChainVectorizationService:
    """LangChain-based vectorization service with semantic chunking"""
    
    def __init__(self, persist_directory: str = "Vectorized"):
        """
        Initialize LangChain vectorization service
        
        Args:
            persist_directory: Directory to store ChromaDB data
        """
        self.persist_directory = persist_directory
        self.converted_dir = "converted"
        
        # Initialize metadata service
        self.metadata_service = MetadataService()
        
        # Initialize embedding model (using sentence-transformers)
        self.embeddings = SentenceTransformerEmbeddings(
            model_name="all-MiniLM-L6-v2"  # Lightweight multilingual model
        )
        
        # Initialize semantic text splitter with 15% overlap
        self.text_splitter = SemanticTextSplitter(
            chunk_size=1000,
            overlap_percentage=0.15
        )
        
        # Initialize or load Chroma vector store
        self.vector_store = self._initialize_vector_store()
        
        logger.info("LangChain vectorization service initialized")
    
    def _initialize_vector_store(self) -> Chroma:
        """Initialize or load existing Chroma vector store"""
        try:
            # Create persist directory if it doesn't exist
            os.makedirs(self.persist_directory, exist_ok=True)
            chroma_path = os.path.join(self.persist_directory, "chroma_langchain_db")
            
            # Initialize Chroma with persistence
            vector_store = Chroma(
                collection_name="converted_documents_langchain",
                embedding_function=self.embeddings,
                persist_directory=chroma_path
            )
            
            logger.info(f"Initialized Chroma vector store at {chroma_path}")
            return vector_store
            
        except Exception as e:
            logger.error(f"Error initializing vector store: {e}")
            raise
    
    def generate_doc_id(self, filename: str) -> str:
        """Generate a unique ID for a document"""
        return hashlib.md5(filename.encode()).hexdigest()
    
    def vectorize_file(self, filename: str) -> Dict[str, Any]:
        """
        Vectorize a single converted file with semantic chunking
        
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
            
            # Get metadata from metadata service
            file_metadata = self.metadata_service.get_file_metadata(filename, "converted")
            relationship = self.metadata_service.get_file_relationship(filename)
            
            # Prepare metadata for chunks
            doc_metadata = {
                "source_filename": filename,
                "doc_id": self.generate_doc_id(filename),
                "original_filename": relationship.original_file.original_filename if relationship else None,
                "conversion_id": file_metadata.conversion_id if file_metadata else None,
                "file_size": os.path.getsize(filepath),
                "vectorization_date": datetime.now().isoformat()
            }
            
            # Check if document already exists
            existing_docs = self.vector_store.similarity_search(
                "",
                k=1,
                filter={"doc_id": doc_metadata["doc_id"]}
            )
            
            if existing_docs:
                # Delete existing documents
                doc_ids = [doc.metadata.get("doc_id") for doc in existing_docs]
                # Note: Chroma doesn't have direct delete by metadata, 
                # so we'll overwrite by adding new docs with same ID
                logger.info(f"Document {filename} already exists, will be updated")
            
            # Split text into semantic chunks
            documents = self.text_splitter.split_text(content, doc_metadata)
            
            if not documents:
                return {
                    "status": "skipped",
                    "message": "No content to vectorize",
                    "filename": filename
                }
            
            # Add documents to vector store
            texts = [doc.page_content for doc in documents]
            metadatas = [doc.metadata for doc in documents]
            
            # Add unique IDs for each chunk
            ids = [f"{doc_metadata['doc_id']}_{i}" for i in range(len(documents))]
            
            self.vector_store.add_texts(
                texts=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            # Persist the vector store
            self.vector_store.persist()
            
            # Update metadata service
            self.metadata_service.update_vectorization_status(
                converted_filename=filename,
                is_vectorized=True,
                chunks=len(documents)
            )
            
            logger.info(f"Vectorized {filename}: {len(documents)} chunks with 15% overlap")
            
            return {
                "status": "success",
                "filename": filename,
                "chunks_created": len(documents),
                "doc_id": doc_metadata["doc_id"],
                "chunk_size": self.text_splitter.chunk_size,
                "overlap_percentage": 15,
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
    
    def search(self, query: str, n_results: int = 5, filter: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Search for similar content using LangChain vector store
        
        Args:
            query: Search query
            n_results: Number of results to return
            filter: Metadata filter for search
            
        Returns:
            Search results with metadata
        """
        try:
            # Perform similarity search with scores
            results_with_scores = self.vector_store.similarity_search_with_score(
                query,
                k=n_results,
                filter=filter
            )
            
            # Format results
            formatted_results = []
            for doc, score in results_with_scores:
                # Convert distance to similarity (1 - normalized_distance)
                similarity = 1 - (score / 2)  # Normalize to 0-1 range
                
                formatted_results.append({
                    "text": doc.page_content,
                    "metadata": doc.metadata,
                    "distance": score,
                    "similarity": max(0, min(1, similarity))  # Clamp to 0-1
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
            # Get collection info from vector store
            collection = self.vector_store._collection
            
            # Count documents
            doc_count = collection.count()
            
            # Get unique source files
            unique_files = set()
            
            # Get ALL documents to ensure accurate count
            # Use a higher k value to get all documents
            if doc_count > 0:
                sample_results = self.vector_store.similarity_search("", k=doc_count)
                for doc in sample_results:
                    if doc.metadata and 'source_filename' in doc.metadata:
                        unique_files.add(doc.metadata['source_filename'])
            
            return {
                "collection_name": "converted_documents_langchain",
                "total_chunks": doc_count,
                "unique_documents": len(unique_files),
                "documents": list(unique_files),
                "persist_directory": self.persist_directory,
                "chunk_size": self.text_splitter.chunk_size,
                "overlap_percentage": 15,
                "embedding_model": "all-MiniLM-L6-v2",
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
            results = self.vector_store.similarity_search(
                "",
                k=1000,  # Get many results
                filter={"doc_id": doc_id}
            )
            
            if results:
                # Extract IDs and delete
                chunk_ids = [f"{doc_id}_{i}" for i in range(len(results))]
                
                # Actually delete the documents from ChromaDB
                # ChromaDB's delete method requires IDs
                try:
                    self.vector_store._collection.delete(
                        ids=chunk_ids
                    )
                    logger.info(f"Deleted {len(chunk_ids)} chunks for {filename}")
                except Exception as delete_error:
                    logger.warning(f"Direct deletion failed, trying alternative method: {delete_error}")
                    # Alternative: delete by filter
                    self.vector_store._collection.delete(
                        where={"doc_id": doc_id}
                    )
                
                # Persist the changes
                self.vector_store.persist()
                
                # Update metadata service
                self.metadata_service.update_vectorization_status(
                    converted_filename=filename,
                    is_vectorized=False,
                    chunks=0
                )
                
                return {
                    "status": "success",
                    "filename": filename,
                    "chunks_deleted": len(results),
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
            # Re-initialize the vector store (effectively clearing it)
            self.vector_store = self._initialize_vector_store()
            
            # Update all metadata to not vectorized
            for metadata in self.metadata_service.list_all_metadata("converted"):
                if metadata.is_vectorized:
                    self.metadata_service.update_vectorization_status(
                        converted_filename=metadata.converted_filename,
                        is_vectorized=False,
                        chunks=0
                    )
            
            return {
                "status": "success",
                "message": "Collection reset successfully",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error resetting collection: {e}")
            raise