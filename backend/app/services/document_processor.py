"""
Enhanced document processor that includes image extraction and OCR
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Process documents with image extraction and OCR"""
    
    def __init__(self, doc_extractor=None, llm_client=None):
        self.doc_extractor = doc_extractor
        self.llm_client = llm_client
    
    def process_document_with_images(self, file_path: str, use_ai_mode: bool = False) -> str:
        """
        Process document and extract images with OCR
        
        Args:
            file_path: Path to document file
            
        Returns:
            Markdown content including extracted images and OCR text
        """
        if not self.doc_extractor:
            return ""
        
        # Extract images from document
        extraction_result = self.doc_extractor.extract_all_images(file_path)
        
        if not extraction_result['images']:
            return ""
        
        # Build markdown content
        markdown_parts = []
        markdown_parts.append("\n## Embedded Images\n")
        markdown_parts.append(f"*Found {extraction_result['total_images']} embedded images in the document*\n")
        
        for img_data in extraction_result['images']:
            markdown_parts.append(f"\n### Image {img_data.get('index', 'N/A')}")
            
            # Add location info
            if 'slide' in img_data:
                markdown_parts.append(f"*Location: Slide {img_data['slide']}*")
            elif 'sheet' in img_data:
                markdown_parts.append(f"*Location: Sheet {img_data['sheet']}*")
            elif 'page' in img_data:
                markdown_parts.append(f"*Location: Page {img_data['page']}*")
            
            # Add image properties
            if 'size' in img_data:
                markdown_parts.append(f"\n**Properties:**")
                markdown_parts.append(f"- Size: {img_data['size'][0]} x {img_data['size'][1]} pixels")
                if 'format' in img_data:
                    markdown_parts.append(f"- Format: {img_data['format']}")
                if 'mode' in img_data:
                    markdown_parts.append(f"- Mode: {img_data['mode']}")
            
            # Add OCR text if available
            ocr_text = img_data.get('ocr_text', '').strip()
            if ocr_text:
                markdown_parts.append(f"\n**画像内のテキスト (OCR抽出):**")
                markdown_parts.append("```")
                # Preserve full text for better accuracy
                # Remove low confidence markers for cleaner output
                clean_text = ocr_text.replace(' [low confidence:', '').replace(']', '')
                clean_text = clean_text.replace(' [unverified]', '')
                
                # Limit OCR text length for each image if needed
                if len(clean_text) > 2000:
                    markdown_parts.append(clean_text[:2000])
                    markdown_parts.append("... [テキストが長いため省略]")
                else:
                    markdown_parts.append(clean_text)
                markdown_parts.append("```")
            else:
                markdown_parts.append(f"\n*画像内にテキストが検出されませんでした*")
            
            # Add AI analysis if enabled and available
            if use_ai_mode and self.llm_client and self.llm_client.is_available():
                # Get temp file path if available
                temp_path = img_data.get('temp_path')
                if temp_path and os.path.exists(temp_path):
                    try:
                        # Get location context
                        location = ""
                        if 'slide' in img_data:
                            location = f"Slide {img_data['slide']}"
                        elif 'sheet' in img_data:
                            location = f"Sheet {img_data['sheet']}"
                        elif 'page' in img_data:
                            location = f"Page {img_data['page']}"
                        
                        ai_description = self.llm_client.describe_image(
                            temp_path,
                            context=f"Embedded image from document, {location}"
                        )
                        
                        markdown_parts.append(f"\n**AI Analysis:**")
                        markdown_parts.append(ai_description)
                    except Exception as e:
                        logger.error(f"AI analysis error for embedded image: {e}")
            
            markdown_parts.append("")  # Empty line between images
        
        # Clean up temporary files after all processing
        if self.doc_extractor and hasattr(self.doc_extractor, 'cleanup_temp_files'):
            self.doc_extractor.cleanup_temp_files(extraction_result['images'])
        
        return "\n".join(markdown_parts)
    
    def enhance_markdown_with_images(self, original_markdown: str, file_path: str, use_ai_mode: bool = False) -> str:
        """
        Enhance existing markdown with extracted images and OCR
        
        Args:
            original_markdown: Original markdown from document
            file_path: Path to document file
            
        Returns:
            Enhanced markdown with image content
        """
        # Get image content
        image_content = self.process_document_with_images(file_path, use_ai_mode)
        
        if not image_content:
            return original_markdown
        
        # Append image content to original markdown
        return original_markdown + "\n" + image_content