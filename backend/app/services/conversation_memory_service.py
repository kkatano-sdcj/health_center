"""
Conversation Memory Service using LangChain
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path

from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
from langchain.chains import ConversationChain
from langchain_community.chat_models import ChatOpenAI
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain.prompts import PromptTemplate

logger = logging.getLogger(__name__)

class ConversationMemoryService:
    """Service for managing conversation memory using LangChain"""
    
    def __init__(self, storage_path: str = "conversations"):
        """
        Initialize the conversation memory service
        
        Args:
            storage_path: Path to store conversation data
        """
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        
        # Store active conversations in memory
        self.conversations: Dict[str, Dict[str, Any]] = {}
        
        # Initialize LLM for conversation chains
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.3,
                openai_api_key=api_key
            )
            logger.info("Conversation memory service initialized with OpenAI")
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
        if thread_id in self.conversations:
            logger.warning(f"Thread {thread_id} already exists")
            return self.get_thread_info(thread_id)
        
        # Create conversation memory
        memory = ConversationBufferMemory(
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
        
        # Store conversation data
        self.conversations[thread_id] = {
            "id": thread_id,
            "title": title or f"会話 {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "message_count": 0,
            "memory": memory,
            "chain": chain,
            "messages": []
        }
        
        # Save to disk
        self._save_thread(thread_id)
        
        logger.info(f"Created new thread: {thread_id}")
        return self.get_thread_info(thread_id)
    
    def add_message(self, thread_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Add a message to a conversation thread
        
        Args:
            thread_id: Thread identifier
            role: Message role ("human" or "ai")
            content: Message content
            
        Returns:
            Success status
        """
        if thread_id not in self.conversations:
            logger.error(f"Thread {thread_id} not found")
            return False
        
        thread = self.conversations[thread_id]
        
        # Add to memory
        if role == "human":
            thread["memory"].chat_memory.add_user_message(content)
        elif role == "ai":
            thread["memory"].chat_memory.add_ai_message(content)
        else:
            logger.error(f"Invalid role: {role}")
            return False
        
        # Add to messages list
        message_data = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add metadata if provided
        if metadata:
            message_data["metadata"] = metadata
            
        thread["messages"].append(message_data)
        
        # Update metadata
        thread["message_count"] += 1
        thread["updated_at"] = datetime.now().isoformat()
        
        # Save to disk
        self._save_thread(thread_id)
        
        return True
    
    def get_memory(self, thread_id: str) -> Optional[ConversationBufferMemory]:
        """
        Get the memory object for a thread
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            ConversationBufferMemory instance or None
        """
        if thread_id not in self.conversations:
            # Try to load from disk
            if not self._load_thread(thread_id):
                return None
        
        return self.conversations[thread_id]["memory"]
    
    def get_messages(self, thread_id: str) -> List[Dict[str, Any]]:
        """
        Get all messages from a thread
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            List of messages with metadata
        """
        if thread_id not in self.conversations:
            if not self._load_thread(thread_id):
                return []
        
        return self.conversations[thread_id]["messages"]
    
    def get_context(self, thread_id: str, max_messages: int = 10) -> str:
        """
        Get conversation context as a formatted string
        
        Args:
            thread_id: Thread identifier
            max_messages: Maximum number of recent messages to include
            
        Returns:
            Formatted context string
        """
        if thread_id not in self.conversations:
            if not self._load_thread(thread_id):
                return ""
        
        thread = self.conversations[thread_id]
        messages = thread["messages"][-max_messages:] if thread["messages"] else []
        
        context_parts = []
        for msg in messages:
            role_label = "人間" if msg["role"] == "human" else "アシスタント"
            context_parts.append(f"{role_label}: {msg['content']}")
        
        return "\n\n".join(context_parts)
    
    def get_thread_info(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """
        Get thread information
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Thread metadata
        """
        if thread_id not in self.conversations:
            if not self._load_thread(thread_id):
                return None
        
        thread = self.conversations[thread_id]
        return {
            "id": thread["id"],
            "title": thread["title"],
            "created_at": thread["created_at"],
            "updated_at": thread["updated_at"],
            "message_count": thread["message_count"]
        }
    
    def list_threads(self) -> List[Dict[str, Any]]:
        """
        List all conversation threads
        
        Returns:
            List of thread metadata
        """
        threads = []
        
        # Load all threads from disk
        for thread_file in self.storage_path.glob("*.json"):
            thread_id = thread_file.stem
            if thread_id not in self.conversations:
                self._load_thread(thread_id)
            
            if thread_id in self.conversations:
                threads.append(self.get_thread_info(thread_id))
        
        # Sort by updated_at (most recent first)
        threads.sort(key=lambda x: x["updated_at"], reverse=True)
        
        return threads
    
    def delete_thread(self, thread_id: str) -> bool:
        """
        Delete a conversation thread
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Success status
        """
        # Remove from memory
        if thread_id in self.conversations:
            del self.conversations[thread_id]
        
        # Remove from disk
        thread_file = self.storage_path / f"{thread_id}.json"
        if thread_file.exists():
            thread_file.unlink()
            logger.info(f"Deleted thread: {thread_id}")
            return True
        
        return False
    
    def clear_all_threads(self) -> int:
        """
        Clear all conversation threads
        
        Returns:
            Number of threads deleted
        """
        count = 0
        
        # Clear from memory
        self.conversations.clear()
        
        # Clear from disk
        for thread_file in self.storage_path.glob("*.json"):
            thread_file.unlink()
            count += 1
        
        logger.info(f"Cleared {count} threads")
        return count
    
    def _save_thread(self, thread_id: str) -> bool:
        """
        Save thread to disk
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Success status
        """
        if thread_id not in self.conversations:
            return False
        
        thread = self.conversations[thread_id]
        
        # Prepare data for serialization
        save_data = {
            "id": thread["id"],
            "title": thread["title"],
            "created_at": thread["created_at"],
            "updated_at": thread["updated_at"],
            "message_count": thread["message_count"],
            "messages": thread["messages"]
        }
        
        # Save to file
        thread_file = self.storage_path / f"{thread_id}.json"
        try:
            with open(thread_file, "w", encoding="utf-8") as f:
                json.dump(save_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to save thread {thread_id}: {e}")
            return False
    
    def _load_thread(self, thread_id: str) -> bool:
        """
        Load thread from disk
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Success status
        """
        thread_file = self.storage_path / f"{thread_id}.json"
        if not thread_file.exists():
            return False
        
        try:
            with open(thread_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Recreate memory
            memory = ConversationBufferMemory(
                return_messages=True,
                memory_key="history"
            )
            
            # Restore messages to memory
            for msg in data.get("messages", []):
                if msg["role"] == "human":
                    memory.chat_memory.add_user_message(msg["content"])
                elif msg["role"] == "ai":
                    memory.chat_memory.add_ai_message(msg["content"])
            
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
            
            # Store in memory
            self.conversations[thread_id] = {
                "id": data["id"],
                "title": data["title"],
                "created_at": data["created_at"],
                "updated_at": data["updated_at"],
                "message_count": data["message_count"],
                "memory": memory,
                "chain": chain,
                "messages": data.get("messages", [])
            }
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load thread {thread_id}: {e}")
            return False
    
    def generate_title(self, thread_id: str) -> str:
        """
        Generate a title for the thread based on the first message
        
        Args:
            thread_id: Thread identifier
            
        Returns:
            Generated title
        """
        if thread_id not in self.conversations:
            return "新しい会話"
        
        thread = self.conversations[thread_id]
        messages = thread["messages"]
        
        if not messages:
            return "新しい会話"
        
        # Get first user message
        first_user_msg = next((m for m in messages if m["role"] == "human"), None)
        if first_user_msg:
            # Truncate to reasonable length
            content = first_user_msg["content"]
            if len(content) > 50:
                return content[:47] + "..."
            return content
        
        return "新しい会話"