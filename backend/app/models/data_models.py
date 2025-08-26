"""
データモデル定義
APIのリクエスト/レスポンスモデルとビジネスロジック用のデータクラス
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class FileFormat(str, Enum):
    """サポートするファイル形式"""
    DOCX = "docx"
    DOC = "doc"
    XLSX = "xlsx"
    XLS = "xls"
    PDF = "pdf"
    PPTX = "pptx"
    PPT = "ppt"
    # Images
    JPG = "jpg"
    JPEG = "jpeg"
    PNG = "png"
    GIF = "gif"
    BMP = "bmp"
    WEBP = "webp"
    # Audio
    MP3 = "mp3"
    WAV = "wav"
    OGG = "ogg"
    M4A = "m4a"
    FLAC = "flac"
    # Text formats
    CSV = "csv"
    JSON = "json"
    XML = "xml"
    TXT = "txt"
    MD = "md"
    # Archives
    ZIP = "zip"

class ConversionStatus(str, Enum):
    """変換処理のステータス"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ConversionRequest(BaseModel):
    """変換リクエストモデル"""
    filename: str = Field(..., description="変換するファイル名")
    use_api_enhancement: bool = Field(False, description="OpenAI APIによる強化を使用するか")

class ConversionResult(BaseModel):
    """変換結果モデル"""
    id: str = Field(..., description="変換タスクID")
    input_file: str = Field(..., description="入力ファイル名")
    output_file: Optional[str] = Field(None, description="出力ファイル名")
    status: ConversionStatus = Field(..., description="変換ステータス")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    processing_time: Optional[float] = Field(None, description="処理時間（秒）")
    markdown_content: Optional[str] = Field(None, description="変換されたMarkdownコンテンツ")
    created_at: datetime = Field(default_factory=datetime.now, description="作成日時")
    completed_at: Optional[datetime] = Field(None, description="完了日時")

class BatchConversionRequest(BaseModel):
    """バッチ変換リクエストモデル"""
    files: List[str] = Field(..., description="変換するファイルのリスト")
    use_api_enhancement: bool = Field(False, description="OpenAI APIによる強化を使用するか")

class BatchConversionResult(BaseModel):
    """バッチ変換結果モデル"""
    total_files: int = Field(..., description="総ファイル数")
    successful: int = Field(..., description="成功数")
    failed: int = Field(..., description="失敗数")
    results: List[ConversionResult] = Field(..., description="個別の変換結果")

class APISettings(BaseModel):
    """API設定モデル"""
    api_key: Optional[str] = Field(None, description="OpenAI APIキー（マスク済み）")
    is_configured: bool = Field(False, description="API設定済みかどうか")

class APIConfigRequest(BaseModel):
    """API設定リクエストモデル"""
    api_key: str = Field(..., description="OpenAI APIキー")

class APITestResult(BaseModel):
    """API接続テスト結果モデル"""
    is_valid: bool = Field(..., description="API接続が有効か")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")

class HealthCheckResponse(BaseModel):
    """ヘルスチェックレスポンスモデル"""
    status: str = Field("healthy", description="サービスステータス")
    timestamp: datetime = Field(default_factory=datetime.now, description="タイムスタンプ")
    version: str = Field("1.0.0", description="APIバージョン")