"""
ファイル変換サービス
markitdownライブラリを使用してファイルをMarkdown形式に変換
"""
import os
import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from markitdown import MarkItDown
from app.models.data_models import ConversionResult, ConversionStatus, FileFormat
# Firebase機能（モック実装を使用）
from app.services.mock_firebase_service import MockFirebaseService
from app.services.enhanced_conversion_service import EnhancedConversionService
from app.services.legacy_converter import LegacyConverter
from app.services.markitdown_ai_service import MarkItDownAIService
from app.services.metadata_service import MetadataService
import logging

logger = logging.getLogger(__name__)

class ConversionService:
    """ファイル変換を管理するサービスクラス"""
    
    def __init__(self):
        self.supported_formats = [f.value for f in FileFormat]
        self.upload_dir = "original"
        self.output_dir = "converted"
        self.md = MarkItDown()
        # Firebase機能（モック実装）
        self.firebase_service = MockFirebaseService()
        self.enable_database = True
        # Enhanced conversion service for additional formats
        self.enhanced_service = EnhancedConversionService()
        # Legacy converter for old binary formats
        self.legacy_converter = LegacyConverter()
        # MarkItDown AI service for LLM-integrated conversion
        self.markitdown_ai_service = MarkItDownAIService()
        # Metadata service for file tracking
        self.metadata_service = MetadataService()
        
    def is_supported_format(self, filename: str) -> bool:
        """ファイル形式がサポートされているか確認"""
        ext = filename.split('.')[-1].lower()
        return ext in self.supported_formats
    
    def initialize_databases(self, firebase_config: Optional[Dict] = None, vector_db_path: str = "./chroma_db"):
        """データベースサービスを初期化（一時的に無効化）"""
        logger.info("Database services are temporarily disabled")
        self.enable_database = False
        # try:
        #     if firebase_config:
        #         self.firebase_service.initialize(credentials_dict=firebase_config)
        #     else:
        #         firebase_creds_path = os.environ.get('FIREBASE_CREDENTIALS_PATH')
        #         if firebase_creds_path:
        #             self.firebase_service.initialize(credentials_path=firebase_creds_path)
        #     
        #     self.vector_db_service.initialize(persist_directory=vector_db_path)
        #     self.enable_database = True
        #     logger.info("Database services initialized successfully")
        # except Exception as e:
        #     logger.error(f"Failed to initialize database services: {str(e)}")
        #     self.enable_database = False
    
    async def convert_file(self, input_path: str, output_filename: str, save_to_db: bool = True, metadata: Optional[Dict[str, Any]] = None, use_ai_mode: bool = False, progress_callback = None, conversion_id: str = None) -> ConversionResult:
        """
        単一ファイルの変換処理
        
        Args:
            input_path: 入力ファイルのパス
            output_filename: 出力ファイル名
            save_to_db: データベースに保存するかどうか
            metadata: ファイルのメタデータ
            
        Returns:
            ConversionResult: 変換結果
        """
        logger.info(f"convert_file called - input_path: {input_path}, output_filename: {output_filename}, use_ai_mode: {use_ai_mode}")
        
        # Check if it's a URL (YouTube)
        if input_path.startswith('http://') or input_path.startswith('https://'):
            if self.enhanced_service.is_youtube_url(input_path):
                return await self.enhanced_service.convert_file_enhanced(
                    input_path="",
                    output_filename=output_filename,
                    is_url=True,
                    url_content=input_path
                )
        
        # Check file extension for special handling
        file_ext = os.path.splitext(input_path)[1].lower()[1:]
        
        # 画像ファイルは常にMarkItDownAIServiceで処理（OCRのため）
        if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
            return await self.markitdown_ai_service.convert_with_ai(
                file_path=input_path,
                output_filename=output_filename,
                use_ai_mode=use_ai_mode,
                progress_callback=progress_callback,
                conversion_id=conversion_id
            )
        
        # AI modeが有効な場合、MarkItDown AI Serviceを使用
        if use_ai_mode:
            return await self.markitdown_ai_service.convert_with_ai(
                file_path=input_path,
                output_filename=output_filename,
                use_ai_mode=True,
                progress_callback=progress_callback,
                conversion_id=conversion_id
            )
        
        # Special formats that need enhanced processing (without AI)
        if file_ext in ['zip', 'json', 'csv', 'mp3', 'wav', 'ogg', 'm4a', 'flac']:
            return await self.enhanced_service.convert_file_enhanced(
                input_path=input_path,
                output_filename=output_filename,
                use_ai_mode=False
            )
        
        # Original conversion logic for standard formats
        if conversion_id is None:
            conversion_id = str(uuid.uuid4())
        start_time = time.time()
        
        logger.info(f"Starting standard conversion - file: {input_path}, conversion_id: {conversion_id}")
        
        try:
            # Send initial progress
            if progress_callback:
                logger.debug(f"Sending initial progress for conversion_id: {conversion_id}")
                await progress_callback(conversion_id, 10, "processing", "ファイルを検証中...", os.path.basename(input_path))
            
            # 出力ファイルパスの生成（タイムスタンプを追加してユニークにする）
            os.makedirs(self.output_dir, exist_ok=True)  # ディレクトリが存在することを確認
            
            # 既存のファイルがある場合はタイムスタンプを追加
            base_name, ext = os.path.splitext(output_filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{base_name}_{timestamp}{ext}"
            output_path = os.path.join(self.output_dir, unique_filename)
            
            # 既存ファイルの権限問題を回避するため、新しいファイル名を使用
            if os.path.exists(os.path.join(self.output_dir, output_filename)):
                try:
                    # 既存ファイルを削除しようとする（権限があれば）
                    os.remove(os.path.join(self.output_dir, output_filename))
                    output_path = os.path.join(self.output_dir, output_filename)
                    unique_filename = output_filename
                except (OSError, PermissionError):
                    # 権限エラーの場合はタイムスタンプ付きファイル名を使用
                    logger.warning(f"Cannot overwrite existing file, using timestamped filename: {unique_filename}")
                    pass
            
            if progress_callback:
                await progress_callback(conversion_id, 50, "processing", "変換中...", os.path.basename(input_path))
            
            # markitdownでファイルを変換
            result = self.md.convert(input_path)
            markdown_content = result.text_content
            
            if not markdown_content:
                logger.warning(f"No content extracted from file: {input_path}")
                markdown_content = f"# {os.path.basename(input_path)}\n\n変換されたコンテンツが空でした。"
            else:
                logger.info(f"Successfully extracted {len(markdown_content)} characters from {input_path}")
            
            if progress_callback:
                await progress_callback(conversion_id, 90, "processing", "保存中...", os.path.basename(input_path))
                
            # 変換結果をファイルに保存
            with open(output_path, 'w', encoding='utf-8') as output_file:
                output_file.write(markdown_content)
            
            # Create metadata relationship for tracking
            try:
                self.metadata_service.create_relationship(
                    original_filepath=input_path,
                    converted_filepath=output_path,
                    conversion_id=conversion_id
                )
            except Exception as meta_error:
                logger.warning(f"Failed to create metadata relationship: {meta_error}")
            
            # データベースに保存
            if save_to_db and self.enable_database:
                file_metadata = metadata or {}
                file_metadata.update({
                    'original_filename': os.path.basename(input_path),
                    'converted_filename': output_filename,
                    'file_size': os.path.getsize(input_path),
                    'conversion_time': time.time()
                })
                
                # Firebaseに保存
                self.firebase_service.save_markdown(
                    file_id=conversion_id,
                    content=markdown_content,
                    metadata=file_metadata
                )
            
            processing_time = time.time() - start_time
            
            if progress_callback:
                await progress_callback(conversion_id, 100, "completed", "変換完了", os.path.basename(input_path))
            
            result_obj = ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(input_path),
                output_file=unique_filename,  # タイムスタンプ付きファイル名を使用
                status=ConversionStatus.COMPLETED,
                processing_time=processing_time,
                markdown_content=markdown_content
            )
            
            logger.info(f"Created ConversionResult: id={result_obj.id}, status={result_obj.status}, content_length={len(result_obj.markdown_content) if result_obj.markdown_content else 0}")
            return result_obj
            
        except Exception as e:
            logger.error(f"ファイル変換エラー: {str(e)}")
            
            # Check if it's a legacy format that markitdown couldn't handle
            file_ext = os.path.splitext(input_path)[1].lower()[1:]
            if file_ext in ['ppt', 'doc', 'xls'] and "No converter attempted a conversion" in str(e):
                logger.info(f"Attempting legacy conversion for {file_ext} file")
                
                # Try legacy converter
                success, result_or_error = self.legacy_converter.convert(input_path)
                
                if success:
                    # Successfully converted to modern format, try again
                    try:
                        if progress_callback:
                            await progress_callback(conversion_id, 60, "processing", "レガシー形式を変換中...", os.path.basename(input_path))
                        
                        converted_path = result_or_error
                        result = self.md.convert(converted_path)
                        markdown_content = result.text_content
                        
                        # Save the converted markdown
                        output_path = os.path.join(self.output_dir, output_filename)
                        with open(output_path, 'w', encoding='utf-8') as output_file:
                            output_file.write(markdown_content)
                        
                        # Clean up temporary converted file
                        if os.path.exists(converted_path):
                            os.remove(converted_path)
                        
                        processing_time = time.time() - start_time
                        
                        if progress_callback:
                            await progress_callback(conversion_id, 100, "completed", "変換完了", os.path.basename(input_path))
                        
                        return ConversionResult(
                            id=conversion_id,
                            input_file=os.path.basename(input_path),
                            output_file=output_filename,
                            status=ConversionStatus.COMPLETED,
                            processing_time=processing_time,
                            markdown_content=markdown_content
                        )
                    except Exception as conv_error:
                        logger.error(f"Legacy conversion retry failed: {conv_error}")
                        error_msg = f"レガシー形式の変換に失敗しました: {str(conv_error)}"
                else:
                    # Provide helpful error message for legacy format
                    error_msg = result_or_error
            else:
                error_msg = f"変換エラー: {str(e)}"
            
            return ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(input_path),
                status=ConversionStatus.FAILED,
                error_message=error_msg,
                processing_time=time.time() - start_time
            )
    
    async def batch_convert(self, file_paths: list[str], use_ai_mode: bool = False) -> list[ConversionResult]:
        """
        複数ファイルの一括変換（最適化版）
        
        Args:
            file_paths: 変換するファイルパスのリスト
            use_ai_mode: AI変換モードを使用するか
            
        Returns:
            list[ConversionResult]: 各ファイルの変換結果
        """
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        results = []
        
        # 並列処理のための設定
        max_workers = min(4, len(file_paths))  # 最大4並列
        
        # バッチ処理を効率化するため、MarkItDownインスタンスを再利用
        if use_ai_mode:
            # AI modeの場合はMarkItDown AI Serviceを使用
            from app.services.markitdown_ai_service import MarkItDownAIService
            ai_service = MarkItDownAIService()
            
            # 並列処理でバッチ変換
            tasks = []
            for file_path in file_paths:
                base_name = os.path.splitext(os.path.basename(file_path))[0]
                output_filename = f"{base_name}.md"
                
                task = ai_service.convert_with_ai(
                    file_path, 
                    output_filename, 
                    use_ai_mode=True
                )
                tasks.append(task)
            
            # すべてのタスクを並列実行
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # エラー処理
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    # エラーの場合は失敗結果を作成
                    processed_results.append(
                        ConversionResult(
                            id=str(uuid.uuid4()),
                            input_file=os.path.basename(file_paths[i]),
                            status=ConversionStatus.FAILED,
                            error_message=str(result)
                        )
                    )
                else:
                    processed_results.append(result)
            
            return processed_results
        else:
            # 通常モードの場合、MarkItDownインスタンスを1つ作成して再利用
            md_instance = self.md
            
            # ThreadPoolExecutorを使用して並列処理
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                loop = asyncio.get_event_loop()
                
                # 各ファイルの変換タスクを作成
                tasks = []
                for file_path in file_paths:
                    base_name = os.path.splitext(os.path.basename(file_path))[0]
                    output_filename = f"{base_name}.md"
                    
                    # 変換処理を非同期で実行
                    task = loop.run_in_executor(
                        executor,
                        self._convert_file_sync,
                        file_path,
                        output_filename,
                        md_instance
                    )
                    tasks.append(task)
                
                # すべてのタスクを待機
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # エラー処理
                processed_results = []
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        processed_results.append(
                            ConversionResult(
                                id=str(uuid.uuid4()),
                                input_file=os.path.basename(file_paths[i]),
                                status=ConversionStatus.FAILED,
                                error_message=str(result)
                            )
                        )
                    else:
                        processed_results.append(result)
                
                return processed_results
    
    def _convert_file_sync(self, file_path: str, output_filename: str, md_instance) -> ConversionResult:
        """
        同期的にファイルを変換（バッチ処理用）
        
        Args:
            file_path: 入力ファイルパス
            output_filename: 出力ファイル名
            md_instance: MarkItDownインスタンス
            
        Returns:
            ConversionResult: 変換結果
        """
        conversion_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # markitdownでファイルを変換
            result = md_instance.convert(file_path)
            markdown_content = result.text_content
            
            # 出力ファイルパスの生成（権限問題を回避）
            os.makedirs(self.output_dir, exist_ok=True)
            
            # タイムスタンプ付きのファイル名を生成
            base_name, ext = os.path.splitext(output_filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{base_name}_{timestamp}{ext}"
            output_path = os.path.join(self.output_dir, unique_filename)
            
            # 既存ファイルがある場合の処理
            original_path = os.path.join(self.output_dir, output_filename)
            if os.path.exists(original_path):
                try:
                    os.remove(original_path)
                    output_path = original_path
                    unique_filename = output_filename
                except (OSError, PermissionError):
                    logger.warning(f"Cannot overwrite {output_filename}, using {unique_filename}")
            else:
                # 既存ファイルがなければ元のファイル名を使用
                output_path = original_path
                unique_filename = output_filename
            
            # 変換結果をファイルに保存
            with open(output_path, 'w', encoding='utf-8') as output_file:
                output_file.write(markdown_content)
            
            # Create metadata relationship for batch processing
            try:
                self.metadata_service.create_relationship(
                    original_filepath=file_path,
                    converted_filepath=output_path,
                    conversion_id=conversion_id
                )
            except Exception as meta_error:
                logger.warning(f"Failed to create metadata in batch: {meta_error}")
            
            processing_time = time.time() - start_time
            
            return ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(file_path),
                output_file=unique_filename,
                status=ConversionStatus.COMPLETED,
                processing_time=processing_time,
                markdown_content=markdown_content
            )
            
        except Exception as e:
            logger.error(f"Sync file conversion error: {str(e)}")
            return ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(file_path),
                status=ConversionStatus.FAILED,
                error_message=f"変換エラー: {str(e)}",
                processing_time=time.time() - start_time
            )
    
    async def search_similar_content(self, query: str, n_results: int = 5) -> list[Dict[str, Any]]:
        """
        類似コンテンツを検索
        
        Args:
            query: 検索クエリ
            n_results: 返す結果の数
            
        Returns:
            類似コンテンツのリスト
        """
        if not self.enable_database:
            logger.warning("Database services not enabled")
            return []
        
        # return self.vector_db_service.search_similar(query, n_results)
        return []
    
    async def get_stored_markdown(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        保存されたMarkdownファイルを取得
        
        Args:
            file_id: ファイルID
            
        Returns:
            Markdownファイルのデータ
        """
        if not self.enable_database:
            logger.warning("Database services not enabled")
            return None
        
        return self.firebase_service.get_markdown(file_id)
    
    async def list_stored_files(self, limit: int = 100, offset: int = 0) -> list[Dict[str, Any]]:
        """
        保存されたファイルのリストを取得
        
        Args:
            limit: 取得する最大数
            offset: オフセット
            
        Returns:
            ファイルリスト
        """
        if not self.enable_database:
            logger.warning("Database services not enabled")
            return []
        
        return self.firebase_service.list_markdown_files(limit, offset)
    
    async def delete_stored_file(self, file_id: str) -> bool:
        """
        保存されたファイルを削除
        
        Args:
            file_id: ファイルID
            
        Returns:
            削除成功の可否
        """
        if not self.enable_database:
            logger.warning("Database services not enabled")
            return False
        
        firebase_result = self.firebase_service.delete_markdown(file_id)
        return firebase_result
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """古い一時ファイルを削除"""
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for directory in [self.upload_dir, self.output_dir]:
            if not os.path.exists(directory):
                continue
                
            for filename in os.listdir(directory):
                file_path = os.path.join(directory, filename)
                if os.path.isfile(file_path):
                    file_age = current_time - os.path.getmtime(file_path)
                    if file_age > max_age_seconds:
                        try:
                            os.remove(file_path)
                            logger.info(f"古いファイルを削除: {file_path}")
                        except Exception as e:
                            logger.error(f"ファイル削除エラー: {e}")