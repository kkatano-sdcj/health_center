"""
Metadata Service for managing file metadata and relationships
"""
import os
import json
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import logging

from app.models.file_metadata import FileMetadata, FileRelationship

logger = logging.getLogger(__name__)

class MetadataService:
    """Service for managing file metadata and relationships"""
    
    def __init__(self, metadata_dir: str = "metadata"):
        """
        Initialize metadata service
        
        Args:
            metadata_dir: Directory to store metadata files
        """
        self.metadata_dir = Path(metadata_dir)
        self.metadata_dir.mkdir(exist_ok=True)
        
        # Metadata storage files
        self.metadata_file = self.metadata_dir / "file_metadata.json"
        self.relationships_file = self.metadata_dir / "file_relationships.json"
        
        # Load existing metadata
        self.metadata_cache = self._load_metadata()
        self.relationships_cache = self._load_relationships()
    
    def _load_metadata(self) -> Dict[str, FileMetadata]:
        """Load metadata from storage"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return {k: FileMetadata(**v) for k, v in data.items()}
            except Exception as e:
                logger.error(f"Error loading metadata: {e}")
        return {}
    
    def _load_relationships(self) -> List[FileRelationship]:
        """Load relationships from storage"""
        if self.relationships_file.exists():
            try:
                with open(self.relationships_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    relationships = []
                    for item in data:
                        orig = FileMetadata(**item['original_file'])
                        conv = FileMetadata(**item['converted_file']) if item.get('converted_file') else None
                        relationships.append(FileRelationship(
                            original_file=orig,
                            converted_file=conv,
                            relationship_type=item['relationship_type'],
                            created_at=datetime.fromisoformat(item['created_at'])
                        ))
                    return relationships
            except Exception as e:
                logger.error(f"Error loading relationships: {e}")
        return []
    
    def _save_metadata(self):
        """Save metadata to storage"""
        try:
            data = {k: v.dict() for k, v in self.metadata_cache.items()}
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
    
    def _save_relationships(self):
        """Save relationships to storage"""
        try:
            data = [rel.dict() for rel in self.relationships_cache]
            with open(self.relationships_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving relationships: {e}")
    
    def calculate_checksum(self, filepath: str) -> str:
        """Calculate SHA-256 checksum of a file"""
        sha256_hash = hashlib.sha256()
        try:
            with open(filepath, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            logger.error(f"Error calculating checksum for {filepath}: {e}")
            return ""
    
    def create_file_metadata(
        self,
        filepath: str,
        file_type: str = "original",
        conversion_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> FileMetadata:
        """
        Create metadata for a file
        
        Args:
            filepath: Path to the file
            file_type: Type of file (original or converted)
            conversion_id: ID of the conversion process
            user_id: ID of the user
            
        Returns:
            FileMetadata object
        """
        file_path = Path(filepath)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        file_stats = file_path.stat()
        
        # Determine MIME type
        import mimetypes
        mime_type, _ = mimetypes.guess_type(filepath)
        mime_type = mime_type or "application/octet-stream"
        
        metadata = FileMetadata(
            original_filename=file_path.name if file_type == "original" else "",
            original_path=str(file_path) if file_type == "original" else "",
            converted_filename=file_path.name if file_type == "converted" else None,
            converted_path=str(file_path) if file_type == "converted" else None,
            file_size=file_stats.st_size,
            mime_type=mime_type,
            extension=file_path.suffix.lstrip('.'),
            uploaded_at=datetime.fromtimestamp(file_stats.st_ctime),
            converted_at=datetime.now() if file_type == "converted" else None,
            conversion_id=conversion_id,
            conversion_status="completed" if file_type == "converted" else "pending",
            original_checksum=self.calculate_checksum(filepath) if file_type == "original" else "",
            converted_checksum=self.calculate_checksum(filepath) if file_type == "converted" else None,
            user_id=user_id
        )
        
        # Store in cache
        cache_key = f"{file_type}_{file_path.name}"
        self.metadata_cache[cache_key] = metadata
        self._save_metadata()
        
        return metadata
    
    def create_relationship(
        self,
        original_filepath: str,
        converted_filepath: Optional[str] = None,
        conversion_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> FileRelationship:
        """
        Create a relationship between original and converted files
        
        Args:
            original_filepath: Path to original file
            converted_filepath: Path to converted file
            conversion_id: ID of the conversion process
            user_id: ID of the user
            
        Returns:
            FileRelationship object
        """
        # Create metadata for original file
        original_metadata = self.create_file_metadata(
            original_filepath,
            file_type="original",
            conversion_id=conversion_id,
            user_id=user_id
        )
        
        # Create metadata for converted file if provided
        converted_metadata = None
        if converted_filepath:
            converted_metadata = self.create_file_metadata(
                converted_filepath,
                file_type="converted",
                conversion_id=conversion_id,
                user_id=user_id
            )
        
        # Create relationship
        relationship = FileRelationship(
            original_file=original_metadata,
            converted_file=converted_metadata,
            relationship_type="conversion",
            created_at=datetime.now()
        )
        
        self.relationships_cache.append(relationship)
        self._save_relationships()
        
        return relationship
    
    def update_conversion_status(
        self,
        original_filename: str,
        status: str,
        converted_filepath: Optional[str] = None
    ):
        """
        Update the conversion status of a file
        
        Args:
            original_filename: Name of the original file
            status: New status
            converted_filepath: Path to converted file if completed
        """
        # Find the relationship
        for rel in self.relationships_cache:
            if rel.original_file.original_filename == original_filename:
                # Update status
                cache_key = f"original_{original_filename}"
                if cache_key in self.metadata_cache:
                    self.metadata_cache[cache_key].conversion_status = status
                    
                    if status == "completed" and converted_filepath:
                        # Create converted file metadata
                        converted_metadata = self.create_file_metadata(
                            converted_filepath,
                            file_type="converted",
                            conversion_id=self.metadata_cache[cache_key].conversion_id,
                            user_id=self.metadata_cache[cache_key].user_id
                        )
                        rel.converted_file = converted_metadata
                        self.metadata_cache[cache_key].converted_filename = Path(converted_filepath).name
                        self.metadata_cache[cache_key].converted_path = converted_filepath
                        self.metadata_cache[cache_key].converted_at = datetime.now()
                    
                    self._save_metadata()
                    self._save_relationships()
                    break
    
    def get_file_metadata(self, filename: str, file_type: str = "original") -> Optional[FileMetadata]:
        """
        Get metadata for a specific file
        
        Args:
            filename: Name of the file
            file_type: Type of file (original or converted)
            
        Returns:
            FileMetadata object or None
        """
        cache_key = f"{file_type}_{filename}"
        return self.metadata_cache.get(cache_key)
    
    def get_file_relationship(self, filename: str) -> Optional[FileRelationship]:
        """
        Get relationship for a file
        
        Args:
            filename: Name of the file (original or converted)
            
        Returns:
            FileRelationship object or None
        """
        for rel in self.relationships_cache:
            if (rel.original_file.original_filename == filename or
                (rel.converted_file and rel.converted_file.converted_filename == filename)):
                return rel
        return None
    
    def list_all_metadata(self, file_type: Optional[str] = None) -> List[FileMetadata]:
        """
        List all metadata
        
        Args:
            file_type: Filter by file type (original, converted, or None for all)
            
        Returns:
            List of FileMetadata objects
        """
        if file_type:
            return [m for k, m in self.metadata_cache.items() if k.startswith(f"{file_type}_")]
        return list(self.metadata_cache.values())
    
    def list_all_relationships(self) -> List[FileRelationship]:
        """
        List all relationships
        
        Returns:
            List of FileRelationship objects
        """
        return self.relationships_cache
    
    def update_vectorization_status(
        self,
        converted_filename: str,
        is_vectorized: bool,
        chunks: int = 0
    ):
        """
        Update vectorization status for a converted file
        
        Args:
            converted_filename: Name of the converted file
            is_vectorized: Whether the file has been vectorized
            chunks: Number of vector chunks created
        """
        cache_key = f"converted_{converted_filename}"
        if cache_key in self.metadata_cache:
            self.metadata_cache[cache_key].is_vectorized = is_vectorized
            self.metadata_cache[cache_key].vectorization_date = datetime.now() if is_vectorized else None
            self.metadata_cache[cache_key].vector_chunks = chunks
            self._save_metadata()
    
    def get_conversion_history(self, original_filename: str) -> List[Dict[str, Any]]:
        """
        Get conversion history for a file
        
        Args:
            original_filename: Name of the original file
            
        Returns:
            List of conversion history entries
        """
        history = []
        for rel in self.relationships_cache:
            if rel.original_file.original_filename == original_filename:
                entry = {
                    "original": rel.original_file.dict(),
                    "converted": rel.converted_file.dict() if rel.converted_file else None,
                    "relationship_type": rel.relationship_type,
                    "created_at": rel.created_at.isoformat()
                }
                history.append(entry)
        return history