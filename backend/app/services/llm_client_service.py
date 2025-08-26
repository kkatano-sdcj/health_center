"""
LLM Client Service for AI-enhanced document conversion
Provides intelligent image description and document analysis
"""
import os
import base64
import logging
from typing import Optional, Dict, Any, List
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Try to import OpenAI client
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not available")

class LLMClientService:
    """LLM client for AI-enhanced conversions"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize LLM client
        
        Args:
            api_key: OpenAI API key (optional, can use env var)
        """
        self.client = None
        self.model = "gpt-4o-mini"  # Default model for vision capabilities
        
        if OPENAI_AVAILABLE:
            try:
                # Use provided API key or get from environment
                key = api_key or os.getenv("OPENAI_API_KEY")
                if key:
                    self.client = OpenAI(api_key=key)
                    logger.info("OpenAI client initialized successfully")
                else:
                    logger.warning("No OpenAI API key provided")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def is_available(self) -> bool:
        """Check if LLM client is available"""
        return self.client is not None
    
    def describe_image(self, image_path: str, context: str = "") -> str:
        """
        Generate intelligent description of an image
        
        Args:
            image_path: Path to image file
            context: Additional context about the image (e.g., document type, location)
            
        Returns:
            AI-generated description of the image
        """
        if not self.is_available():
            return "AI description not available (LLM client not configured)"
        
        try:
            # Load and encode image
            with open(image_path, 'rb') as img_file:
                image_data = base64.b64encode(img_file.read()).decode('utf-8')
            
            # Prepare prompt
            prompt = f"""Please analyze this image and provide:
1. A brief description of what the image contains
2. Any text visible in the image (if applicable)
3. The type of content (diagram, chart, photo, screenshot, etc.)
4. Key information or data points shown

Context: {context if context else 'This image was extracted from a document.'}

Please be concise but thorough."""
            
            # Call OpenAI Vision API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error describing image: {e}")
            return f"Error generating AI description: {str(e)}"
    
    def enhance_document_content(self, 
                                markdown_content: str, 
                                document_type: str,
                                extracted_images: List[Dict[str, Any]] = None) -> str:
        """
        Enhance document content with AI analysis
        
        Args:
            markdown_content: Original markdown content
            document_type: Type of document (docx, pptx, pdf, etc.)
            extracted_images: List of extracted images with metadata
            
        Returns:
            Enhanced markdown with AI insights
        """
        if not self.is_available():
            return markdown_content
        
        try:
            prompt = f"""You are analyzing a {document_type} document that has been converted to markdown.
            
Original content:
{markdown_content[:3000]}  # Limit to avoid token issues

Please provide:
1. A brief summary of the document's main topics
2. Key points or takeaways
3. Document structure analysis
4. Any notable data or findings

Keep the response in markdown format."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a document analysis assistant."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000
            )
            
            # Add AI analysis section to markdown
            ai_section = f"\n\n## AI Document Analysis\n\n{response.choices[0].message.content}\n"
            
            return markdown_content + ai_section
            
        except Exception as e:
            logger.error(f"Error enhancing document: {e}")
            return markdown_content
    
    def analyze_chart_data(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze chart or graph data from image
        
        Args:
            image_path: Path to chart/graph image
            
        Returns:
            Extracted data and analysis
        """
        if not self.is_available():
            return {"error": "AI analysis not available"}
        
        try:
            with open(image_path, 'rb') as img_file:
                image_data = base64.b64encode(img_file.read()).decode('utf-8')
            
            prompt = """If this image contains a chart, graph, or data visualization:
1. Identify the type of visualization
2. Extract the data points or values if visible
3. Describe the trends or patterns
4. Note any key insights

If it's not a data visualization, just describe what you see."""
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=700
            )
            
            return {
                "analysis": response.choices[0].message.content,
                "type": "chart_analysis"
            }
            
        except Exception as e:
            logger.error(f"Error analyzing chart: {e}")
            return {"error": str(e)}
    
    def compare_images(self, image_paths: List[str]) -> str:
        """
        Compare multiple images and describe differences/similarities
        
        Args:
            image_paths: List of paths to images to compare
            
        Returns:
            Comparison analysis
        """
        if not self.is_available() or len(image_paths) < 2:
            return "Image comparison not available"
        
        try:
            # Encode all images
            encoded_images = []
            for path in image_paths[:4]:  # Limit to 4 images
                with open(path, 'rb') as img_file:
                    encoded_images.append(base64.b64encode(img_file.read()).decode('utf-8'))
            
            # Build message content
            content = [
                {"type": "text", "text": "Please compare these images and describe their similarities and differences. Note any progression, changes, or relationships between them."}
            ]
            
            for i, img_data in enumerate(encoded_images):
                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{img_data}"
                    }
                })
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": content}],
                max_tokens=800
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error comparing images: {e}")
            return f"Error in comparison: {str(e)}"
    
    def extract_structured_data(self, text: str, structure_hint: str = "") -> Dict[str, Any]:
        """
        Extract structured data from text
        
        Args:
            text: Text to extract data from
            structure_hint: Hint about expected structure (e.g., "table", "list", "form")
            
        Returns:
            Structured data dictionary
        """
        if not self.is_available():
            return {"error": "AI extraction not available"}
        
        try:
            prompt = f"""Extract structured data from the following text.
{f'Expected structure: {structure_hint}' if structure_hint else ''}

Text:
{text[:2000]}

Return the data in a clear, structured format (JSON-like structure preferred)."""
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a data extraction specialist. Extract and structure data clearly."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800
            )
            
            return {
                "extracted_data": response.choices[0].message.content,
                "structure_type": structure_hint or "auto-detected"
            }
            
        except Exception as e:
            logger.error(f"Error extracting structured data: {e}")
            return {"error": str(e)}
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of LLM service"""
        return {
            "available": self.is_available(),
            "provider": "OpenAI" if OPENAI_AVAILABLE else "None",
            "model": self.model if self.is_available() else None,
            "capabilities": [
                "image_description",
                "document_analysis", 
                "chart_analysis",
                "image_comparison",
                "structured_extraction"
            ] if self.is_available() else []
        }


class MockLLMService:
    """Mock LLM service for testing without API key"""
    
    def is_available(self) -> bool:
        return True
    
    def describe_image(self, image_path: str, context: str = "") -> str:
        """Mock image description"""
        return f"""[AI Mock Description]
This appears to be an image from a document.
Context: {context if context else 'Document image'}

Note: This is a mock description. Configure OpenAI API key for real AI analysis."""
    
    def enhance_document_content(self, markdown_content: str, 
                                document_type: str,
                                extracted_images: List[Dict[str, Any]] = None) -> str:
        """Mock document enhancement"""
        mock_analysis = f"""
## AI Document Analysis (Mock)

**Document Type:** {document_type}

**Summary:** This document has been processed in mock AI mode. 
Configure OpenAI API key for intelligent document analysis.

**Image Count:** {len(extracted_images) if extracted_images else 0} images found"""
        
        return markdown_content + mock_analysis
    
    def analyze_chart_data(self, image_path: str) -> Dict[str, Any]:
        return {
            "analysis": "Mock chart analysis - configure API for real analysis",
            "type": "mock"
        }
    
    def compare_images(self, image_paths: List[str]) -> str:
        return f"Mock comparison of {len(image_paths)} images"
    
    def extract_structured_data(self, text: str, structure_hint: str = "") -> Dict[str, Any]:
        return {
            "extracted_data": "Mock extraction",
            "structure_type": "mock"
        }
    
    def get_status(self) -> Dict[str, Any]:
        return {
            "available": True,
            "provider": "Mock",
            "model": "mock-model",
            "capabilities": ["mock_mode"]
        }