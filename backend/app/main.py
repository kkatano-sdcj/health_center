from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.api import chat, documents, search, conversion, settings as api_settings
from app.api.websocket import websocket_endpoint
from app.core.config import settings
from app.core.database import init_db
from app.services.conversion_service import ConversionService

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 変換サービスの初期化
conversion_service = ConversionService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    
    # MarkitDown用のディレクトリ作成
    os.makedirs("original", exist_ok=True)
    os.makedirs("converted", exist_ok=True)
    
    yield
    # Shutdown
    pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    # 100MBまでのファイルアップロードを許可
    max_request_size=100 * 1024 * 1024
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# タイムアウトミドルウェア
class TimeoutMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 大きなファイルアップロードのために長いタイムアウトを設定
        import asyncio
        try:
            response = await asyncio.wait_for(call_next(request), timeout=600.0)  # 10分
            return response
        except asyncio.TimeoutError:
            logger.error(f"Request timeout: {request.url}")
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=504,
                content={"detail": "Request timeout"}
            )

app.add_middleware(TimeoutMiddleware)

# APIルーターの登録
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])

# MarkitDown APIルーターの登録
app.include_router(conversion.router, prefix="/api/v1/conversion", tags=["conversion"])
app.include_router(api_settings.router, prefix="/api/v1/settings", tags=["settings"])

# Vectorization APIルーターの登録
from app.api import vectorization
app.include_router(vectorization.router, tags=["vectorization"])

# RAG APIルーターの登録
from app.api import rag
app.include_router(rag.router, tags=["rag"])

# AI Chat APIルーターの登録
from app.api import aichat
app.include_router(aichat.router, prefix="/api/v1/aichat", tags=["aichat"])

# WebSocketエンドポイント
@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.get("/")
async def root():
    return {
        "message": "Health Center API",
        "version": settings.VERSION,
        "status": "running",
        "features": ["chat", "documents", "search", "conversion"]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}