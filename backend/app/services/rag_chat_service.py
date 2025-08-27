"""
Enhanced RAG Chat Service with Reranking
"""
import os
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict

# LangChain imports
from langchain.schema import HumanMessage, SystemMessage
from langchain_community.chat_models import ChatOpenAI
from langchain.callbacks import get_openai_callback

# Local imports
from app.services.langchain_vectorization_service import LangChainVectorizationService
from app.prompts.prompt_loader import get_prompt_loader

logger = logging.getLogger(__name__)

class LightweightReranker:
    """Lightweight reranking system for search results"""
    
    def __init__(self):
        self.weights = {
            'similarity': 0.4,      # Vector similarity weight
            'keyword_match': 0.3,   # Keyword matching weight
            'recency': 0.1,        # Document recency weight
            'chunk_position': 0.1, # Position in document weight
            'doc_frequency': 0.1   # Document frequency weight
        }
    
    def calculate_keyword_score(self, query: str, text: str) -> float:
        """Calculate keyword matching score"""
        query_terms = set(query.lower().split())
        text_terms = set(text.lower().split())
        
        if not query_terms:
            return 0.0
        
        # Exact matches
        exact_matches = len(query_terms & text_terms)
        
        # Partial matches (substrings)
        partial_matches = sum(
            1 for q_term in query_terms 
            for t_term in text_terms 
            if q_term in t_term or t_term in q_term
        )
        
        total_score = (exact_matches * 1.0 + partial_matches * 0.5) / len(query_terms)
        return min(1.0, total_score)
    
    def calculate_recency_score(self, timestamp: str) -> float:
        """Calculate recency score based on timestamp"""
        try:
            doc_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            now = datetime.now(doc_time.tzinfo)
            days_old = (now - doc_time).days
            
            # Score decreases with age (1.0 for today, 0.5 for 30 days, etc)
            return max(0.0, 1.0 - (days_old / 60))
        except:
            return 0.5  # Default score if timestamp parsing fails
    
    def calculate_chunk_position_score(self, chunk_index: int, total_chunks: int) -> float:
        """Calculate score based on chunk position (earlier chunks get higher scores)"""
        if total_chunks <= 1:
            return 1.0
        
        # Linear decay from 1.0 to 0.5 based on position
        return 1.0 - (0.5 * (chunk_index / (total_chunks - 1)))
    
    def rerank(self, query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rerank search results using multiple signals
        
        Args:
            query: Search query
            results: List of search results with text, metadata, and similarity
            
        Returns:
            Reranked list of results with combined scores
        """
        if not results:
            return results
        
        # Calculate document frequency (how many chunks per document)
        doc_frequency = defaultdict(int)
        for result in results:
            doc_id = result.get('metadata', {}).get('doc_id', '')
            if doc_id:
                doc_frequency[doc_id] += 1
        
        # Calculate combined scores
        scored_results = []
        for result in results:
            metadata = result.get('metadata', {})
            
            # Individual scores
            similarity_score = result.get('similarity', 0.0)
            keyword_score = self.calculate_keyword_score(query, result.get('text', ''))
            recency_score = self.calculate_recency_score(
                metadata.get('timestamp', metadata.get('vectorization_date', ''))
            )
            chunk_position_score = self.calculate_chunk_position_score(
                metadata.get('chunk_index', 0),
                metadata.get('total_chunks', 1)
            )
            
            # Document frequency score (documents with more relevant chunks score higher)
            doc_id = metadata.get('doc_id', '')
            doc_freq_score = doc_frequency.get(doc_id, 1) / max(doc_frequency.values()) if doc_frequency else 0.5
            
            # Combined score
            combined_score = (
                self.weights['similarity'] * similarity_score +
                self.weights['keyword_match'] * keyword_score +
                self.weights['recency'] * recency_score +
                self.weights['chunk_position'] * chunk_position_score +
                self.weights['doc_frequency'] * doc_freq_score
            )
            
            # Add scores to result
            result['reranking_scores'] = {
                'combined': combined_score,
                'similarity': similarity_score,
                'keyword_match': keyword_score,
                'recency': recency_score,
                'chunk_position': chunk_position_score,
                'doc_frequency': doc_freq_score
            }
            
            scored_results.append(result)
        
        # Sort by combined score
        scored_results.sort(key=lambda x: x['reranking_scores']['combined'], reverse=True)
        
        return scored_results

class RAGChatService:
    """Enhanced RAG chat service with conversation memory and reranking"""
    
    def __init__(self):
        """Initialize RAG chat service"""
        self.vector_service = LangChainVectorizationService()
        self.reranker = LightweightReranker()
        
        # Initialize prompt loader
        self.prompt_loader = get_prompt_loader()
        
        # Initialize LLM
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.2,
                max_tokens=1000,
                openai_api_key=api_key
            )
            logger.info("RAG chat service initialized with OpenAI gpt-4o-mini")
        else:
            self.llm = None
            logger.warning("OpenAI API key not found - RAG chat will work without LLM generation")
        
        # Conversation memory (in-memory for now)
        self.conversations = {}
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for the chat"""
        # Reload prompts to pick up any changes
        self.prompt_loader.reload_prompts()
        return self.prompt_loader.get_system_prompt()
    
    def build_context(self, results: List[Dict[str, Any]], max_length: int = 3000, max_sources: int = 3) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Build context from search results
        
        Args:
            results: Reranked search results
            max_length: Maximum context length
            max_sources: Maximum number of sources to include (default: 3)
            
        Returns:
            Formatted context string and source list
        """
        context_parts = []
        sources = []
        current_length = 0
        
        # Limit to top N sources (already sorted by relevance from reranking)
        top_results = results[:max_sources]
        
        for i, result in enumerate(top_results, 1):
            text = result.get('text', '')
            metadata = result.get('metadata', {})
            
            # Check if adding this would exceed max length
            if current_length + len(text) > max_length and context_parts:
                break
            
            # Format context entry
            filename = metadata.get('source_filename', '不明')
            chunk_info = f"(チャンク {metadata.get('chunk_index', 0) + 1}/{metadata.get('total_chunks', 1)})"
            
            context_parts.append(f"[{i}] {filename} {chunk_info}:\n{text}")
            
            # Add to sources
            sources.append({
                'index': i,
                'filename': filename,
                'chunk_index': metadata.get('chunk_index', 0),
                'total_chunks': metadata.get('total_chunks', 1),
                'similarity': result.get('similarity', 0),
                'reranking_score': result.get('reranking_scores', {}).get('combined', 0),
                'excerpt': text[:200] + '...' if len(text) > 200 else text
            })
            
            current_length += len(text)
        
        logger.info(f"Building context with {len(sources)} sources from {len(results)} total results")
        
        return '\n\n'.join(context_parts), sources
    
    def generate_response(self, query: str, context: str, conversation_id: Optional[str] = None) -> str:
        """
        Generate response using LLM
        
        Args:
            query: User query
            context: Retrieved context
            conversation_id: Optional conversation ID for memory
            
        Returns:
            Generated response
        """
        if not self.llm:
            return self._generate_fallback_response(query, context)
        
        # Get formatted user prompt from template
        user_prompt = self.prompt_loader.format_user_prompt(query=query, context=context)
        
        # Build messages
        messages = [
            SystemMessage(content=self.get_system_prompt()),
            HumanMessage(content=user_prompt)
        ]
        
        try:
            # Generate response with token tracking
            with get_openai_callback() as cb:
                response = self.llm(messages)
                
                # Log token usage
                logger.info(f"Token usage - Total: {cb.total_tokens}, Prompt: {cb.prompt_tokens}, Completion: {cb.completion_tokens}")
                
                return response.content
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            return self._generate_fallback_response(query, context)
    
    def _generate_fallback_response(self, query: str, context: str) -> str:
        """Generate fallback response when LLM is unavailable"""
        if not context:
            return "申し訳ございません。お探しの情報が見つかりませんでした。別のキーワードでお試しください。"
        
        # Extract first few lines from context
        context_lines = context.split('\n')
        preview = '\n'.join(context_lines[:10])
        
        return f"""「{query}」に関連する情報を見つけました：

{preview}

※ AI応答が一時的に利用できないため、検索結果の抜粋を表示しています。"""
    
    async def chat(
        self, 
        query: str, 
        conversation_id: Optional[str] = None,
        n_results: int = 10,
        use_reranking: bool = True
    ) -> Dict[str, Any]:
        """
        Main chat endpoint with RAG
        
        Args:
            query: User query
            conversation_id: Optional conversation ID
            n_results: Number of search results to retrieve
            use_reranking: Whether to use reranking
            
        Returns:
            Chat response with sources and metadata
        """
        start_time = datetime.now()
        
        try:
            # 1. Vector search (retrieve more results for reranking)
            search_n = n_results * 2 if use_reranking else n_results
            search_results = self.vector_service.search(query, n_results=search_n)
            
            if not search_results.get('results'):
                return {
                    'query': query,
                    'response': 'お探しの情報が見つかりませんでした。別のキーワードでお試しください。',
                    'sources': [],
                    'search_results': 0,
                    'processing_time': (datetime.now() - start_time).total_seconds()
                }
            
            # 2. Rerank results
            if use_reranking:
                ranked_results = self.reranker.rerank(query, search_results['results'])
                # Take top N after reranking
                ranked_results = ranked_results[:n_results]
            else:
                ranked_results = search_results['results']
            
            # 3. Build context
            context, sources = self.build_context(ranked_results)
            
            # 4. Generate response
            response = self.generate_response(query, context, conversation_id)
            
            # 5. Store in conversation memory if ID provided
            if conversation_id:
                if conversation_id not in self.conversations:
                    self.conversations[conversation_id] = []
                
                self.conversations[conversation_id].append({
                    'query': query,
                    'response': response,
                    'timestamp': datetime.now().isoformat()
                })
            
            # 6. Return structured response
            return {
                'query': query,
                'response': response,
                'sources': sources,
                'search_results': len(ranked_results),
                'used_reranking': use_reranking,
                'conversation_id': conversation_id,
                'processing_time': (datetime.now() - start_time).total_seconds(),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Chat processing error: {e}")
            return {
                'query': query,
                'response': f'エラーが発生しました: {str(e)}',
                'error': str(e),
                'processing_time': (datetime.now() - start_time).total_seconds()
            }
    
    def get_conversation_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return self.conversations.get(conversation_id, [])
    
    def clear_conversation(self, conversation_id: str) -> bool:
        """Clear a specific conversation"""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
            return True
        return False
    
    def update_reranker_weights(self, weights: Dict[str, float]) -> None:
        """Update reranker weights for experimentation"""
        self.reranker.weights.update(weights)
        logger.info(f"Updated reranker weights: {self.reranker.weights}")