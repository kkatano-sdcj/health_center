"""
Legacy file format converter
Handles conversion of old binary formats (DOC, XLS, PPT) that markitdown cannot process directly
"""
import os
import logging
import subprocess
from typing import Optional, Tuple
import shutil

logger = logging.getLogger(__name__)

class LegacyConverter:
    """Converter for legacy Microsoft Office binary formats"""
    
    def __init__(self):
        self.supported_formats = {
            'ppt': self._convert_ppt,
            'doc': self._convert_doc,
            'xls': self._convert_xls
        }
    
    def can_convert(self, file_path: str) -> bool:
        """Check if this converter can handle the file"""
        ext = os.path.splitext(file_path)[1].lower()[1:]
        return ext in self.supported_formats
    
    def convert(self, file_path: str) -> Tuple[bool, str]:
        """
        Convert legacy file to modern format
        
        Returns:
            Tuple of (success, converted_path_or_error_message)
        """
        ext = os.path.splitext(file_path)[1].lower()[1:]
        
        if ext not in self.supported_formats:
            return False, f"Unsupported format: {ext}"
        
        return self.supported_formats[ext](file_path)
    
    def _convert_ppt(self, file_path: str) -> Tuple[bool, str]:
        """Convert PPT to PPTX"""
        # First, try to detect if it's actually a renamed PPTX
        if self._is_renamed_pptx(file_path):
            # It's actually a PPTX file with PPT extension
            new_path = file_path.replace('.ppt', '.pptx')
            shutil.copy2(file_path, new_path)
            return True, new_path
        
        # Try using LibreOffice if available
        if self._has_libreoffice():
            return self._convert_with_libreoffice(file_path, 'pptx')
        
        # If it's a true binary PPT and no converter available
        return False, (
            "このファイルは古いバイナリ形式のPPTファイルです。\n"
            "変換するには以下のいずれかの方法をお試しください：\n"
            "1. Microsoft PowerPointで開いて.pptx形式で保存し直す\n"
            "2. Google SlidesやLibreOfficeで開いて.pptx形式でエクスポート\n"
            "3. オンライン変換ツールを使用してPPTXに変換"
        )
    
    def _convert_doc(self, file_path: str) -> Tuple[bool, str]:
        """Convert DOC to DOCX"""
        # First, try to detect if it's actually a renamed DOCX
        if self._is_renamed_docx(file_path):
            new_path = file_path.replace('.doc', '.docx')
            shutil.copy2(file_path, new_path)
            return True, new_path
        
        # Try using LibreOffice if available
        if self._has_libreoffice():
            return self._convert_with_libreoffice(file_path, 'docx')
        
        return False, (
            "このファイルは古いバイナリ形式のDOCファイルです。\n"
            "変換するには以下のいずれかの方法をお試しください：\n"
            "1. Microsoft Wordで開いて.docx形式で保存し直す\n"
            "2. Google DocsやLibreOfficeで開いて.docx形式でエクスポート\n"
            "3. オンライン変換ツールを使用してDOCXに変換"
        )
    
    def _convert_xls(self, file_path: str) -> Tuple[bool, str]:
        """Convert XLS to XLSX"""
        # First, try to detect if it's actually a renamed XLSX
        if self._is_renamed_xlsx(file_path):
            new_path = file_path.replace('.xls', '.xlsx')
            shutil.copy2(file_path, new_path)
            return True, new_path
        
        # Try using LibreOffice if available
        if self._has_libreoffice():
            return self._convert_with_libreoffice(file_path, 'xlsx')
        
        return False, (
            "このファイルは古いバイナリ形式のXLSファイルです。\n"
            "変換するには以下のいずれかの方法をお試しください：\n"
            "1. Microsoft Excelで開いて.xlsx形式で保存し直す\n"
            "2. Google SheetsやLibreOfficeで開いて.xlsx形式でエクスポート\n"
            "3. オンライン変換ツールを使用してXLSXに変換"
        )
    
    def _is_renamed_pptx(self, file_path: str) -> bool:
        """Check if a .ppt file is actually a PPTX in disguise"""
        try:
            # PPTX files are actually ZIP archives
            import zipfile
            with zipfile.ZipFile(file_path, 'r') as z:
                # Check for PPTX structure
                namelist = z.namelist()
                return any('ppt/' in name for name in namelist)
        except:
            return False
    
    def _is_renamed_docx(self, file_path: str) -> bool:
        """Check if a .doc file is actually a DOCX in disguise"""
        try:
            import zipfile
            with zipfile.ZipFile(file_path, 'r') as z:
                namelist = z.namelist()
                return any('word/' in name for name in namelist)
        except:
            return False
    
    def _is_renamed_xlsx(self, file_path: str) -> bool:
        """Check if a .xls file is actually a XLSX in disguise"""
        try:
            import zipfile
            with zipfile.ZipFile(file_path, 'r') as z:
                namelist = z.namelist()
                return any('xl/' in name for name in namelist)
        except:
            return False
    
    def _has_libreoffice(self) -> bool:
        """Check if LibreOffice is available"""
        try:
            result = subprocess.run(['which', 'libreoffice'], 
                                  capture_output=True, text=True)
            return result.returncode == 0
        except:
            return False
    
    def _convert_with_libreoffice(self, file_path: str, output_format: str) -> Tuple[bool, str]:
        """Convert file using LibreOffice"""
        try:
            output_dir = os.path.dirname(file_path)
            base_name = os.path.splitext(os.path.basename(file_path))[0]
            
            # Run LibreOffice conversion
            cmd = [
                'libreoffice',
                '--headless',
                '--convert-to', output_format,
                '--outdir', output_dir,
                file_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                new_path = os.path.join(output_dir, f"{base_name}.{output_format}")
                if os.path.exists(new_path):
                    return True, new_path
            
            logger.error(f"LibreOffice conversion failed: {result.stderr}")
            return False, "LibreOffice conversion failed"
            
        except subprocess.TimeoutExpired:
            return False, "Conversion timed out"
        except Exception as e:
            logger.error(f"LibreOffice conversion error: {e}")
            return False, str(e)

    def get_conversion_suggestions(self, file_path: str) -> str:
        """Get suggestions for converting a legacy file"""
        ext = os.path.splitext(file_path)[1].lower()[1:]
        
        suggestions = {
            'ppt': (
                "PPTファイルの変換オプション:\n"
                "• Microsoft PowerPointで開いてPPTX形式で保存\n"
                "• Google Slidesにアップロードして変換\n"
                "• LibreOffice Impressで開いてエクスポート"
            ),
            'doc': (
                "DOCファイルの変換オプション:\n"
                "• Microsoft Wordで開いてDOCX形式で保存\n"
                "• Google Docsにアップロードして変換\n"
                "• LibreOffice Writerで開いてエクスポート"
            ),
            'xls': (
                "XLSファイルの変換オプション:\n"
                "• Microsoft Excelで開いてXLSX形式で保存\n"
                "• Google Sheetsにアップロードして変換\n"
                "• LibreOffice Calcで開いてエクスポート"
            )
        }
        
        return suggestions.get(ext, "このファイル形式の変換方法が見つかりません。")