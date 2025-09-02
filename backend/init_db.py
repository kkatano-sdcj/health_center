import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine
from app.models.conversation import Conversation
from app.models.note import Note
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """データベースのテーブルを作成"""
    try:
        # すべてのテーブルを作成
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        return False

if __name__ == "__main__":
    if init_database():
        print("Database initialization completed successfully")
    else:
        print("Database initialization failed")
        sys.exit(1)