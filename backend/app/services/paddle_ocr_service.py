"""
PaddleOCR Service - 画像からのテキスト抽出
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class PaddleOCRService:
    """PaddleOCRを使用した光学文字認識サービス"""
    
    def __init__(self):
        """初期化"""
        self.ocr = None
        self._initialized = False
        self._available = False
        self._initialize()
    
    def _initialize(self):
        """PaddleOCRの初期化"""
        try:
            # PaddleOCRのインポートを試みる
            from paddleocr import PaddleOCR
            
            # 日本語と英語の両方をサポート
            self.ocr = PaddleOCR(
                use_angle_cls=True,
                lang='japan',  # 日本語と英語の両方をサポート
                use_gpu=False,  # GPUを使用しない（互換性のため）
                show_log=False  # ログを非表示
            )
            self._initialized = True
            self._available = True
            logger.info("PaddleOCR initialized successfully")
        except ImportError:
            logger.warning("PaddleOCR not available. Install with: pip install paddlepaddle paddleocr")
            self._available = False
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")
            self._available = False
    
    def is_available(self) -> bool:
        """OCRサービスが利用可能か確認"""
        return self._available
    
    def extract_text(self, image_path: str) -> Optional[str]:
        """
        画像からテキストを抽出
        
        Args:
            image_path: 画像ファイルパス
            
        Returns:
            str: 抽出されたテキスト
        """
        if not self._available:
            logger.warning("PaddleOCR is not available")
            return None
        
        if not os.path.exists(image_path):
            logger.error(f"Image file not found: {image_path}")
            return None
        
        try:
            # OCR実行
            result = self.ocr.ocr(image_path, cls=True)
            
            if not result or not result[0]:
                return "No text detected in the image"
            
            # テキストを抽出して結合
            extracted_texts = []
            for line in result[0]:
                if line and len(line) > 1:
                    # line[1]にはテキストと信頼度が含まれる
                    text = line[1][0] if isinstance(line[1], tuple) else str(line[1])
                    confidence = line[1][1] if isinstance(line[1], tuple) and len(line[1]) > 1 else 0
                    
                    # 信頼度が低い場合は警告を追加
                    if confidence < 0.5:
                        text += " [low confidence]"
                    
                    extracted_texts.append(text)
            
            return '\n'.join(extracted_texts) if extracted_texts else "No text detected in the image"
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return f"OCR extraction failed: {str(e)}"
    
    def extract_text_with_layout(self, image_path: str) -> Optional[dict]:
        """
        画像からテキストをレイアウト情報付きで抽出
        
        Args:
            image_path: 画像ファイルパス
            
        Returns:
            dict: レイアウト情報を含むテキストデータ
        """
        if not self._available:
            return None
        
        if not os.path.exists(image_path):
            return None
        
        try:
            # OCR実行
            result = self.ocr.ocr(image_path, cls=True)
            
            if not result or not result[0]:
                return {"text": "", "blocks": []}
            
            # レイアウト情報を含むデータを構築
            blocks = []
            for line in result[0]:
                if line and len(line) > 1:
                    bbox = line[0]  # バウンディングボックス
                    text_info = line[1]
                    
                    block = {
                        "bbox": bbox,
                        "text": text_info[0] if isinstance(text_info, tuple) else str(text_info),
                        "confidence": text_info[1] if isinstance(text_info, tuple) and len(text_info) > 1 else 0
                    }
                    blocks.append(block)
            
            # 全テキストを結合
            full_text = '\n'.join([block["text"] for block in blocks])
            
            return {
                "text": full_text,
                "blocks": blocks
            }
            
        except Exception as e:
            logger.error(f"OCR extraction with layout failed: {e}")
            return None

# 簡易OCRフォールバック（PaddleOCRが利用できない場合）
class SimpleOCRFallback:
    """簡易OCRフォールバック実装"""
    
    @staticmethod
    def extract_text(image_path: str) -> str:
        """
        簡易的なテキスト抽出（フォールバック）
        実際にはOCRを実行せず、プレースホルダーを返す
        
        Args:
            image_path: 画像ファイルパス
            
        Returns:
            str: プレースホルダーテキスト
        """
        if not os.path.exists(image_path):
            return "Image file not found"
        
        # 実際のOCRは実行せず、メタ情報のみ返す
        file_name = os.path.basename(image_path)
        file_size = os.path.getsize(image_path) / 1024  # KB
        
        return (
            f"[OCR not available]\n"
            f"Image: {file_name}\n"
            f"Size: {file_size:.2f} KB\n"
            f"Note: Install PaddleOCR for text extraction from images."
        )