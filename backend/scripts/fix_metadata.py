#!/usr/bin/env python3
"""
Fix corrupted metadata in file_metadata.json
"""
import json
import os
from pathlib import Path

def fix_metadata():
    """Fix corrupted metadata entries"""
    metadata_file = Path("metadata/file_metadata.json")
    
    if not metadata_file.exists():
        print("Metadata file not found")
        return
    
    # Load current metadata
    with open(metadata_file, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    
    # Fix corrupted entries
    fixed_count = 0
    for key, value in metadata.items():
        # Fix empty strings and make them proper values
        if key.startswith("converted_"):
            # For converted files, ensure proper fields
            if value.get('original_filename') == "":
                # Extract original filename from the key or related metadata
                related_key = key.replace("converted_", "").replace(".md", ".pptx")
                original_key = f"original_{related_key}"
                
                if original_key in metadata:
                    # Use data from original file
                    original = metadata[original_key]
                    value['original_filename'] = original.get('original_filename', '')
                    value['original_path'] = original.get('original_path', '')
                    value['original_checksum'] = original.get('original_checksum', '')
                else:
                    # Use placeholder values
                    value['original_filename'] = value.get('converted_filename', '').replace('.md', '')
                    value['original_path'] = f"original/{value.get('original_filename', '')}"
                    value['original_checksum'] = value.get('original_checksum', '') or "placeholder_checksum"
            
            # Ensure required fields have values
            if not value.get('file_size'):
                # Try to get actual file size
                converted_path = value.get('converted_path', '')
                if converted_path and os.path.exists(converted_path):
                    value['file_size'] = os.path.getsize(converted_path)
                else:
                    value['file_size'] = 0
            
            if not value.get('mime_type'):
                value['mime_type'] = 'text/markdown'
            
            if not value.get('extension'):
                value['extension'] = 'md'
            
            if not value.get('uploaded_at'):
                value['uploaded_at'] = value.get('converted_at', '2025-08-27 10:00:00')
            
            fixed_count += 1
        
        # Ensure all fields are present
        required_fields = [
            'original_filename', 'original_path', 'file_size', 
            'mime_type', 'extension', 'uploaded_at', 'original_checksum'
        ]
        
        for field in required_fields:
            if field not in value or value[field] is None or value[field] == "":
                if field == 'original_checksum':
                    value[field] = "placeholder_checksum"
                elif field == 'file_size':
                    value[field] = 0
                elif field == 'mime_type':
                    value[field] = 'application/octet-stream'
                elif field == 'extension':
                    value[field] = 'unknown'
                elif field == 'uploaded_at':
                    value[field] = '2025-08-27 10:00:00'
                else:
                    value[field] = "placeholder"
    
    # Save fixed metadata
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Fixed {fixed_count} metadata entries")

if __name__ == "__main__":
    fix_metadata()