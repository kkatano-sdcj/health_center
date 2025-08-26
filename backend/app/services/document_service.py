from fastapi import UploadFile
import PyPDF2
import io
from typing import Optional

class DocumentService:
    async def process_document(self, file: UploadFile) -> str:
        """アップロードされたドキュメントを処理してテキストを抽出"""
        content = await file.read()
        
        if file.content_type == "application/pdf":
            return self._extract_pdf_text(content)
        elif file.content_type == "text/plain":
            return content.decode("utf-8")
        else:
            # その他のファイルタイプの処理
            return content.decode("utf-8", errors="ignore")
    
    def _extract_pdf_text(self, pdf_content: bytes) -> str:
        """PDFからテキストを抽出"""
        text_parts = []
        
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                text_parts.append(text)
            
            return "\n".join(text_parts)
        except Exception as e:
            raise Exception(f"PDF processing error: {str(e)}")