from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Document(BaseModel):
    id: str
    filename: str
    content_type: str
    size: Optional[int] = None
    uploaded_at: datetime
    status: str

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    message: str