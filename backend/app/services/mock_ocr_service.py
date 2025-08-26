"""
Mock OCR Service for demonstration when Tesseract is not available
"""
import re
from PIL import Image
import numpy as np

class MockOCRService:
    """Mock OCR service that provides sample text extraction"""
    
    def __init__(self):
        self.sample_texts = {
            'default': "This is sample text extracted from the image.\nOCR functionality will be fully available once Tesseract is installed.",
            'red': "This appears to be a red/warm colored image.\nSample text: Color Analysis Report",
            'blue': "This appears to be a blue/cool colored image.\nSample text: Technical Documentation",
            'green': "This appears to be a green colored image.\nSample text: Environmental Report",
            'dark': "This appears to be a dark image.\nSample text: Low light conditions detected",
            'bright': "This appears to be a bright image.\nSample text: High exposure detected",
            'small': "Small image detected.\nSample text: Thumbnail or icon",
            'large': "Large image detected.\nSample text: High resolution content"
        }
    
    def extract_text(self, image_path: str) -> str:
        """
        Mock text extraction based on image properties
        Returns sample text based on image characteristics
        """
        try:
            with Image.open(image_path) as img:
                # Analyze image properties
                width, height = img.size
                
                # Convert to RGB if necessary
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Sample a few pixels to determine dominant color
                pixels = []
                sample_points = min(100, width * height)
                for _ in range(sample_points):
                    x = np.random.randint(0, width)
                    y = np.random.randint(0, height)
                    pixels.append(img.getpixel((x, y)))
                
                # Calculate average color
                avg_r = sum(p[0] for p in pixels) / len(pixels)
                avg_g = sum(p[1] for p in pixels) / len(pixels)
                avg_b = sum(p[2] for p in pixels) / len(pixels)
                
                # Determine text based on characteristics
                text_parts = []
                
                # Size-based text
                if width * height < 10000:
                    text_parts.append(self.sample_texts['small'])
                elif width * height > 500000:
                    text_parts.append(self.sample_texts['large'])
                
                # Color-based text
                brightness = (avg_r + avg_g + avg_b) / 3
                if brightness < 50:
                    text_parts.append(self.sample_texts['dark'])
                elif brightness > 200:
                    text_parts.append(self.sample_texts['bright'])
                elif avg_r > avg_g and avg_r > avg_b:
                    text_parts.append(self.sample_texts['red'])
                elif avg_g > avg_r and avg_g > avg_b:
                    text_parts.append(self.sample_texts['green'])
                elif avg_b > avg_r and avg_b > avg_g:
                    text_parts.append(self.sample_texts['blue'])
                
                # Add default text if no specific characteristics
                if not text_parts:
                    text_parts.append(self.sample_texts['default'])
                
                # Add mock extracted text
                text_parts.append("\n--- Mock Extracted Text ---")
                text_parts.append(f"Image: {image_path}")
                text_parts.append(f"Dimensions: {width}x{height}")
                text_parts.append(f"Mode: {img.mode}")
                text_parts.append("\nSample extracted content:")
                text_parts.append("Lorem ipsum dolor sit amet, consectetur adipiscing elit.")
                text_parts.append("This is demonstration text that would be replaced with actual OCR results.")
                text_parts.append("\n[Install Tesseract for real text extraction]")
                
                return "\n".join(text_parts)
                
        except Exception as e:
            return f"Mock OCR Error: {str(e)}\n\nPlease install Tesseract for actual text extraction."

    def is_available(self) -> bool:
        """Check if mock OCR is available (always True for mock)"""
        return True
    
    def get_status(self) -> dict:
        """Get status of OCR service"""
        return {
            'type': 'mock',
            'available': True,
            'message': 'Using mock OCR. Install Tesseract for real text extraction.',
            'languages': ['en', 'ja (simulated)'],
            'installation_required': 'sudo apt-get install tesseract-ocr tesseract-ocr-jpn'
        }