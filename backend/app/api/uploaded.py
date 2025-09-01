from fastapi import APIRouter, HTTPException, Response
from pathlib import Path
from typing import List, Dict
import json
from datetime import datetime
import mimetypes

router = APIRouter()

ORIGINAL_DIR = Path("original")
METADATA_FILE = Path("metadata/file_metadata.json")

@router.get("/files")
async def get_original_files() -> List[Dict]:
    """originalディレクトリ内のファイル一覧を取得"""
    try:
        if not ORIGINAL_DIR.exists():
            return []
        
        # メタデータを読み込む
        metadata = {}
        if METADATA_FILE.exists():
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
        
        files = []
        for file_path in ORIGINAL_DIR.iterdir():
            # .gitignoreファイルを除外
            if file_path.is_file() and file_path.name != '.gitignore':
                file_info = {
                    "name": file_path.name,
                    "path": str(file_path),
                    "size": file_path.stat().st_size,
                    "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                }
                
                # ファイルタイプを判定
                mime_type, _ = mimetypes.guess_type(file_path.name)
                if mime_type:
                    file_info["mime_type"] = mime_type
                    file_info["file_type"] = mime_type.split('/')[0]  # 'image', 'application', 'text' など
                else:
                    file_info["mime_type"] = "application/octet-stream"
                    file_info["file_type"] = "unknown"
                
                # 拡張子から詳細なファイルタイプを判定
                ext = file_path.suffix.lower()
                if ext in ['.pdf']:
                    file_info["document_type"] = "pdf"
                elif ext in ['.doc', '.docx']:
                    file_info["document_type"] = "word"
                elif ext in ['.xls', '.xlsx']:
                    file_info["document_type"] = "excel"
                elif ext in ['.ppt', '.pptx']:
                    file_info["document_type"] = "powerpoint"
                elif ext in ['.txt', '.md']:
                    file_info["document_type"] = "text"
                elif ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                    file_info["document_type"] = "image"
                else:
                    file_info["document_type"] = "other"
                
                # メタデータから変換状態を取得
                file_key = file_path.stem
                if file_key in metadata:
                    file_info["has_converted"] = True
                    file_info["converted_at"] = metadata[file_key].get("converted_at", None)
                else:
                    file_info["has_converted"] = False
                    file_info["converted_at"] = None
                
                files.append(file_info)
        
        # 更新日時でソート（新しい順）
        files.sort(key=lambda x: x["modified"], reverse=True)
        return files
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{filename}")
async def get_file_content(filename: str) -> Response:
    """特定のファイルの内容を取得（ダウンロード用）"""
    try:
        file_path = ORIGINAL_DIR / filename
        
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        # ファイルを読み込む
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # MIMEタイプを判定
        mime_type, _ = mimetypes.guess_type(filename)
        if not mime_type:
            mime_type = "application/octet-stream"
        
        return Response(
            content=content,
            media_type=mime_type,
            headers={
                "Content-Disposition": f"inline; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/{filename}")
async def delete_file(filename: str) -> Dict:
    """ファイルを削除"""
    try:
        file_path = ORIGINAL_DIR / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # ファイルを削除
        file_path.unlink()
        
        # メタデータからも削除
        if METADATA_FILE.exists():
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            file_key = file_path.stem
            if file_key in metadata:
                del metadata[file_key]
                
                with open(METADATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        # 対応する変換済みファイルも削除
        converted_dir = Path("converted")
        if converted_dir.exists():
            # 同じ名前のmdファイルを探して削除
            for converted_file in converted_dir.glob(f"{file_path.stem}*.md"):
                converted_file.unlink()
        
        return {"message": f"File {filename} deleted successfully"}
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/files/batch-delete")
async def batch_delete_files(filenames: List[str]) -> Dict:
    """複数のオリジナルファイルを一括削除"""
    try:
        deleted = []
        errors = []
        
        for filename in filenames:
            try:
                await delete_file(filename)
                deleted.append(filename)
            except Exception as e:
                errors.append({"filename": filename, "error": str(e)})
        
        return {
            "deleted": deleted,
            "errors": errors,
            "total_deleted": len(deleted),
            "total_errors": len(errors)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))