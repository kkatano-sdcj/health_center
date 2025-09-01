from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import List, Dict
import json
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

class VectorDBAddRequest(BaseModel):
    filenames: List[str]

CONVERTED_DIR = Path("converted")
METADATA_FILE = Path("metadata/file_metadata.json")

@router.get("/files")
async def get_converted_files() -> List[Dict]:
    """convertedディレクトリ内のファイル一覧を取得"""
    try:
        if not CONVERTED_DIR.exists():
            return []
        
        # メタデータを読み込む
        metadata = {}
        if METADATA_FILE.exists():
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
        
        files = []
        for file_path in CONVERTED_DIR.glob("*.md"):
            file_info = {
                "name": file_path.name,
                "path": str(file_path),
                "size": file_path.stat().st_size,
                "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
            }
            
            # メタデータから元のファイル名を取得
            file_key = file_path.stem
            if file_key in metadata:
                file_info["original_name"] = metadata[file_key].get("original_filename", file_path.name)
                file_info["file_type"] = metadata[file_key].get("file_type", "unknown")
                file_info["in_vectordb"] = metadata[file_key].get("in_vectordb", False)
            else:
                file_info["original_name"] = file_path.name
                file_info["file_type"] = "markdown"
                file_info["in_vectordb"] = False
            
            files.append(file_info)
        
        # 更新日時でソート（新しい順）
        files.sort(key=lambda x: x["modified"], reverse=True)
        return files
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{filename}")
async def get_file_content(filename: str) -> Dict:
    """特定のファイルの内容を取得"""
    try:
        file_path = CONVERTED_DIR / filename
        
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # メタデータを取得
        metadata = {}
        if METADATA_FILE.exists():
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                all_metadata = json.load(f)
                file_key = file_path.stem
                if file_key in all_metadata:
                    metadata = all_metadata[file_key]
        
        return {
            "filename": filename,
            "content": content,
            "metadata": metadata,
            "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        }
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/{filename}")
async def delete_file(filename: str) -> Dict:
    """変換済みファイルを削除"""
    try:
        file_path = CONVERTED_DIR / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # ファイルを削除
        file_path.unlink()
        
        # メタデータを更新
        if METADATA_FILE.exists():
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            # ファイル名からステムを取得
            file_stem = file_path.stem
            # タイムスタンプ付きのファイル名から元のステムを抽出
            import re
            original_stem = re.sub(r'_\d{8}_\d{6}$', '', file_stem)
            
            # メタデータから変換情報を削除
            for key in [file_stem, original_stem]:
                if key in metadata:
                    metadata[key]['has_converted'] = False
                    metadata[key].pop('converted_filename', None)
                    metadata[key].pop('converted_at', None)
                    metadata[key].pop('converted_size', None)
            
            with open(METADATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        return {"message": f"File {filename} deleted successfully"}
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/files/batch-delete")
async def batch_delete_files(filenames: List[str]) -> Dict:
    """複数の変換済みファイルを一括削除"""
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

@router.post("/vectordb/add")
async def add_to_vectordb(request: VectorDBAddRequest) -> Dict:
    """選択したファイルをベクトルデータベースに追加"""
    try:
        from app.services.langchain_vectorization_service import LangChainVectorizationService
        
        # サービスのインスタンスを作成
        vectorization_service = LangChainVectorizationService()
        
        added = []
        errors = []
        updated_metadata = {}
        
        # メタデータファイルを読み込む
        if METADATA_FILE.exists():
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                updated_metadata = json.load(f)
        
        for filename in request.filenames:
            try:
                # ベクトルDBに追加（filenameはそのまま使用）
                result = vectorization_service.vectorize_file(filename)
                
                # メタデータ用のキーは.mdを除去
                file_key = filename.replace('.md', '') if filename.endswith('.md') else filename
                
                if result.get("status") == "success":
                    # メタデータを更新
                    if file_key not in updated_metadata:
                        updated_metadata[file_key] = {}
                    updated_metadata[file_key]["in_vectordb"] = True
                    updated_metadata[file_key]["vectordb_added_at"] = datetime.now().isoformat()
                    
                    added.append(filename)
                else:
                    errors.append({"filename": filename, "error": result.get("message", "Unknown error")})
                
            except Exception as e:
                errors.append({"filename": filename, "error": str(e)})
        
        # メタデータを保存
        METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(updated_metadata, f, ensure_ascii=False, indent=2)
        
        return {
            "added": added,
            "errors": errors,
            "total_added": len(added),
            "total_errors": len(errors)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))