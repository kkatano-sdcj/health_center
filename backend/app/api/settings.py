"""
設定管理APIエンドポイント
OpenAI API設定の管理
"""
from fastapi import APIRouter, HTTPException
from app.models.data_models import (
    APISettings, APIConfigRequest, APITestResult
)
from app.services.api_service import APIService
from app.services.config_manager import ConfigManager
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# サービスのインスタンス化
api_service = APIService()
config_manager = ConfigManager()

@router.get("/api", response_model=APISettings)
async def get_api_settings():
    """
    現在のAPI設定を取得
    
    Returns:
        APISettings: API設定情報
    """
    masked_key = config_manager.get_masked_api_key()
    status = api_service.get_api_status()
    
    return APISettings(
        api_key=masked_key,
        is_configured=status["is_configured"]
    )

@router.post("/api/configure", response_model=APISettings)
async def configure_api(request: APIConfigRequest):
    """
    OpenAI APIキーを設定
    
    Args:
        request: API設定リクエスト
    
    Returns:
        APISettings: 更新後のAPI設定情報
    """
    try:
        # APIキーを保存
        config_manager.save_api_key(request.api_key)
        
        # APIサービスを更新
        api_service.update_api_key(request.api_key)
        
        return APISettings(
            api_key=config_manager.get_masked_api_key(),
            is_configured=True
        )
    except Exception as e:
        logger.error(f"API設定エラー: {e}")
        raise HTTPException(status_code=500, detail="API設定の保存に失敗しました")

@router.post("/api/test", response_model=APITestResult)
async def test_api_connection(request: APIConfigRequest):
    """
    APIキーの有効性をテスト
    
    Args:
        request: テストするAPIキー
    
    Returns:
        APITestResult: テスト結果
    """
    is_valid, error_message = await api_service.validate_api_key(request.api_key)
    
    return APITestResult(
        is_valid=is_valid,
        error_message=error_message
    )

@router.get("/config")
async def get_app_config():
    """
    アプリケーション設定を取得
    
    Returns:
        dict: アプリケーション設定
    """
    return {
        "use_api_enhancement": config_manager.get("use_api_enhancement", False),
        "max_file_size_mb": config_manager.get("max_file_size_mb", 10),
        "allowed_file_types": config_manager.get("allowed_file_types", ["docx", "xlsx", "pdf", "pptx"])
    }

@router.put("/config")
async def update_app_config(config: dict):
    """
    アプリケーション設定を更新
    
    Args:
        config: 更新する設定
    
    Returns:
        dict: 更新後の設定
    """
    for key, value in config.items():
        config_manager.set(key, value)
    
    return await get_app_config()