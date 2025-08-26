"""
Enhanced file conversion service with support for:
- Images (with EXIF metadata and OCR)
- Audio (with metadata and speech transcription)
- Text-based formats (CSV, JSON, XML)
- ZIP files (iterates over contents)
- YouTube URLs
"""
import os
import time
import uuid
import json
import csv
import zipfile
import tempfile
import re
import base64
from typing import Optional, Dict, Any, List
from markitdown import MarkItDown
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
from app.models.data_models import ConversionResult, ConversionStatus
from .mock_firebase_service import MockFirebaseService
from .mock_ocr_service import MockOCRService
from .paddle_ocr_service import PaddleOCRService
from .document_image_extractor import DocumentImageExtractor
from .document_processor import DocumentProcessor
from .llm_client_service import LLMClientService, MockLLMService
import logging

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import pytesseract
    # Check if tesseract is actually installed
    try:
        pytesseract.get_tesseract_version()
        TESSERACT_AVAILABLE = True
    except:
        TESSERACT_AVAILABLE = False
except ImportError:
    TESSERACT_AVAILABLE = False

logger = logging.getLogger(__name__)

class EnhancedConversionService:
    """Enhanced file conversion service with support for various formats"""
    
    def __init__(self):
        self.upload_dir = "./uploads"
        self.output_dir = "./converted"
        self.md = MarkItDown()
        self.firebase_service = MockFirebaseService()
        self.mock_ocr = MockOCRService()
        self.paddle_ocr = PaddleOCRService()
        self.enable_database = True
        
        # Initialize document image extractor with OCR service
        if self.paddle_ocr.is_available():
            self.doc_extractor = DocumentImageExtractor(ocr_service=self.paddle_ocr)
            logger.info("PaddleOCR is available for text extraction")
        else:
            self.doc_extractor = DocumentImageExtractor(ocr_service=self.mock_ocr)
            if TESSERACT_AVAILABLE:
                logger.info("Tesseract OCR is available for text extraction")
            else:
                logger.info("No OCR engine available, using mock OCR service")
        
        # Initialize document processor for enhanced document handling
        # Will be initialized with LLM client after it's set up
        self.doc_processor = None
        
        # Initialize LLM client for AI mode
        try:
            # Load OpenAI API key from environment
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                logger.info("OpenAI API key found in environment")
            
            self.llm_client = LLMClientService(api_key=api_key)
            if not self.llm_client.is_available():
                logger.info("Using mock LLM service - configure OpenAI API key for AI features")
                self.llm_client = MockLLMService()
            else:
                logger.info("LLM client initialized with OpenAI API")
        except Exception as e:
            logger.warning(f"Failed to initialize LLM client: {e}")
            self.llm_client = MockLLMService()
        
        # Now initialize document processor with both extractors and LLM
        self.doc_processor = DocumentProcessor(
            doc_extractor=self.doc_extractor,
            llm_client=self.llm_client
        )
        
        # Ensure directories exist
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        
    def is_youtube_url(self, text: str) -> bool:
        """Check if the text is a YouTube URL"""
        youtube_patterns = [
            r'(https?://)?(www\.)?(youtube\.com|youtu\.be)/',
            r'(https?://)?(www\.)?youtube\.com/watch\?v=',
            r'(https?://)?(www\.)?youtu\.be/'
        ]
        return any(re.match(pattern, text) for pattern in youtube_patterns)
    
    def extract_youtube_id(self, url: str) -> Optional[str]:
        """Extract YouTube video ID from URL"""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n]+)',
            r'youtube\.com\/embed\/([^&\n]+)',
            r'youtube\.com\/v\/([^&\n]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    async def convert_youtube_url(self, url: str) -> str:
        """Convert YouTube URL to markdown with metadata"""
        video_id = self.extract_youtube_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL")
        
        # Create markdown with embedded video and metadata
        markdown = f"""# YouTube Video

## Video Link
[Watch on YouTube]({url})

## Embedded Video
[![YouTube Video](https://img.youtube.com/vi/{video_id}/maxresdefault.jpg)]({url})

## Video ID
`{video_id}`

## Notes
- Original URL: {url}
- To get transcription, you may need to use YouTube's automatic captions or a transcription service
- Video metadata can be fetched using YouTube Data API
"""
        return markdown
    
    async def convert_zip_file(self, zip_path: str) -> str:
        """Convert ZIP file contents to markdown"""
        markdown_parts = [f"# ZIP Archive: {os.path.basename(zip_path)}\n"]
        
        with zipfile.ZipFile(zip_path, 'r') as zip_file:
            # List all files in the archive
            markdown_parts.append("## Archive Contents\n")
            for info in zip_file.filelist:
                size_kb = info.file_size / 1024
                markdown_parts.append(f"- **{info.filename}** ({size_kb:.2f} KB)")
            
            markdown_parts.append("\n## Extracted Content\n")
            
            # Extract and convert each supported file
            with tempfile.TemporaryDirectory() as temp_dir:
                for file_info in zip_file.filelist:
                    if file_info.is_dir():
                        continue
                    
                    file_name = file_info.filename
                    markdown_parts.append(f"\n### {file_name}\n")
                    
                    try:
                        # Extract file
                        extracted_path = zip_file.extract(file_name, temp_dir)
                        
                        # Try to convert with markitdown
                        result = self.md.convert(extracted_path)
                        if result and result.text_content:
                            markdown_parts.append(result.text_content[:5000])  # Limit content per file
                            if len(result.text_content) > 5000:
                                markdown_parts.append("\n*[Content truncated...]*")
                        else:
                            markdown_parts.append("*[File format not supported for conversion]*")
                    except Exception as e:
                        markdown_parts.append(f"*[Error processing file: {str(e)}]*")
        
        return "\n".join(markdown_parts)
    
    async def convert_json_file(self, json_path: str) -> str:
        """Convert JSON file to formatted markdown"""
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        markdown = f"# JSON File: {os.path.basename(json_path)}\n\n"
        markdown += "```json\n"
        markdown += json.dumps(data, indent=2, ensure_ascii=False)
        markdown += "\n```\n\n"
        
        # Add structured view for better readability
        markdown += "## Structured View\n\n"
        markdown += self._json_to_markdown(data)
        
        return markdown
    
    def _json_to_markdown(self, data, level=0) -> str:
        """Convert JSON data to readable markdown structure"""
        markdown = ""
        indent = "  " * level
        
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    markdown += f"{indent}- **{key}**:\n"
                    markdown += self._json_to_markdown(value, level + 1)
                else:
                    markdown += f"{indent}- **{key}**: {value}\n"
        elif isinstance(data, list):
            for i, item in enumerate(data):
                if isinstance(item, (dict, list)):
                    markdown += f"{indent}- Item {i + 1}:\n"
                    markdown += self._json_to_markdown(item, level + 1)
                else:
                    markdown += f"{indent}- {item}\n"
        else:
            markdown += f"{indent}- {data}\n"
        
        return markdown
    
    async def convert_image_file(self, image_path: str, use_ai_mode: bool = False) -> str:
        """Convert image file to markdown with metadata and OCR
        
        Args:
            image_path: Path to image file
            use_ai_mode: Whether to use AI-enhanced description
        """
        markdown = f"# Image File: {os.path.basename(image_path)}\n\n"
        
        if PIL_AVAILABLE:
            try:
                with Image.open(image_path) as img:
                    # Basic image information
                    markdown += "## Image Information\n\n"
                    markdown += f"- **Format**: {img.format}\n"
                    markdown += f"- **Mode**: {img.mode}\n"
                    markdown += f"- **Size**: {img.width} x {img.height} pixels\n"
                    
                    # EXIF data if available
                    exifdata = img.getexif()
                    if exifdata:
                        markdown += "\n## EXIF Metadata\n\n"
                        exif_count = 0
                        for tag_id, value in exifdata.items():
                            tag = TAGS.get(tag_id, tag_id)
                            if isinstance(value, bytes):
                                value = value.decode('utf-8', errors='ignore')
                            if value and str(value).strip():
                                markdown += f"- **{tag}**: {value}\n"
                                exif_count += 1
                                if exif_count >= 10:  # Limit EXIF data to avoid clutter
                                    markdown += "- *[More EXIF data available...]*\n"
                                    break
                    
                    # File size
                    file_size = os.path.getsize(image_path)
                    markdown += f"\n## File Information\n\n"
                    markdown += f"- **File Size**: {file_size / 1024:.2f} KB\n"
                    markdown += f"- **File Path**: {image_path}\n"
                    
                    # OCR - Try to extract text from image
                    markdown += "\n## Text Content (OCR)\n\n"
                    text_extracted = False
                    
                    # Try PaddleOCR first (best option)
                    if self.paddle_ocr.is_available():
                        try:
                            # Save image temporarily for PaddleOCR
                            temp_path = f"/tmp/temp_paddle_ocr_{os.getpid()}.png"
                            img.save(temp_path)
                            
                            # Perform OCR with PaddleOCR
                            extracted_text = self.paddle_ocr.extract_text(temp_path)
                            
                            if extracted_text and extracted_text != "No text detected in the image.":
                                markdown += "### Extracted Text (PaddleOCR):\n\n"
                                markdown += "```\n"
                                markdown += extracted_text
                                markdown += "\n```\n"
                                text_extracted = True
                                
                                # Also get detailed results with confidence
                                details = self.paddle_ocr.extract_text_with_details(temp_path)
                                if details:
                                    markdown += "\n### Detection Confidence:\n\n"
                                    for text, confidence in details[:10]:  # Show first 10 items
                                        markdown += f"- **{text}**: {confidence:.2%}\n"
                                    if len(details) > 10:
                                        markdown += f"- *... and {len(details) - 10} more text regions*\n"
                            else:
                                markdown += "*No text detected in the image using PaddleOCR.*\n"
                            
                            # Clean up temp file
                            if os.path.exists(temp_path):
                                os.remove(temp_path)
                                
                        except Exception as paddle_error:
                            logger.error(f"PaddleOCR error: {str(paddle_error)}")
                            markdown += f"*PaddleOCR error: {str(paddle_error)}*\n"
                    
                    # Try Tesseract if PaddleOCR failed
                    if not text_extracted and TESSERACT_AVAILABLE:
                        try:
                            # Perform real OCR with Tesseract
                            langs = pytesseract.get_languages()
                            lang_config = 'eng+jpn' if 'jpn' in langs else 'eng'
                            text = pytesseract.image_to_string(img, lang=lang_config)
                            
                            if text and text.strip():
                                markdown += "### Extracted Text (Tesseract OCR):\n\n"
                                markdown += "```\n"
                                markdown += text.strip()
                                markdown += "\n```\n"
                                text_extracted = True
                            else:
                                markdown += "*No text detected in the image using Tesseract OCR.*\n"
                        except Exception as ocr_error:
                            logger.error(f"Tesseract OCR error: {str(ocr_error)}")
                    
                    # Use mock OCR if no real OCR is available or all failed
                    if not text_extracted:
                        try:
                            # Save image temporarily for mock OCR
                            temp_path = f"/tmp/temp_mock_ocr_{os.getpid()}.png"
                            img.save(temp_path)
                            
                            # Use mock OCR service
                            mock_text = self.mock_ocr.extract_text(temp_path)
                            markdown += "### Extracted Text (Demo Mode):\n\n"
                            markdown += "```\n"
                            markdown += mock_text
                            markdown += "\n```\n"
                            markdown += "\n*Note: This is demonstration text. For actual OCR, install:*\n"
                            markdown += "*- PaddleOCR: `pip install paddlepaddle paddleocr`*\n"
                            markdown += "*- Or Tesseract: `sudo apt-get install tesseract-ocr tesseract-ocr-jpn`*\n"
                            
                            # Clean up temp file
                            if os.path.exists(temp_path):
                                os.remove(temp_path)
                                
                        except Exception as mock_error:
                            logger.error(f"Mock OCR error: {str(mock_error)}")
                            markdown += "*OCR not available. Please install PaddleOCR or Tesseract.*\n"
                    
                    # AI-enhanced description if enabled
                    if use_ai_mode and self.llm_client.is_available():
                        markdown += "\n## AI Image Analysis\n\n"
                        try:
                            # Get AI description
                            ai_description = self.llm_client.describe_image(
                                image_path,
                                context=f"Image file: {os.path.basename(image_path)}, Format: {img.format}, Size: {img.width}x{img.height}"
                            )
                            markdown += ai_description + "\n"
                            
                            # If it might be a chart, get chart analysis
                            if any(keyword in ai_description.lower() for keyword in ['chart', 'graph', 'diagram', 'plot']):
                                chart_analysis = self.llm_client.analyze_chart_data(image_path)
                                if 'analysis' in chart_analysis:
                                    markdown += "\n### Chart/Graph Analysis:\n\n"
                                    markdown += chart_analysis['analysis'] + "\n"
                        except Exception as ai_error:
                            logger.error(f"AI analysis error: {ai_error}")
                            markdown += f"*AI analysis failed: {str(ai_error)}*\n"
                    
                    # Create thumbnail and base64 representation
                    markdown += "\n## Image Preview\n\n"
                    try:
                        # Create a thumbnail for preview
                        max_size = (800, 800)
                        img.thumbnail(max_size, Image.Resampling.LANCZOS)
                        
                        # Convert to base64 for embedding
                        import io
                        buffer = io.BytesIO()
                        img.save(buffer, format=img.format if img.format else 'PNG')
                        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
                        
                        # Add base64 image as markdown
                        markdown += f"![Image]("
                        markdown += f"data:image/{img.format.lower() if img.format else 'png'};"
                        markdown += f"base64,{img_base64[:100]}...)"
                        markdown += "\n\n*Note: Base64 preview truncated. Full image data available in original file.*\n"
                        
                    except Exception as preview_error:
                        markdown += f"*Could not generate preview: {str(preview_error)}*\n"
                    
            except Exception as e:
                markdown += f"\n*Error processing image: {str(e)}*\n"
        else:
            # Fallback when PIL is not available
            markdown += "## Image File\n\n"
            markdown += f"- **File**: {os.path.basename(image_path)}\n"
            markdown += f"- **Size**: {os.path.getsize(image_path) / 1024:.2f} KB\n"
            markdown += "\n*Note: Install Pillow library for enhanced image metadata extraction.*\n"
        
        # Try markitdown as a secondary method
        markdown += "\n## Alternative Processing (MarkItDown)\n\n"
        try:
            result = self.md.convert(image_path)
            if result and result.text_content and result.text_content.strip():
                markdown += result.text_content
            else:
                markdown += "*MarkItDown did not extract additional content from this image.*\n"
        except Exception as md_error:
            markdown += f"*MarkItDown processing failed: {str(md_error)}*\n"
        
        return markdown
    
    async def convert_csv_file(self, csv_path: str) -> str:
        """Convert CSV file to markdown table"""
        markdown = f"# CSV File: {os.path.basename(csv_path)}\n\n"
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
            
            if not rows:
                return markdown + "*Empty CSV file*"
            
            # Create markdown table
            headers = rows[0]
            markdown += "| " + " | ".join(headers) + " |\n"
            markdown += "| " + " | ".join(["---"] * len(headers)) + " |\n"
            
            for row in rows[1:]:
                # Ensure row has same number of columns as headers
                while len(row) < len(headers):
                    row.append("")
                markdown += "| " + " | ".join(row[:len(headers)]) + " |\n"
        
        return markdown
    
    async def convert_file_enhanced(self, input_path: str, output_filename: str, 
                                   is_url: bool = False, url_content: str = None,
                                   use_ai_mode: bool = False) -> ConversionResult:
        """
        Enhanced file conversion with support for various formats
        
        Args:
            input_path: Path to input file or URL
            output_filename: Output filename
            is_url: Whether input is a URL
            url_content: Content if it's a URL (e.g., YouTube URL)
            use_ai_mode: Whether to use AI-enhanced conversion mode
        """
        conversion_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            output_path = os.path.join(self.output_dir, output_filename)
            
            # Handle YouTube URLs
            if is_url and url_content:
                markdown_content = await self.convert_youtube_url(url_content)
            else:
                # Determine file type and use appropriate conversion
                file_ext = os.path.splitext(input_path)[1].lower()[1:]
                
                if file_ext == 'zip':
                    markdown_content = await self.convert_zip_file(input_path)
                elif file_ext == 'json':
                    markdown_content = await self.convert_json_file(input_path)
                elif file_ext == 'csv':
                    markdown_content = await self.convert_csv_file(input_path)
                elif file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                    markdown_content = await self.convert_image_file(input_path, use_ai_mode)
                else:
                    # Use markitdown for all other formats
                    result = self.md.convert(input_path)
                    markdown_content = result.text_content
                    if not markdown_content:
                        # Fallback for unsupported formats
                        markdown_content = f"# File: {os.path.basename(input_path)}\n\n"
                        markdown_content += f"File type: {file_ext}\n"
                        markdown_content += f"File size: {os.path.getsize(input_path) / 1024:.2f} KB\n"
                        markdown_content += "\n*This file format may not be fully supported for content extraction.*"
                    
                    # For Office documents and PDFs, enhance with extracted images
                    if file_ext in ['docx', 'pptx', 'xlsx', 'pdf']:
                        try:
                            # Enhance markdown with extracted images and OCR
                            enhanced_markdown = self.doc_processor.enhance_markdown_with_images(
                                original_markdown=markdown_content,
                                file_path=input_path,
                                use_ai_mode=use_ai_mode
                            )
                            markdown_content = enhanced_markdown
                            logger.info(f"Enhanced {file_ext} document with extracted images")
                        except Exception as e:
                            logger.error(f"Error enhancing document with images: {e}")
                            # Keep original markdown if enhancement fails
            
            # Save to file
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            
            # Save to database if enabled
            if self.enable_database:
                metadata = {
                    'original_filename': os.path.basename(input_path) if not is_url else url_content,
                    'converted_filename': output_filename,
                    'file_size': os.path.getsize(input_path) if not is_url else 0,
                    'conversion_time': time.time(),
                    'is_url': is_url
                }
                
                self.firebase_service.save_markdown(
                    file_id=conversion_id,
                    content=markdown_content,
                    metadata=metadata
                )
            
            processing_time = time.time() - start_time
            
            return ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(input_path) if not is_url else url_content,
                output_file=output_filename,
                status=ConversionStatus.COMPLETED,
                processing_time=processing_time,
                markdown_content=markdown_content
            )
            
        except Exception as e:
            logger.error(f"Conversion error: {str(e)}")
            return ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(input_path) if not is_url else url_content,
                status=ConversionStatus.FAILED,
                error_message=f"Conversion error: {str(e)}",
                processing_time=time.time() - start_time
            )
    
    async def batch_convert_enhanced(self, items: List[Dict[str, Any]]) -> List[ConversionResult]:
        """
        Batch conversion with support for mixed file types and URLs
        
        Args:
            items: List of items to convert, each can be a file path or URL
        """
        results = []
        
        for item in items:
            if isinstance(item, str):
                # Simple file path
                if self.is_youtube_url(item):
                    output_filename = f"youtube_{uuid.uuid4().hex[:8]}.md"
                    result = await self.convert_file_enhanced(
                        "", output_filename, is_url=True, url_content=item
                    )
                else:
                    base_name = os.path.splitext(os.path.basename(item))[0]
                    output_filename = f"{base_name}.md"
                    result = await self.convert_file_enhanced(item, output_filename)
            else:
                # Dict with more info
                file_path = item.get('path', '')
                url = item.get('url', '')
                
                if url:
                    output_filename = f"url_{uuid.uuid4().hex[:8]}.md"
                    result = await self.convert_file_enhanced(
                        "", output_filename, is_url=True, url_content=url
                    )
                else:
                    base_name = os.path.splitext(os.path.basename(file_path))[0]
                    output_filename = f"{base_name}.md"
                    result = await self.convert_file_enhanced(file_path, output_filename)
            
            results.append(result)
        
        return results