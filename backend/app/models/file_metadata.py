"""
File Metadata Model for tracking file relationships
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class FileMetadata(BaseModel):
    """Metadata for tracking files through conversion process"""
    
    # File identifiers
    original_filename: str
    original_path: str
    converted_filename: Optional[str] = None
    converted_path: Optional[str] = None
    
    # File properties
    file_size: int
    mime_type: str
    extension: str
    
    # Timestamps
    uploaded_at: datetime
    converted_at: Optional[datetime] = None
    
    # Conversion info
    conversion_id: Optional[str] = None
    conversion_status: str = "pending"  # pending, processing, completed, failed
    conversion_method: Optional[str] = None  # standard, ai-enhanced
    
    # Checksums for integrity
    original_checksum: str
    converted_checksum: Optional[str] = None
    
    # Additional metadata
    tags: list[str] = []
    user_id: Optional[str] = None
    notes: Optional[str] = None
    
    # Vectorization status
    is_vectorized: bool = False
    vectorization_date: Optional[datetime] = None
    vector_chunks: int = 0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class FileRelationship(BaseModel):
    """Track relationships between original and converted files"""
    
    original_file: FileMetadata
    converted_file: Optional[FileMetadata] = None
    relationship_type: str = "conversion"  # conversion, version, derivative
    created_at: datetime = datetime.now()
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }