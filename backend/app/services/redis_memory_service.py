"""
Redis-backed Conversation Memory Service using LangChain
"""
import os
import json
import logging
import redis
from typing import Dict, List, Optional, Any
from datetime import datetime
from urllib.parse import urlparse

from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain.chains import ConversationChain
from langchain_community.chat_models import ChatOpenAI
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain.prompts import PromptTemplate

logger = logging.getLogger(__name__)

class RedisMemoryService:
    """Service for managing conversation memory using Redis and LangChain"""
    
    def __init__(self):
        """
        Initialize the Redis-backed conversation memory service
        """
        # Get Redis URL from environment
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            logger.warning("REDIS_URL not found in environment, falling back to local Redis")
            redis_url = "redis://localhost:6379"
        
        # Remove any spaces in the URL
        redis_url = redis_url.strip()
        
        # Initialize Redis client
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.redis_client.ping()
            logger.info(f"Connected to Redis successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
        
        # Store active conversation chains
        self.conversations: Dict[str, ConversationChain] = {}
        
        # Initialize LLM for conversation chains
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.3,
                openai_api_key=api_key
            )
            logger.info("Redis memory service initialized with OpenAI")
        else:
            self.llm = None
            logger.warning("OpenAI API key not found - conversation chains will not work")
    
    def create_thread(self, thread_id: str, title: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new conversation thread
        
        Args:
            thread_id: Unique identifier for the thread
            title: Optional title for the thread
            
        Returns:
            Thread metadata
        """
        # Check if thread already exists
        if self.redis_client.exists(f"thread:{thread_id}:metadata"):
            logger.warning(f"Thread {thread_id} already exists")
            return self.get_thread_info(thread_id)
        
        # Create Redis-backed message history
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379").strip()
        message_history = RedisChatMessageHistory(
            url=redis_url,
            session_id=thread_id,
            key_prefix="thread:"
        )
        
        # Create conversation memory
        memory = ConversationBufferMemory(
            chat_memory=message_history,
            return_messages=True,
            memory_key="history"
        )
        
        # Create conversation chain if LLM is available
        chain = None
        if self.llm:
            prompt = PromptTemplate(
                input_variables=["history", "input"],
                template="""以下は、人間とAIアシスタントの会話履歴です。

{history}

人間: {input}
AIアシスタント: 会話履歴を踏まえて、適切に応答します。"""
            )
            
            chain = ConversationChain(
                llm=self.llm,
                memory=memory,
                prompt=prompt,
                verbose=False
            )
            
            # Store chain in memory
            self.conversations[thread_id] = chain
        
        # Store thread metadata in Redis
        metadata = {
            "id": thread_id,
            "title": title or f"会話 {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "message_count": 0
        }
        
        self.redis_client.hset(
            f"thread:{thread_id}:metadata",
            mapping=metadata
        )
        
        # Add thread ID to the list of all threads
        self.redis_client.sadd("thread:ids", thread_id)
        
        logger.info(f"Created new thread: {thread_id}")
        return metadata
    
    def add_message(self, thread_id: str, role: str, content: str) -> bool:
        """
        Add a message to a conversation thread
        
        Args:
            thread_id: Thread identifier
            role: Message role ("human" or "ai")
            content: Message content
            
        Returns:
            Success status
        """
        # Check if thread exists
        if not self.redis_client.exists(f"thread:{thread_id}:metadata"):
            logger.error(f"Thread {thread_id} not found")
            return False
        
        # Get or create message history
        message_history = RedisChatMessageHistory(
            url=os.getenv("REDIS_URL").strip(),
            session_id=thread_id,
            key_prefix="thread:"
        )
        
        # Add message to history
        if role == "human":
            message_history.add_user_message(content)
        elif role == "ai":
            message_history.add_ai_message(content)
        else:
            logger.error(f"Invalid role: {role}")
            return False
        
        # Update metadata
        metadata = self.redis_client.hgetall(f"thread:{thread_id}:metadata")
        current_count = int(metadata.get("message_count", 0))
        
        self.redis_client.hset(
            f"thread:{thread_id}:metadata",
            mapping={
                "updated_at": datetime.now().isoformat(),
                "message_count": current_count + 1
            }
        )
        
        # Update title if this is the first user message
        if current_count == 0 and role == "human":
            title = content[:50] + "..." if len(content) > 50 else content
            self.redis_client.hset(f"thread:{thread_id}:metadata", "title", title)
        
        return True
    
    def get_memory(self, thread_id: str) -> Optional[ConversationBufferMemory]:
        """
        Get the memory object for a thread
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            ConversationBufferMemory instance or None
        """
        # Check if thread exists
        if not self.redis_client.exists(f"thread:{thread_id}:metadata"):
            return None
        
        # Create Redis-backed message history
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379").strip()
        message_history = RedisChatMessageHistory(
            url=redis_url,
            session_id=thread_id,
            key_prefix="thread:"
        )
        
        # Create and return memory
        return ConversationBufferMemory(
            chat_memory=message_history,
            return_messages=True,
            memory_key="history"
        )
    
    def get_context(self, thread_id: str, max_messages: int = 10) -> str:
        """
        Get conversation context as a formatted string
        
        Args:
            thread_id: Thread identifier
            max_messages: Maximum number of recent messages to include
            
        Returns:
            Formatted context string
        """
        # Check if thread exists
        if not self.redis_client.exists(f"thread:{thread_id}:metadata"):
            return ""
        
        # Get message history
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379").strip()
        message_history = RedisChatMessageHistory(
            url=redis_url,
            session_id=thread_id,
            key_prefix="thread:"
        )
        
        messages = message_history.messages
        
        # Get last N messages
        if len(messages) > max_messages:
            messages = messages[-max_messages:]
        
        # Format context
        context_parts = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                context_parts.append(f"人間: {msg.content}")
            elif isinstance(msg, AIMessage):
                context_parts.append(f"アシスタント: {msg.content}")
        
        return "\n\n".join(context_parts)
    
    def get_thread_info(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """
        Get thread information
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Thread metadata
        """
        metadata = self.redis_client.hgetall(f"thread:{thread_id}:metadata")
        if not metadata:
            return None
        
        # Convert message_count to int
        if "message_count" in metadata:
            metadata["message_count"] = int(metadata["message_count"])
        
        return metadata
    
    def list_threads(self) -> List[Dict[str, Any]]:
        """
        List all conversation threads
        
        Returns:
            List of thread metadata
        """
        threads = []
        
        # Get all thread IDs
        thread_ids = self.redis_client.smembers("thread:ids")
        
        for thread_id in thread_ids:
            thread_info = self.get_thread_info(thread_id)
            if thread_info:
                threads.append(thread_info)
        
        # Sort by updated_at (most recent first)
        threads.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        
        return threads
    
    def delete_thread(self, thread_id: str) -> bool:
        """
        Delete a conversation thread
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Success status
        """
        # Remove from active conversations
        if thread_id in self.conversations:
            del self.conversations[thread_id]
        
        # Delete from Redis
        # Delete metadata
        self.redis_client.delete(f"thread:{thread_id}:metadata")
        
        # Delete message history
        self.redis_client.delete(f"thread:{thread_id}")
        
        # Remove from thread IDs set
        self.redis_client.srem("thread:ids", thread_id)
        
        logger.info(f"Deleted thread: {thread_id}")
        return True
    
    def clear_all_threads(self) -> int:
        """
        Clear all conversation threads
        
        Returns:
            Number of threads deleted
        """
        count = 0
        
        # Clear from memory
        self.conversations.clear()
        
        # Get all thread IDs
        thread_ids = self.redis_client.smembers("thread:ids")
        
        # Delete each thread
        for thread_id in thread_ids:
            if self.delete_thread(thread_id):
                count += 1
        
        # Clear the thread IDs set
        self.redis_client.delete("thread:ids")
        
        logger.info(f"Cleared {count} threads")
        return count
    
    def generate_title(self, thread_id: str) -> str:
        """
        Generate a title for the thread based on the first message
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Generated title
        """
        # Get message history
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379").strip()
        message_history = RedisChatMessageHistory(
            url=redis_url,
            session_id=thread_id,
            key_prefix="thread:"
        )
        
        messages = message_history.messages
        
        if not messages:
            return "新しい会話"
        
        # Get first user message
        for msg in messages:
            if isinstance(msg, HumanMessage):
                content = msg.content
                if len(content) > 50:
                    return content[:47] + "..."
                return content
        
        return "新しい会話"
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get Redis statistics
        
        Returns:
            Statistics dictionary
        """
        try:
            info = self.redis_client.info()
            thread_count = self.redis_client.scard("thread:ids")
            
            return {
                "redis_connected": True,
                "redis_version": info.get("redis_version", "unknown"),
                "used_memory": info.get("used_memory_human", "unknown"),
                "total_threads": thread_count,
                "active_conversations": len(self.conversations)
            }
        except Exception as e:
            logger.error(f"Failed to get Redis stats: {e}")
            return {
                "redis_connected": False,
                "error": str(e)
            }