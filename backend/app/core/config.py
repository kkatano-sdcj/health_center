from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Knowledge Search API"
    VERSION: str = "1.0.0"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://frontend:3000",
        "ws://localhost:3000",
        "ws://localhost:8000",
        "ws://frontend:3000",
        "*"  # 開発環境用に全て許可
    ]
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@postgres:5432/health_center"
    MONGODB_URL: str = "mongodb://mongodb:27017/health_center"
    REDIS_URL: str = "redis://redis:6379/0"
    
    # ChromaDB
    CHROMA_PERSIST_DIR: str = "/app/data/chroma"
    CHROMA_COLLECTION_NAME: str = "health-center-vectors"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # Azure Document Intelligence (optional)
    AZURE_DOC_INTEL_ENDPOINT: str = ""
    AZURE_DOC_INTEL_KEY: str = ""
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Vector Search
    EMBEDDING_MODEL: str = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # Allow extra fields from .env

settings = Settings()