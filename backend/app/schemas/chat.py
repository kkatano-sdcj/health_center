from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class Document(BaseModel):
    id: str
    title: str
    type: str
    updatedAt: str

class MessageMetadata(BaseModel):
    relatedDocsCount: Optional[int] = None
    confidence: Optional[int] = None

class Message(BaseModel):
    id: str
    type: str  # "user" or "assistant"
    content: str
    timestamp: str
    documents: Optional[List[Document]] = None
    metadata: Optional[MessageMetadata] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str
    chat_history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    message: Message
    session_id: str