"""
RAG (Retrieval-Augmented Generation) Service
Integrates vector search with LLM for intelligent responses
"""
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from openai import OpenAI
from app.services.vectorization_service import VectorizationService

logger = logging.getLogger(__name__)

class RAGService:
    """Service for RAG functionality using vectorized documents and LLM"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize RAG service
        
        Args:
            api_key: OpenAI API key (defaults to environment variable)
        """
        self.vector_service = VectorizationService()
        
        # Initialize OpenAI client
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)
            self.model = "gpt-3.5-turbo"
            logger.info("RAG service initialized with OpenAI")
        else:
            self.client = None
            logger.warning("No OpenAI API key provided, RAG responses will be limited")
    
    def build_context(self, search_results: List[Dict[str, Any]], max_context_length: int = 3000) -> str:
        """
        Build context from search results for LLM
        
        Args:
            search_results: Vector search results
            max_context_length: Maximum context length
            
        Returns:
            Combined context string
        """
        context_parts = []
        total_length = 0
        
        for result in search_results:
            text = result.get("text", "")
            metadata = result.get("metadata", {})
            filename = metadata.get("filename", "unknown")
            
            # Format each result
            formatted = f"[{filename}]:\n{text}\n\n"
            
            # Check if adding this would exceed limit
            if total_length + len(formatted) > max_context_length:
                break
            
            context_parts.append(formatted)
            total_length += len(formatted)
        
        return "".join(context_parts)
    
    def generate_response(self, query: str, context: str) -> str:
        """
        Generate response using LLM with context
        
        Args:
            query: User query
            context: Retrieved context from vector search
            
        Returns:
            Generated response
        """
        if not self.client:
            # Return simple response without LLM
            return f"Based on the documents, here is relevant information for your query: {query}\n\n{context[:500]}..."
        
        try:
            # Create system message
            system_message = """You are a helpful assistant that answers questions based on the provided context.
            Always base your answers on the context provided. If the context doesn't contain relevant information,
            say so clearly. Be concise and accurate in your responses."""
            
            # Create user message with context
            user_message = f"""Context from documents:
            {context}
            
            Question: {query}
            
            Please provide a comprehensive answer based on the context above."""
            
            # Generate response
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}")
            # Fallback to simple response
            return f"Error generating response. Here is the relevant context:\n\n{context[:500]}..."
    
    def query(
        self,
        query: str,
        n_results: int = 5,
        use_llm: bool = True,
        return_sources: bool = True
    ) -> Dict[str, Any]:
        """
        Perform RAG query on vectorized documents
        
        Args:
            query: User query
            n_results: Number of vector search results
            use_llm: Whether to use LLM for response generation
            return_sources: Whether to return source documents
            
        Returns:
            RAG response with sources
        """
        try:
            # Perform vector search
            search_results = self.vector_service.search(query, n_results)
            
            if not search_results.get("results"):
                return {
                    "query": query,
                    "response": "No relevant documents found for your query.",
                    "sources": [],
                    "timestamp": datetime.now().isoformat()
                }
            
            # Build context from search results
            context = self.build_context(search_results["results"])
            
            # Generate response
            if use_llm and self.client:
                response_text = self.generate_response(query, context)
            else:
                # Simple response without LLM
                response_text = self._generate_simple_response(query, search_results["results"])
            
            # Format sources
            sources = []
            if return_sources:
                for result in search_results["results"]:
                    sources.append({
                        "filename": result["metadata"].get("filename", "unknown"),
                        "chunk_index": result["metadata"].get("chunk_index", 0),
                        "similarity": result.get("similarity", 0),
                        "excerpt": result["text"][:200] + "..." if len(result["text"]) > 200 else result["text"]
                    })
            
            return {
                "query": query,
                "response": response_text,
                "sources": sources,
                "context_used": len(search_results["results"]),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"RAG query error: {e}")
            raise
    
    def _generate_simple_response(self, query: str, results: List[Dict[str, Any]]) -> str:
        """
        Generate simple response without LLM
        
        Args:
            query: User query
            results: Search results
            
        Returns:
            Simple formatted response
        """
        if not results:
            return "No relevant information found for your query."
        
        response_parts = [f"Found {len(results)} relevant document(s) for: '{query}'\n\n"]
        
        for i, result in enumerate(results[:3], 1):
            metadata = result.get("metadata", {})
            filename = metadata.get("filename", "unknown")
            text = result.get("text", "")
            similarity = result.get("similarity", 0)
            
            # Truncate text if too long
            if len(text) > 300:
                text = text[:300] + "..."
            
            response_parts.append(f"{i}. From {filename} (Relevance: {similarity:.2%}):\n{text}\n\n")
        
        return "".join(response_parts)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get RAG service statistics
        
        Returns:
            Service statistics
        """
        vector_stats = self.vector_service.get_collection_stats()
        
        return {
            "rag_enabled": self.client is not None,
            "llm_model": self.model if self.client else None,
            "vector_stats": vector_stats,
            "timestamp": datetime.now().isoformat()
        }
    
    def clear_cache(self):
        """Clear any cached data (placeholder for future caching implementation)"""
        pass