"""
ファイル変換APIエンドポイント
ファイルのアップロードと変換処理を管理
"""
import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse
from typing import List
from app.models.data_models import (
    ConversionResult, BatchConversionResult, ConversionStatus
)
from pydantic import BaseModel
from app.services.conversion_service import ConversionService
from app.services.api_service import APIService
from app.services.enhanced_conversion_service import EnhancedConversionService
from app.api.websocket import manager
from app.services.cancel_manager import cancel_manager
from app.services.metadata_service import MetadataService
from app.services.langchain_vectorization_service import LangChainVectorizationService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# サービスのインスタンス化
conversion_service = ConversionService()
api_service = APIService()
enhanced_service = EnhancedConversionService()
metadata_service = MetadataService()
langchain_vectorization_service = LangChainVectorizationService()

class URLConversionRequest(BaseModel):
    """URL変換リクエストモデル"""
    url: str
    use_api_enhancement: bool = False

class EnhancedConversionRequest(BaseModel):
    """Enhanced conversion request with AI mode"""
    use_ai_mode: bool = False

@router.post("/upload", response_model=ConversionResult)
async def upload_and_convert(
    file: UploadFile = File(...),
    use_api_enhancement: bool = Form(False),
    use_ai_mode: bool = Form(False),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    ファイルをアップロードして変換
    
    Args:
        file: アップロードするファイル
        use_api_enhancement: OpenAI APIによる強化を使用するか
    
    Returns:
        ConversionResult: 変換結果
    """
    logger.info(f"=== UPLOAD ENDPOINT CALLED ===")
    logger.info(f"Upload request received - file: {file.filename}, use_ai_mode: {use_ai_mode}, use_api_enhancement: {use_api_enhancement}")
    
    # ファイル形式の確認
    if not conversion_service.is_supported_format(file.filename):
        logger.error(f"Unsupported file format: {file.filename}")
        raise HTTPException(
            status_code=400, 
            detail=f"サポートされていないファイル形式です。サポート形式: {', '.join(conversion_service.supported_formats)}"
        )
    
    # ファイルサイズの確認（100MB制限）
    if file.size > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ファイルサイズが100MBを超えています")
    
    # アップロードディレクトリにファイルを保存
    os.makedirs("original", exist_ok=True)
    upload_path = os.path.join("original", file.filename)
    try:
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"ファイルアップロードエラー: {e}")
        raise HTTPException(status_code=500, detail="ファイルのアップロードに失敗しました")
    
    # ファイルを変換（プログレスコールバック付き）
    output_filename = f"{os.path.splitext(file.filename)[0]}.md"
    
    # Generate conversion ID first
    import uuid
    conversion_id = str(uuid.uuid4())
    logger.info(f"Starting conversion for file: {file.filename}, conversion_id: {conversion_id}")
    
    # Send initial progress
    await manager.send_progress(conversion_id, 0, "processing", "変換処理を開始中...", file.filename)
    
    async def progress_callback(_conv_id: str, progress: int, status: str, step: str, filename: str):
        # Use the pre-generated conversion_id for consistency
        try:
            await manager.send_progress(conversion_id, progress, status, step, filename or file.filename)
        except Exception as e:
            logger.error(f"Failed to send progress update: {e}")
    
    try:
        result = await conversion_service.convert_file(
            upload_path, 
            output_filename, 
            use_ai_mode=use_ai_mode,
            progress_callback=progress_callback,
            conversion_id=conversion_id
        )
        
        logger.info(f"Conversion completed - conversion_id: {conversion_id}, status: {result.status if result else 'None'}")
        
        # Update result with our conversion_id
        if result:
            result.id = conversion_id
            logger.info(f"Result details: id={result.id}, input_file={result.input_file}, output_file={result.output_file}, status={result.status}")
            logger.info(f"Markdown content length: {len(result.markdown_content) if result.markdown_content else 0}")
            
            # Send final progress
            await manager.send_progress(conversion_id, 100, "completed", "変換完了", file.filename)
            # Send completion message with full result data
            await manager.send_completion(
                conversion_id, 
                success=True,
                markdown_content=result.markdown_content,
                processing_time=result.processing_time,
                output_file=result.output_file
            )
            logger.info(f"Sent final progress and completion for conversion_id: {conversion_id}")
        else:
            logger.error(f"No result returned from conversion service for conversion_id: {conversion_id}")
    except Exception as e:
        logger.error(f"Conversion failed - conversion_id: {conversion_id}, error: {str(e)}")
        await manager.send_progress(conversion_id, 0, "error", f"変換エラー: {str(e)}", file.filename)
        await manager.send_completion(conversion_id, success=False, error_message=str(e))
        raise
    
    # API強化が有効な場合
    if use_api_enhancement and result and result.status == ConversionStatus.COMPLETED:
        try:
            output_path = os.path.join("./converted", output_filename)
            with open(output_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            enhanced_content = await api_service.enhance_markdown(content)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(enhanced_content)
            
            # Update result with enhanced content
            result.markdown_content = enhanced_content
        except Exception as e:
            logger.error(f"Markdown強化エラー: {e}")
    
    # Ensure markdown content is loaded if not present
    if result and result.status == ConversionStatus.COMPLETED and not result.markdown_content:
        try:
            output_path = os.path.join("./converted", output_filename)
            if os.path.exists(output_path):
                with open(output_path, 'r', encoding='utf-8') as f:
                    result.markdown_content = f.read()
                logger.info(f"Loaded markdown content from file: {len(result.markdown_content)} characters")
        except Exception as e:
            logger.error(f"Failed to load markdown content from file: {e}")
    
    # バックグラウンドでアップロードファイルを削除
    # Note: We keep the original files in the app/original directory
    # background_tasks.add_task(os.remove, upload_path)
    
    logger.info(f"Returning result: status={result.status if result else None}, content_length={len(result.markdown_content) if result and result.markdown_content else 0}")
    
    return result

@router.post("/batch", response_model=BatchConversionResult)
async def batch_convert(
    files: List[UploadFile] = File(...),
    use_api_enhancement: bool = Form(False),
    use_ai_mode: bool = Form(False),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    複数ファイルを一括変換
    
    Args:
        files: アップロードするファイルのリスト
        use_api_enhancement: OpenAI APIによる強化を使用するか
    
    Returns:
        BatchConversionResult: バッチ変換結果
    """
    upload_paths = []
    
    # すべてのファイルをアップロード
    for file in files:
        if not conversion_service.is_supported_format(file.filename):
            continue
        
        upload_path = os.path.join("./app/original", file.filename)
        try:
            with open(upload_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            upload_paths.append(upload_path)
        except Exception as e:
            logger.error(f"ファイルアップロードエラー: {e}")
    
    # ファイルを一括変換
    results = await conversion_service.batch_convert(upload_paths, use_ai_mode=use_ai_mode)
    
    # API強化が有効な場合
    if use_api_enhancement:
        for result in results:
            if result.status == ConversionStatus.COMPLETED and result.output_file:
                try:
                    output_path = os.path.join("./converted", result.output_file)
                    with open(output_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    enhanced_content = await api_service.enhance_markdown(content)
                    
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(enhanced_content)
                except Exception as e:
                    logger.error(f"Markdown強化エラー: {e}")
    
    # バックグラウンドでアップロードファイルを削除
    # Note: We keep the original files in the app/original directory
    # for path in upload_paths:
    #     background_tasks.add_task(os.remove, path)
    
    # 結果を集計
    successful = sum(1 for r in results if r.status == ConversionStatus.COMPLETED)
    failed = sum(1 for r in results if r.status == ConversionStatus.FAILED)
    
    return BatchConversionResult(
        total_files=len(files),
        successful=successful,
        failed=failed,
        results=results
    )

@router.get("/download/{filename}")
async def download_converted_file(filename: str):
    """
    変換済みファイルをダウンロード
    
    Args:
        filename: ダウンロードするファイル名
    
    Returns:
        FileResponse: ファイルレスポンス
    """
    file_path = os.path.join("./converted", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="text/markdown"
    )

@router.get("/supported-formats")
async def get_supported_formats():
    """サポートされているファイル形式を取得"""
    return {"formats": conversion_service.supported_formats}

@router.post("/cancel/{conversion_id}")
async def cancel_conversion(conversion_id: str):
    """
    変換をキャンセル
    
    Args:
        conversion_id: キャンセルする変換のID
        
    Returns:
        dict: キャンセル結果
    """
    success = cancel_manager.cancel_conversion(conversion_id)
    
    # WebSocketでキャンセル通知を送信
    if success:
        await manager.send_progress(
            conversion_id=conversion_id,
            progress=0,
            status="cancelled",
            current_step="変換がキャンセルされました",
            file_name=""
        )
    
    return {"success": success, "message": "変換がキャンセルされました" if success else "変換が見つかりません"}

@router.post("/convert-url", response_model=ConversionResult)
async def convert_url(request: URLConversionRequest):
    """
    URLを変換（YouTube URLなど）- 改善版（直接URL変換）
    
    Args:
        request: URL変換リクエスト
    
    Returns:
        ConversionResult: 変換結果
    """
    # URL検証
    if not (request.url.startswith('http://') or request.url.startswith('https://')):
        raise HTTPException(status_code=400, detail="有効なURLを指定してください")
    
    output_filename = f"url_conversion_{os.urandom(8).hex()}.md"
    
    # YouTubeの場合は特別処理
    if enhanced_service.is_youtube_url(request.url):
        result = await conversion_service.convert_file(request.url, output_filename)
    else:
        # 通常のURLは新しい直接変換メソッドを使用
        from app.services.markitdown_ai_service import MarkItDownAIService
        ai_service = MarkItDownAIService()
        result = await ai_service.convert_url(
            request.url, 
            output_filename,
            use_ai_mode=request.use_api_enhancement
        )
    
    # 追加のAPI強化が必要な場合
    if request.use_api_enhancement and result.status == ConversionStatus.COMPLETED and not enhanced_service.is_youtube_url(request.url):
        try:
            output_path = os.path.join("./converted", output_filename)
            with open(output_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            enhanced_content = await api_service.enhance_markdown(content)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(enhanced_content)
            
            result.markdown_content = enhanced_content
        except Exception as e:
            logger.error(f"Markdown enhancement error: {e}")
    
    return result

@router.post("/upload-enhanced", response_model=ConversionResult)
async def upload_and_convert_enhanced(
    file: UploadFile = File(...),
    use_ai_mode: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Enhanced file upload and conversion with AI mode support
    
    Args:
        file: File to upload
        use_ai_mode: Enable AI-enhanced conversion mode
    
    Returns:
        ConversionResult: Conversion result
    """
    # Check file format
    file_ext = os.path.splitext(file.filename)[1].lower()[1:]
    supported_formats = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 
                        'mp3', 'wav', 'ogg', 'm4a', 'flac', 'csv', 'json', 'xml', 'txt', 'zip']
    
    if file_ext not in supported_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported formats: {', '.join(supported_formats)}"
        )
    
    # Check file size (100MB limit)
    if file.size and file.size > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 100MB")
    
    # Save uploaded file
    upload_path = os.path.join("./app/original", file.filename)
    try:
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"File upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")
    
    # Convert file with enhanced service
    output_filename = f"{os.path.splitext(file.filename)[0]}.md"
    result = await enhanced_service.convert_file_enhanced(
        upload_path, 
        output_filename,
        use_ai_mode=use_ai_mode
    )
    
    # Clean up uploaded file in background
    # Note: We keep the original files in the app/original directory
    # background_tasks.add_task(os.remove, upload_path)
    
    return result

@router.post("/upload-stream", response_model=ConversionResult)
async def upload_and_convert_stream(
    file: UploadFile = File(...),
    use_ai_mode: bool = False,
    use_azure: bool = False
):
    """
    大容量ファイルをストリーム処理で変換
    
    Args:
        file: アップロードするファイル
        use_ai_mode: AI変換モードを使用するか
        use_azure: Azure Document Intelligenceを使用するか
    
    Returns:
        ConversionResult: 変換結果
    """
    from app.services.markitdown_ai_service import MarkItDownAIService
    ai_service = MarkItDownAIService()
    
    # ファイル情報を準備
    file_info = {
        'filename': file.filename,
        'mime_type': file.content_type,
        'use_azure': use_azure
    }
    
    output_filename = f"{os.path.splitext(file.filename)[0]}.md"
    
    # ストリーム変換を実行
    result = await ai_service.convert_stream(
        file.file,
        file_info,
        output_filename,
        use_ai_mode=use_ai_mode
    )
    
    return result

@router.post("/convert-youtube-enhanced", response_model=ConversionResult)
async def convert_youtube_enhanced(
    url: str,
    use_ai_mode: bool = False
):
    """
    Convert YouTube URL with optional AI enhancement
    
    Args:
        url: YouTube URL to convert
        use_ai_mode: Enable AI-enhanced description
    
    Returns:
        ConversionResult: Conversion result
    """
    # Validate YouTube URL
    if not enhanced_service.is_youtube_url(url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    
    output_filename = f"youtube_{enhanced_service.extract_youtube_id(url)}.md"
    result = await enhanced_service.convert_file_enhanced(
        "",
        output_filename,
        is_url=True,
        url_content=url,
        use_ai_mode=use_ai_mode
    )
    
    # Add AI-enhanced metadata if enabled
    if use_ai_mode and result.status == ConversionStatus.COMPLETED:
        try:
            # Enhance with AI analysis
            enhanced_content = enhanced_service.llm_client.enhance_document_content(
                result.markdown_content,
                "youtube_video",
                []
            )
            result.markdown_content = enhanced_content
            
            # Save enhanced version
            output_path = os.path.join("./converted", output_filename)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(enhanced_content)
        except Exception as e:
            logger.error(f"AI enhancement error: {e}")
    
    return result

@router.get("/storage/list")
async def list_converted_files():
    """
    List all converted files in the storage
    
    Returns:
        List of file information with metadata
    """
    import os
    from datetime import datetime
    
    converted_dir = "converted"
    files = []
    
    try:
        if os.path.exists(converted_dir):
            for filename in os.listdir(converted_dir):
                if filename.endswith('.md') and not filename.startswith('.'):
                    filepath = os.path.join(converted_dir, filename)
                    stat = os.stat(filepath)
                    
                    # Read first 500 characters for preview
                    preview = ""
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read(500)
                            preview = content[:497] + "..." if len(content) >= 500 else content
                    except:
                        preview = "プレビューを読み込めません"
                    
                    # Get metadata if available
                    metadata = metadata_service.get_file_metadata(filename, "converted")
                    relationship = metadata_service.get_file_relationship(filename)
                    
                    files.append({
                        "filename": filename,
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "preview": preview,
                        "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024*1024 else f"{stat.st_size / (1024*1024):.1f} MB",
                        "original_filename": relationship.original_file.original_filename if relationship else None,
                        "conversion_id": metadata.conversion_id if metadata else None,
                        "is_vectorized": metadata.is_vectorized if metadata else False,
                        "vector_chunks": metadata.vector_chunks if metadata else 0
                    })
            
            # Sort by modified date (newest first)
            files.sort(key=lambda x: x["modified"], reverse=True)
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"files": files, "total": len(files)}

@router.get("/storage/file/{filename}")
async def get_converted_file_content(filename: str):
    """
    Get the content of a specific converted file
    
    Args:
        filename: Name of the file to retrieve
    
    Returns:
        File content and metadata
    """
    import os
    from datetime import datetime
    
    filepath = os.path.join("converted", filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    if not filename.endswith('.md'):
        raise HTTPException(status_code=400, detail="Only markdown files are supported")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        stat = os.stat(filepath)
        
        return {
            "filename": filename,
            "content": content,
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024*1024 else f"{stat.st_size / (1024*1024):.1f} MB"
        }
    except Exception as e:
        logger.error(f"Error reading file {filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/storage/file/{filename}")
async def delete_converted_file(filename: str):
    """
    Delete a converted file from storage
    
    Args:
        filename: Name of the file to delete
    
    Returns:
        Success status
    """
    import os
    
    filepath = os.path.join("converted", filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    if not filename.endswith('.md'):
        raise HTTPException(status_code=400, detail="Only markdown files can be deleted")
    
    try:
        os.remove(filepath)
        return {"success": True, "message": f"File {filename} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting file {filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/uploaded/list")
async def list_uploaded_files():
    """
    List all uploaded files in the original directory
    
    Returns:
        List of file information with metadata
    """
    import os
    from datetime import datetime
    import mimetypes
    
    original_dir = "original"
    files = []
    
    try:
        if os.path.exists(original_dir):
            for filename in os.listdir(original_dir):
                if not filename.startswith('.'):
                    filepath = os.path.join(original_dir, filename)
                    stat = os.stat(filepath)
                    
                    # Get file extension and mime type
                    _, ext = os.path.splitext(filename)
                    mime_type, _ = mimetypes.guess_type(filename)
                    
                    # Read first 500 characters for preview (only for text files)
                    preview = ""
                    if mime_type and mime_type.startswith('text'):
                        try:
                            with open(filepath, 'r', encoding='utf-8') as f:
                                content = f.read(500)
                                preview = content[:497] + "..." if len(content) >= 500 else content
                        except:
                            preview = "プレビューを読み込めません"
                    else:
                        preview = f"{mime_type or 'unknown'} file"
                    
                    files.append({
                        "filename": filename,
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "preview": preview,
                        "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024*1024 else f"{stat.st_size / (1024*1024):.1f} MB",
                        "extension": ext[1:] if ext else "",
                        "mime_type": mime_type or "application/octet-stream"
                    })
            
            # Sort by modified date (newest first)
            files.sort(key=lambda x: x["modified"], reverse=True)
    except Exception as e:
        logger.error(f"Error listing uploaded files: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"files": files, "total": len(files)}

@router.get("/uploaded/file/{filename}")
async def get_uploaded_file_content(filename: str):
    """
    Get the content or download a specific uploaded file
    
    Args:
        filename: Name of the file to retrieve
    
    Returns:
        File content for text files, or file download for binary files
    """
    import os
    from datetime import datetime
    import mimetypes
    from fastapi.responses import FileResponse
    
    filepath = os.path.join("original", filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get mime type
    mime_type, _ = mimetypes.guess_type(filename)
    
    # For text files, return content
    if mime_type and (mime_type.startswith('text') or mime_type in ['application/json', 'application/xml']):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            stat = os.stat(filepath)
            
            return {
                "filename": filename,
                "content": content,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size_formatted": f"{stat.st_size / 1024:.1f} KB" if stat.st_size < 1024*1024 else f"{stat.st_size / (1024*1024):.1f} MB",
                "mime_type": mime_type
            }
        except UnicodeDecodeError:
            # If text file can't be decoded, treat as binary
            pass
    
    # For binary files or download, return FileResponse
    return FileResponse(
        path=filepath,
        media_type=mime_type or 'application/octet-stream',
        filename=filename
    )

@router.get("/uploaded/preview/{filename}")
async def preview_uploaded_file(filename: str):
    """
    Preview a file in browser (for browser-compatible files)
    
    Args:
        filename: Name of the file to preview
    
    Returns:
        FileResponse with inline disposition for browser preview
    """
    import os
    import mimetypes
    from fastapi.responses import FileResponse
    
    filepath = os.path.join("original", filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get mime type
    mime_type, _ = mimetypes.guess_type(filename)
    mime_type = mime_type or 'application/octet-stream'
    
    # Files that browsers can display
    browser_viewable = [
        'application/pdf',
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/javascript',
        'application/json',
        'application/xml',
        'text/xml',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
        'audio/webm'
    ]
    
    # Check if file type is viewable in browser
    is_viewable = mime_type in browser_viewable or mime_type.startswith('text/') or mime_type.startswith('image/')
    
    if is_viewable:
        # Return with inline disposition for browser preview
        return FileResponse(
            path=filepath,
            media_type=mime_type,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"'
            }
        )
    else:
        # For non-viewable files, force download
        return FileResponse(
            path=filepath,
            media_type=mime_type,
            filename=filename
        )

@router.delete("/uploaded/file/{filename}")
async def delete_uploaded_file(filename: str):
    """
    Delete an uploaded file from original directory
    
    Args:
        filename: Name of the file to delete
    
    Returns:
        Success status
    """
    import os
    
    filepath = os.path.join("original", filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        os.remove(filepath)
        return {"success": True, "message": f"File {filename} deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting uploaded file {filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========== LangChain Vectorization Endpoints ==========

class VectorizeRequest(BaseModel):
    """Vectorization request model"""
    filenames: List[str]

@router.post("/vectorize/files")
async def vectorize_files(request: VectorizeRequest):
    """
    Vectorize selected markdown files using LangChain with semantic chunking
    
    Args:
        request: List of filenames to vectorize
    
    Returns:
        Vectorization results
    """
    try:
        results = []
        errors = []
        
        for filename in request.filenames:
            try:
                result = langchain_vectorization_service.vectorize_file(filename)
                results.append(result)
            except Exception as e:
                errors.append({
                    "filename": filename,
                    "error": str(e)
                })
                logger.error(f"Failed to vectorize {filename}: {e}")
        
        return {
            "success": True,
            "total": len(request.filenames),
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors
        }
    except Exception as e:
        logger.error(f"Vectorization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vectorize/all")
async def vectorize_all_files():
    """
    Vectorize all markdown files in the converted directory
    
    Returns:
        Summary of vectorization process
    """
    try:
        result = langchain_vectorization_service.vectorize_all_files()
        return {
            "success": True,
            **result
        }
    except Exception as e:
        logger.error(f"Batch vectorization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vectorize/stats")
async def get_vector_stats():
    """
    Get statistics about the vector collection
    
    Returns:
        Collection statistics
    """
    try:
        stats = langchain_vectorization_service.get_collection_stats()
        return {
            "success": True,
            **stats
        }
    except Exception as e:
        logger.error(f"Error getting vector stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/vectorize/file/{filename}")
async def delete_vectorized_file(filename: str):
    """
    Delete a file from the vector database
    
    Args:
        filename: Name of the file to delete from vector DB
    
    Returns:
        Deletion status
    """
    try:
        result = langchain_vectorization_service.delete_document(filename)
        return {
            "success": True,
            **result
        }
    except Exception as e:
        logger.error(f"Error deleting vectorized file {filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vectorize/reset")
async def reset_vector_collection():
    """
    Reset the entire vector collection (delete all vectors)
    
    Returns:
        Reset status
    """
    try:
        result = langchain_vectorization_service.reset_collection()
        return {
            "success": True,
            **result
        }
    except Exception as e:
        logger.error(f"Error resetting vector collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VectorSearchRequest(BaseModel):
    """Vector search request model"""
    query: str
    n_results: int = 5

@router.post("/vectorize/search")
async def search_vectors(request: VectorSearchRequest):
    """
    Search in the vector database
    
    Args:
        request: Search query and number of results
    
    Returns:
        Search results with relevance scores
    """
    try:
        results = langchain_vectorization_service.search(
            query=request.query,
            n_results=request.n_results
        )
        return {
            "success": True,
            **results
        }
    except Exception as e:
        logger.error(f"Vector search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

