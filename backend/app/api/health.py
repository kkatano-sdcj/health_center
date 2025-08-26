"""
ヘルスチェックエンドポイント
サービスの稼働状態を確認
"""
from fastapi import APIRouter
from models.data_models import HealthCheckResponse

router = APIRouter()

@router.get("", response_model=HealthCheckResponse)
async def health_check():
    """ヘルスチェックエンドポイント"""
    return HealthCheckResponse()