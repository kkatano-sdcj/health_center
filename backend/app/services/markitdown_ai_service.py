"""
MarkItDown AI Service - MarkItDownとLLMの統合
MarkitDown.mdcの実装ルールに従った、画像説明を含む高度な変換処理
"""
import os
import logging
from typing import Optional, Dict, Any
from markitdown import MarkItDown
from openai import OpenAI
from app.models.data_models import ConversionResult, ConversionStatus
from app.services.cancel_manager import cancel_manager
from app.services.custom_converters import CustomConverterRegistry
import time
import uuid
import asyncio

logger = logging.getLogger(__name__)

class MarkItDownAIService:
    """MarkItDownとOpenAI LLMを統合したAI変換サービス"""
    
    def __init__(self):
        """初期化"""
        self.llm_client = None
        self.llm_model = "gpt-4o-mini"
        self.md_normal = None
        self.md_ai = None
        self.custom_converter_registry = CustomConverterRegistry()
        self._initialize_services()
    
    def _initialize_services(self):
        """サービスの初期化"""
        # 通常モード用のMarkItDown
        self.md_normal = MarkItDown()
        
        # プラグイン有効版（拡張機能用）
        self.md_with_plugins = MarkItDown()
        
        # AI mode用のMarkItDown（LLM統合）
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                self.llm_client = OpenAI(api_key=api_key)
                # MarkItDownにLLMクライアントを直接渡す
                self.md_ai = MarkItDown(
                    llm_client=self.llm_client,
                    llm_model=self.llm_model
                )
                logger.info(f"AI mode initialized with {self.llm_model}")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                self.md_ai = self.md_with_plugins
        else:
            logger.warning("OpenAI API key not found, AI mode disabled")
            self.md_ai = self.md_with_plugins
        
        # Azure Document Intelligence の初期化（オプション）
        self._initialize_azure_doc_intel()
        
        # カスタムコンバーターの登録
        self._register_custom_converters()
    
    def _initialize_azure_doc_intel(self):
        """Azure Document Intelligenceの初期化（複雑なドキュメント処理用）"""
        endpoint = os.getenv("AZURE_DOC_INTEL_ENDPOINT")
        key = os.getenv("AZURE_DOC_INTEL_KEY")
        
        if endpoint and key:
            try:
                # Azure Document Intelligence統合版のMarkItDown
                self.md_azure = MarkItDown(
                    docintel_endpoint=endpoint,
                    docintel_key=key
                )
                logger.info("Azure Document Intelligence initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Azure Document Intelligence: {e}")
                self.md_azure = None
        else:
            self.md_azure = None
    
    def _register_custom_converters(self):
        """カスタムコンバーターをMarkItDownインスタンスに登録"""
        # すべてのMarkItDownインスタンスにカスタムコンバーターを適用
        if self.md_normal:
            self.custom_converter_registry.apply_to_markitdown(self.md_normal)
        
        if self.md_with_plugins:
            self.custom_converter_registry.apply_to_markitdown(self.md_with_plugins)
        
        if self.md_ai:
            self.custom_converter_registry.apply_to_markitdown(self.md_ai)
        
        if self.md_azure:
            self.custom_converter_registry.apply_to_markitdown(self.md_azure)
        
        logger.info("Custom converters registered for all MarkItDown instances")
    
    async def convert_with_ai(
        self, 
        file_path: str, 
        output_filename: str, 
        use_ai_mode: bool = False,
        progress_callback = None,
        conversion_id: str = None
    ) -> ConversionResult:
        """
        AI統合でファイルを変換
        
        Args:
            file_path: 入力ファイルパス
            output_filename: 出力ファイル名
            use_ai_mode: AI変換モードを使用するか
            progress_callback: 進捗通知用コールバック
            conversion_id: 変換ID（指定されない場合は生成）
            
        Returns:
            ConversionResult: 変換結果
        """
        if conversion_id is None:
            conversion_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Register conversion for cancellation
        cancel_manager.register_conversion(conversion_id)
        
        try:
            # Check if cancelled
            if cancel_manager.is_cancelled(conversion_id):
                raise asyncio.CancelledError("変換がキャンセルされました")
            
            # Send initial progress
            if progress_callback:
                await progress_callback(conversion_id, 10, "processing", "ファイルを検証中...", os.path.basename(file_path))
            
            # ファイル検証（MarkitDown.mdcのセキュリティ考慮事項に従う）
            if not self._validate_file(file_path):
                raise ValueError("ファイル検証に失敗しました")
            
            # Check if cancelled
            if cancel_manager.is_cancelled(conversion_id):
                raise asyncio.CancelledError("変換がキャンセルされました")
            
            if progress_callback:
                await progress_callback(conversion_id, 20, "processing", "変換準備中...", os.path.basename(file_path))
            
            # 適切なMarkItDownインスタンスを選択
            md = self.md_ai if use_ai_mode and self.is_ai_available() else self.md_normal
            
            # ファイル形式を確認
            file_ext = os.path.splitext(file_path)[1].lower()[1:]
            
            # Check if cancelled
            if cancel_manager.is_cancelled(conversion_id):
                raise asyncio.CancelledError("変換がキャンセルされました")
            
            if progress_callback:
                await progress_callback(conversion_id, 30, "processing", "ファイルを解析中...", os.path.basename(file_path))
            
            # 画像ファイルの特別処理
            if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                # 画像ファイルは直接処理（MarkItDownは画像からテキストを抽出しないため）
                ai_description = None
                if use_ai_mode and self.is_ai_available():
                    if progress_callback:
                        await progress_callback(conversion_id, 50, "processing", "AI分析中...", os.path.basename(file_path))
                    # AI modeの場合、MarkItDownでAI分析を取得
                    result = md.convert(file_path)
                    if result and result.text_content:
                        ai_description = result.text_content
                
                if progress_callback:
                    await progress_callback(conversion_id, 70, "processing", "OCR処理中...", os.path.basename(file_path))
                # OCR処理を含む画像処理
                markdown_content = self._process_standalone_image(file_path, ai_description)
            else:
                # 他のファイル形式の変換
                logger.info(f"Converting {file_path} with {'AI' if use_ai_mode else 'Normal'} mode")
                
                # ファイルサイズチェック（大きなファイルはAI処理を制限）
                file_size = os.path.getsize(file_path)
                file_size_mb = file_size / (1024 * 1024)
                
                if use_ai_mode and file_size_mb > 5:  # 5MB以上の場合
                    logger.warning(f"Large file detected ({file_size_mb:.2f} MB), using simplified AI processing")
                    # 大きなファイルは通常の変換のみ実行
                    md_to_use = self.md_normal  # AI無しのMarkItDownを使用
                    if progress_callback:
                        await progress_callback(conversion_id, 50, "processing", "大きなファイルのため簡易処理中...", os.path.basename(file_path))
                else:
                    md_to_use = md
                    
                result = md_to_use.convert(file_path)
                
                if not result or not result.text_content:
                    raise ValueError("変換結果が空です")
                
                markdown_content = result.text_content
                
                # AI強化は小さなファイルのみ、または簡易的に実行
                if use_ai_mode and self.is_ai_available() and file_size_mb <= 5:
                    # ドキュメントファイルのAI強化（小さなファイルのみ）
                    if file_ext in ['docx', 'pptx', 'pdf']:
                        if progress_callback:
                            await progress_callback(conversion_id, 70, "processing", "AI強化処理中...", os.path.basename(file_path))
                        markdown_content = self._enhance_document_with_ai(markdown_content, file_ext)
                elif use_ai_mode and file_size_mb > 5:
                    # 大きなファイルには簡易的なメタデータのみ追加
                    markdown_content = f"# Document Conversion\n\n**File**: {os.path.basename(file_path)}\n**Size**: {file_size_mb:.2f} MB\n**Note**: Simplified processing due to large file size\n\n---\n\n{markdown_content}"
            
            if progress_callback:
                await progress_callback(conversion_id, 90, "processing", "ファイルを保存中...", os.path.basename(file_path))
            
            # 出力ファイルに保存
            output_path = os.path.join("./converted", output_filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            
            processing_time = time.time() - start_time
            
            if progress_callback:
                await progress_callback(conversion_id, 100, "completed", "変換完了", os.path.basename(file_path))
            
            # メトリクスのログ記録（MarkitDown.mdcの品質保証に従う）
            self._log_conversion_metrics(file_path, markdown_content, processing_time)
            
            return ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(file_path),
                output_file=output_filename,
                status=ConversionStatus.COMPLETED,
                processing_time=processing_time,
                markdown_content=markdown_content
            )
            
        except asyncio.CancelledError as e:
            logger.info(f"Conversion {conversion_id} was cancelled")
            if progress_callback:
                await progress_callback(conversion_id, 0, "cancelled", "キャンセルされました", os.path.basename(file_path))
            return ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(file_path),
                status=ConversionStatus.FAILED,
                error_message="変換がキャンセルされました",
                processing_time=time.time() - start_time
            )
        except Exception as e:
            logger.error(f"Conversion error: {str(e)}")
            return ConversionResult(
                id=conversion_id,
                input_file=os.path.basename(file_path),
                status=ConversionStatus.FAILED,
                error_message=f"変換エラー: {str(e)}",
                processing_time=time.time() - start_time
            )
        finally:
            # Unregister conversion
            cancel_manager.unregister_conversion(conversion_id)
    
    def _validate_file(self, file_path: str) -> bool:
        """
        ファイル検証（MarkitDown.mdcのセキュリティ考慮事項に従う）
        
        Args:
            file_path: 検証するファイルパス
            
        Returns:
            bool: 検証成功かどうか
        """
        # ファイルの存在確認
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"ファイルが見つかりません: {file_path}")
        
        # ファイルサイズ制限
        max_size = 100 * 1024 * 1024  # 100MB
        file_size = os.path.getsize(file_path)
        if file_size > max_size:
            raise ValueError(f"ファイルサイズが制限を超えています: {file_size/1024/1024:.2f}MB (最大: {max_size/1024/1024}MB)")
        
        # サポートされているファイル形式
        allowed_extensions = {
            '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
            '.html', '.txt', '.csv', '.json', '.xml', '.zip',
            '.mp3', '.wav', '.ogg', '.m4a', '.flac'
        }
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in allowed_extensions:
            raise ValueError(f"サポートされていないファイル形式: {ext}")
        
        return True
    
    def _enhance_document_with_ai(self, markdown_content: str, file_type: str) -> str:
        """
        ドキュメントをAIで強化（画像説明を分離して表記）
        
        Args:
            markdown_content: 元のMarkdown内容
            file_type: ファイルタイプ
            
        Returns:
            str: 強化されたMarkdown
        """
        # 画像の説明を分離して整理
        enhanced_content = f"# AI Enhanced Document\n\n"
        enhanced_content += f"**Document Type**: {file_type.upper()}\n"
        enhanced_content += f"**AI Processing**: Enabled (Model: {self.llm_model})\n"
        enhanced_content += f"**Features**: Image descriptions, chart analysis, enhanced formatting\n\n"
        enhanced_content += "---\n\n"
        
        # 画像説明を抽出して分離
        enhanced_content += self._separate_image_descriptions(markdown_content)
        
        return enhanced_content
    
    def _separate_image_descriptions(self, markdown_content: str) -> str:
        """
        画像の説明を元のコンテンツから分離して整理
        OCRで読み取ったテキストは元の位置に配置
        
        Args:
            markdown_content: 元のMarkdown内容
            
        Returns:
            str: 整理されたMarkdown
        """
        import re
        
        lines = markdown_content.split('\n')
        result_lines = []
        image_descriptions = []
        image_counter = 0
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # 画像リンクを検出
            if line.strip().startswith('!['):
                image_counter += 1
                
                # 画像の説明を抽出
                match = re.match(r'!\[(.*?)\]\((.*?)\)', line)
                if match:
                    description = match.group(1)
                    image_path = match.group(2)
                    
                    # 元の位置には画像参照を配置
                    image_ref = f"![Image {image_counter}]({image_path})"
                    result_lines.append(image_ref)
                    
                    # AI生成の説明から画像内のテキストを抽出
                    extracted_text = self._extract_ocr_text(description)
                    
                    if extracted_text:
                        # OCRで読み取ったテキストを元の位置に追加
                        result_lines.append("")
                        result_lines.append("**📝 画像内のテキスト:**")
                        for text in extracted_text:
                            result_lines.append(f"- {text}")
                        result_lines.append("")
                    
                    # 説明が長い場合（AI生成の説明）、別セクションに保存
                    if len(description) > 50:  # AI生成の説明は通常長い
                        image_descriptions.append({
                            'number': image_counter,
                            'description': description,
                            'path': image_path,
                            'extracted_text': extracted_text
                        })
                    else:
                        # 短い説明はそのまま残す
                        if not extracted_text:  # OCRテキストがない場合のみ
                            result_lines.append(f"*{description}*")
                else:
                    result_lines.append(line)
            else:
                result_lines.append(line)
            
            i += 1
        
        # 元のコンテンツ
        final_content = "## 📄 Document Content\n\n"
        final_content += '\n'.join(result_lines)
        
        # 画像説明セクションを追加
        if image_descriptions:
            final_content += "\n\n---\n\n"
            final_content += "## 🖼️ AI Image Analysis\n\n"
            
            for img_desc in image_descriptions:
                final_content += f"### Image {img_desc['number']}\n\n"
                final_content += f"**File**: `{img_desc['path']}`\n\n"
                
                # OCRテキストは既に元の位置に表示されているので、ここでは分析のみ
                final_content += "**AI Analysis**:\n"
                # OCRテキスト部分を除いた分析を表示
                analysis = self._remove_ocr_from_description(img_desc['description'], img_desc['extracted_text'])
                final_content += f"{analysis}\n\n"
        
        return final_content
    
    def _extract_ocr_text(self, description: str) -> list:
        """
        AI説明文から画像内のテキスト（OCR結果）を抽出
        元の言語のまま抽出（日本語は日本語、英語は英語のまま）
        
        Args:
            description: AI生成の画像説明
            
        Returns:
            list: 抽出されたテキストのリスト
        """
        import re
        
        extracted_texts = []
        
        # より幅広いパターンで、引用符内のすべてのテキストを抽出
        # 言語を問わず、引用符で囲まれたものは画像内のテキストと判断
        quote_patterns = [
            r'"([^"]+)"',  # ダブルクォート
            r"'([^']+)'",  # シングルクォート  
            r'「([^」]+)」',  # 日本語の鉤括弧
            r'『([^』]+)』',  # 日本語の二重鉤括弧
            r'"([^"]+)"',  # 全角ダブルクォート
            r"'([^']+)'",  # 全角シングルクォート
            r'【([^】]+)】',  # 隅付き括弧
            r'［([^］]+)］',  # 全角角括弧
            r'\[([^\]]+)\]',  # 半角角括弧（UIラベル等）
            r'〈([^〉]+)〉',  # 山括弧
            r'《([^》]+)》',  # 二重山括弧
        ]
        
        # すべての引用符パターンでテキストを抽出
        for pattern in quote_patterns:
            matches = re.findall(pattern, description)
            for match in matches:
                # 重複を避け、短すぎるものは除外
                if match not in extracted_texts and len(match.strip()) >= 1:
                    # 説明的な英語フレーズは除外（実際の画像内テキストではない可能性が高い）
                    exclude_phrases = [
                        'the image', 'this shows', 'appears to be', 'seems to be',
                        'can be seen', 'is visible', 'is displayed', 'is shown',
                        'the user', 'the system', 'the interface', 'the screen',
                        'contains', 'includes', 'features', 'with text'
                    ]
                    
                    # 除外フレーズを含まない場合のみ追加
                    if not any(phrase in match.lower() for phrase in exclude_phrases):
                        extracted_texts.append(match)
        
        # 特定のキーワードに続くテキストも抽出（引用符なしの場合）
        # これらは実際のUI要素のテキストである可能性が高い
        ui_patterns = [
            # 英語パターン
            r'(?:titled|labeled|marked as|reading|saying|displaying|showing|written as)\s+([^\.,;:"\']+)',
            r'(?:button|field|label|text|title|heading|menu|tab|option|caption)\s+(?:reads?|says?|shows?|displays?|contains?)\s+([^\.,;:"\']+)',
            r'(?:with the text|with text|text reading|displaying text)\s+([^\.,;:"\']+)',
            
            # 日本語パターン
            r'(?:ボタン|フィールド|ラベル|テキスト|タイトル|見出し|メニュー|タブ|キャプション)(?:に|の|が|は|として)\s*([^\。、；：""'']+)',
            r'(?:と書かれ|と表示され|というテキスト|という文字|という表記)(?:ている|た)\s*([^\。、；：""'']+)',
            r'(?:テキスト|文字|表記|文言)(?:は|が)\s*([^\。、；：""'']+)(?:です|である|となっ)',
        ]
        
        for pattern in ui_patterns:
            matches = re.findall(pattern, description, re.IGNORECASE | re.UNICODE)
            for match in matches:
                cleaned = match.strip()
                # 長すぎるものは説明文の可能性があるので除外
                if cleaned not in extracted_texts and 1 <= len(cleaned) <= 100:
                    # 動詞や冠詞だけのものは除外
                    if not cleaned.lower() in ['is', 'are', 'was', 'were', 'the', 'a', 'an', 'です', 'ます', 'である']:
                        extracted_texts.append(cleaned)
        
        # 日本語の文脈から抽出（より自然な日本語表現）
        japanese_context_patterns = [
            r'([ぁ-んァ-ヴー一-龯]+)(?:というボタン|というリンク|というタブ|というメニュー)',
            r'([ぁ-んァ-ヴー一-龯]+)(?:と表示|と書かれ|と記載)',
            r'画面に(?:は)?([ぁ-んァ-ヴー一-龯]+)(?:と|が)',
        ]
        
        for pattern in japanese_context_patterns:
            matches = re.findall(pattern, description)
            for match in matches:
                if match not in extracted_texts and len(match.strip()) >= 1:
                    extracted_texts.append(match)
        
        # リストをクリーンアップ（前後の空白を削除）
        extracted_texts = [text.strip() for text in extracted_texts if text.strip()]
        
        # 元の順序を保持しつつ重複を削除
        seen = set()
        unique_texts = []
        for text in extracted_texts:
            if text not in seen:
                seen.add(text)
                unique_texts.append(text)
        
        return unique_texts
    
    def _remove_ocr_from_description(self, description: str, extracted_texts: list) -> str:
        """
        説明文からOCRテキスト部分を除去してAI分析のみを残す
        
        Args:
            description: 元の説明文
            extracted_texts: 抽出されたOCRテキスト
            
        Returns:
            str: OCRテキストを除いた分析
        """
        import re
        
        result = description
        
        # OCRテキストに関連する記述を簡略化
        if extracted_texts:
            # 各抽出テキストに関する記述を削除または簡略化
            for text in extracted_texts:
                # テキストを含む文を見つけて簡略化
                result = re.sub(
                    rf'[^.]*["\']?{re.escape(text)}["\']?[^.]*\.',
                    '',
                    result,
                    flags=re.IGNORECASE
                )
        
        # 残った説明を整理
        sentences = result.split('.')
        cleaned_sentences = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and len(sentence) > 10:
                # OCR関連のフレーズを含む文は除外
                ocr_phrases = ['titled', 'labeled', 'text reads', 'displays text', 'shows text', 'contains text']
                if not any(phrase in sentence.lower() for phrase in ocr_phrases):
                    cleaned_sentences.append(sentence)
        
        return '. '.join(cleaned_sentences) + '.' if cleaned_sentences else description
    
    def _process_standalone_image(self, file_path: str, ai_description: str = None) -> str:
        """
        スタンドアロン画像ファイル（スクリーンショット等）を処理
        OCRでテキストを抽出し、AI分析と組み合わせる
        
        Args:
            file_path: 画像ファイルパス
            ai_description: AI生成の説明（オプション）
            
        Returns:
            str: フォーマットされたMarkdown
        """
        import re
        from app.services.paddle_ocr_service import PaddleOCRService
        
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path) / 1024  # KB
        
        # Markdownの構造を作成
        formatted_content = f"# Image Analysis: {file_name}\n\n"
        
        # ファイル情報
        formatted_content += f"## 📁 File Information\n\n"
        formatted_content += f"- **File**: `{file_name}`\n"
        formatted_content += f"- **Size**: {file_size:.2f} KB\n"
        formatted_content += f"- **Type**: {os.path.splitext(file_name)[1].upper()[1:]} Image\n"
        if ai_description:
            formatted_content += f"- **AI Model**: {self.llm_model}\n"
        formatted_content += "\n---\n\n"
        
        # OCRでテキストを抽出（通常モードでも実行）
        ocr_service = PaddleOCRService()
        ocr_text = ""
        
        if ocr_service.is_available():
            try:
                # OCRでテキストを抽出
                ocr_result = ocr_service.extract_text(file_path)
                if ocr_result and "OCR extraction failed" not in ocr_result and "No text detected" not in ocr_result:
                    ocr_text = ocr_result
            except Exception as e:
                logger.warning(f"OCR extraction failed: {e}")
        
        # AI説明から引用符内のテキストも抽出
        extracted_texts = self._extract_ocr_text(ai_description) if ai_description else []
        
        # OCRテキストとAI抽出テキストを統合
        all_texts = []
        
        # OCRテキストを行ごとに分割
        if ocr_text:
            ocr_lines = [line.strip() for line in ocr_text.split('\n') if line.strip()]
            # [low confidence] や [unverified] を除去
            for line in ocr_lines:
                cleaned = re.sub(r'\s*\[(?:low confidence|unverified).*?\]', '', line).strip()
                if cleaned and cleaned not in all_texts:
                    all_texts.append(cleaned)
        
        # AI抽出テキストを追加（重複を避ける）
        for text in extracted_texts:
            if text not in all_texts:
                all_texts.append(text)
        
        # 画像内のテキストセクション
        if all_texts:
            formatted_content += f"## 📝 Extracted Text\n\n"
            formatted_content += "**Text found in the image:**\n\n"
            for text in all_texts:
                formatted_content += f"- {text}\n"
            formatted_content += "\n---\n\n"
        
        # 画像プレビュー
        formatted_content += f"## 🖼️ Image Preview\n\n"
        formatted_content += f"![{file_name}]({file_path})\n\n"
        
        formatted_content += "---\n\n"
        
        # AI分析（テキスト情報を除いた純粋な分析）
        if ai_description:
            formatted_content += "## 🤖 AI Analysis\n\n"
            # OCRテキストを除いた分析を表示
            analysis = self._remove_ocr_from_description(ai_description, all_texts)
            if analysis:
                formatted_content += f"{analysis}\n\n"
            else:
                formatted_content += "This image contains the text shown above. "
                formatted_content += "The layout and visual elements suggest this is a screenshot or document scan.\n\n"
        elif not all_texts:
            # OCRテキストもAI分析もない場合
            formatted_content += "## 📝 Notes\n\n"
            formatted_content += "No text was detected in this image.\n\n"
        
        return formatted_content
    
    def _format_image_result(self, markdown_content: str, file_path: str) -> str:
        """
        画像変換結果のフォーマット（画像単体の場合）
        
        Args:
            markdown_content: 変換されたMarkdown内容
            file_path: 画像ファイルパス
            
        Returns:
            str: フォーマットされたMarkdown
        """
        import re
        
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path) / 1024  # KB
        
        formatted_content = f"# Image Analysis: {file_name}\n\n"
        
        # ファイル情報セクション
        formatted_content += f"## 📁 File Information\n\n"
        formatted_content += f"- **File**: `{file_name}`\n"
        formatted_content += f"- **Size**: {file_size:.2f} KB\n"
        formatted_content += f"- **AI Model**: {self.llm_model}\n\n"
        
        formatted_content += "---\n\n"
        
        # 画像プレビューセクション
        formatted_content += f"## 🖼️ Image Preview\n\n"
        formatted_content += f"![{file_name}]({file_path})\n\n"
        
        formatted_content += "---\n\n"
        
        # AI分析セクション
        formatted_content += "## 🤖 AI Analysis\n\n"
        
        # マークダウンコンテンツから画像説明を抽出
        # MarkItDownは画像の場合、説明文のみを返すことが多い
        if markdown_content.strip().startswith('!['):
            # 画像リンクから説明を抽出
            match = re.match(r'!\[(.*?)\]\((.*?)\)', markdown_content)
            if match:
                description = match.group(1)
                formatted_content += f"{description}\n\n"
            else:
                formatted_content += markdown_content
        else:
            # 通常のテキスト説明
            formatted_content += markdown_content
        
        return formatted_content
    
    def _log_conversion_metrics(self, file_path: str, result: str, processing_time: float):
        """
        変換メトリクスのログ記録（MarkitDown.mdcの品質保証に従う）
        
        Args:
            file_path: 入力ファイルパス
            result: 変換結果
            processing_time: 処理時間
        """
        file_size = os.path.getsize(file_path)
        output_size = len(result.encode('utf-8'))
        
        logger.info(f"変換完了: {os.path.basename(file_path)}")
        logger.info(f"入力サイズ: {file_size/1024:.2f}KB")
        logger.info(f"出力サイズ: {output_size/1024:.2f}KB")
        logger.info(f"処理時間: {processing_time:.2f}秒")
        logger.info(f"変換効率: {output_size/file_size:.2f}")
    
    def is_ai_available(self) -> bool:
        """AI機能が利用可能か確認"""
        return self.llm_client is not None and self.md_ai is not None
    
    def get_status(self) -> Dict[str, Any]:
        """サービスステータスを取得"""
        return {
            'service': 'MarkItDown AI Service',
            'ai_available': self.is_ai_available(),
            'azure_available': self.md_azure is not None,
            'llm_model': self.llm_model if self.is_ai_available() else None,
            'markitdown_version': '0.1.2',
            'features': {
                'image_description': self.is_ai_available(),
                'chart_analysis': self.is_ai_available(),
                'document_enhancement': self.is_ai_available(),
                'ocr': True,
                'metadata_extraction': True,
                'plugins_enabled': True,
                'stream_processing': True,
                'azure_doc_intel': self.md_azure is not None
            }
        }
    
    async def batch_convert_with_ai(
        self, 
        file_paths: list[str], 
        use_ai_mode: bool = False
    ) -> list[ConversionResult]:
        """
        バッチ変換（MarkitDown.mdcのパフォーマンス最適化に従う）
        
        Args:
            file_paths: 変換するファイルパスのリスト
            use_ai_mode: AI変換モードを使用するか
            
        Returns:
            list[ConversionResult]: 変換結果のリスト
        """
        results = []
        
        # MarkItDownインスタンスを再利用（パフォーマンス最適化）
        md_instance = self.md_ai if use_ai_mode and self.is_ai_available() else self.md_normal
        
        for file_path in file_paths:
            base_name = os.path.splitext(os.path.basename(file_path))[0]
            output_filename = f"{base_name}.md"
            
            result = await self.convert_with_ai(file_path, output_filename, use_ai_mode)
            results.append(result)
        
        return results
    
    async def convert_stream(
        self,
        file_stream,
        file_info: Dict[str, Any],
        output_filename: str,
        use_ai_mode: bool = False
    ) -> ConversionResult:
        """
        ストリーム処理で大容量ファイルを効率的に変換
        
        Args:
            file_stream: ファイルストリーム
            file_info: ファイル情報（mime_type, encoding等）
            output_filename: 出力ファイル名
            use_ai_mode: AI変換モードを使用するか
            
        Returns:
            ConversionResult: 変換結果
        """
        conversion_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # 適切なMarkItDownインスタンスを選択
            if self.md_azure and file_info.get('use_azure', False):
                md = self.md_azure
            elif use_ai_mode and self.is_ai_available():
                md = self.md_ai
            else:
                md = self.md_with_plugins
            
            # ストリーム変換
            result = md.convert_stream(
                file_stream,
                mime_type=file_info.get('mime_type'),
                encoding=file_info.get('encoding', 'utf-8')
            )
            
            if not result or not result.text_content:
                raise ValueError("Stream conversion failed")
            
            markdown_content = result.text_content
            
            # 出力ファイルに保存
            output_path = os.path.join("./converted", output_filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            
            processing_time = time.time() - start_time
            
            return ConversionResult(
                id=conversion_id,
                input_file=file_info.get('filename', 'stream'),
                output_file=output_filename,
                status=ConversionStatus.COMPLETED,
                processing_time=processing_time,
                markdown_content=markdown_content
            )
            
        except Exception as e:
            logger.error(f"Stream conversion error: {str(e)}")
            return ConversionResult(
                id=conversion_id,
                input_file=file_info.get('filename', 'stream'),
                status=ConversionStatus.FAILED,
                error_message=f"Stream conversion error: {str(e)}",
                processing_time=time.time() - start_time
            )
    
    async def convert_url(
        self,
        url: str,
        output_filename: str,
        use_ai_mode: bool = False
    ) -> ConversionResult:
        """
        URLを直接変換（ダウンロード不要）
        
        Args:
            url: 変換するURL
            output_filename: 出力ファイル名
            use_ai_mode: AI変換モードを使用するか
            
        Returns:
            ConversionResult: 変換結果
        """
        conversion_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            # URLの検証
            if not url.startswith(('http://', 'https://')):
                raise ValueError("Invalid URL format")
            
            # 適切なMarkItDownインスタンスを選択
            md = self.md_ai if use_ai_mode and self.is_ai_available() else self.md_with_plugins
            
            # URL直接変換
            logger.info(f"Converting URL directly: {url}")
            result = md.convert_url(url)
            
            if not result or not result.text_content:
                raise ValueError("URL conversion failed")
            
            markdown_content = result.text_content
            
            # AI強化（必要な場合）
            if use_ai_mode and self.is_ai_available():
                markdown_content = self._enhance_document_with_ai(markdown_content, "web")
            
            # 出力ファイルに保存
            output_path = os.path.join("./converted", output_filename)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            
            processing_time = time.time() - start_time
            
            return ConversionResult(
                id=conversion_id,
                input_file=url,
                output_file=output_filename,
                status=ConversionStatus.COMPLETED,
                processing_time=processing_time,
                markdown_content=markdown_content
            )
            
        except Exception as e:
            logger.error(f"URL conversion error: {str(e)}")
            return ConversionResult(
                id=conversion_id,
                input_file=url,
                status=ConversionStatus.FAILED,
                error_message=f"URL conversion error: {str(e)}",
                processing_time=time.time() - start_time
            )