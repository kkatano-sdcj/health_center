from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
from typing import Optional

from app.core.config import settings

# PostgreSQL
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# MongoDB
mongodb_client: Optional[AsyncIOMotorClient] = None
mongodb_database = None

# Redis
redis_client: Optional[redis.Redis] = None

async def init_db():
    """Initialize database connections"""
    global mongodb_client, mongodb_database, redis_client
    
    # MongoDB
    mongodb_client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongodb_database = mongodb_client.health_center
    
    # Redis
    redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=True)

async def close_db():
    """Close database connections"""
    global mongodb_client, redis_client
    
    if mongodb_client:
        mongodb_client.close()
    
    if redis_client:
        await redis_client.close()

def get_db():
    """Dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_mongodb():
    """Dependency to get MongoDB database"""
    return mongodb_database

async def get_redis():
    """Dependency to get Redis client"""
    return redis_client