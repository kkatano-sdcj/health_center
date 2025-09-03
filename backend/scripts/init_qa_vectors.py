#!/usr/bin/env python3
"""
QA用ChromaDBベクトルインデックスの初期化スクリプト
SupabaseからFAQデータを取得してChromaDBにインデックス化する
"""

import os
import sys
import logging
from pathlib import Path

# プロジェクトのルートパスを追加
sys.path.append(str(Path(__file__).parent.parent))

from app.services.qa_vector_service import QAVectorService
from app.core.config import settings
from dotenv import load_dotenv

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def init_qa_vectors():
    """QAベクトルインデックスを初期化"""
    try:
        # 環境変数の読み込み
        load_dotenv()
        
        # Supabase設定の確認
        supabase_url = os.getenv('SUPABASE_URL', settings.SUPABASE_URL)
        supabase_key = os.getenv('SUPABASE_KEY', settings.SUPABASE_KEY)
        
        if not supabase_url or not supabase_key:
            logger.error("Supabase URL and Key must be set in environment variables or .env file")
            return False
        
        logger.info("Initializing QA Vector Service...")
        
        # QAVectorServiceのインスタンス化
        qa_service = QAVectorService()
        
        # 初期化
        success = qa_service.initialize(
            persist_directory=settings.CHROMA_PERSIST_DIR,
            collection_name=settings.QA_CHROMA_COLLECTION_NAME,
            supabase_url=supabase_url,
            supabase_key=supabase_key
        )
        
        if not success:
            logger.error("Failed to initialize QA Vector Service")
            return False
        
        logger.info("QA Vector Service initialized successfully")
        
        # FAQデータのインデックス化
        logger.info("Starting FAQ data indexing...")
        success = qa_service.index_faq_data()
        
        if not success:
            logger.error("Failed to index FAQ data")
            return False
        
        # 統計情報の表示
        stats = qa_service.get_collection_stats()
        logger.info(f"Index statistics:")
        logger.info(f"  Total FAQs indexed: {stats.get('total_faqs', 0)}")
        logger.info(f"  Collection name: {stats.get('collection_name', 'N/A')}")
        
        if stats.get('category_distribution'):
            logger.info("  Category distribution:")
            for category, count in stats['category_distribution'].items():
                logger.info(f"    - {category}: {count}")
        
        logger.info("QA vector indexing completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error during QA vector initialization: {str(e)}")
        return False

def test_search():
    """検索機能のテスト"""
    try:
        logger.info("\nTesting search functionality...")
        
        # 環境変数の読み込み
        load_dotenv()
        
        supabase_url = os.getenv('SUPABASE_URL', settings.SUPABASE_URL)
        supabase_key = os.getenv('SUPABASE_KEY', settings.SUPABASE_KEY)
        
        # QAVectorServiceのインスタンス化
        qa_service = QAVectorService()
        qa_service.initialize(
            persist_directory=settings.CHROMA_PERSIST_DIR,
            collection_name=settings.QA_CHROMA_COLLECTION_NAME,
            supabase_url=supabase_url,
            supabase_key=supabase_key
        )
        
        # テストクエリ
        test_queries = [
            "会計カードの入力方法",
            "レセプト提出",
            "DPC制度について",
            "請求書の発行",
            "システムエラー"
        ]
        
        for query in test_queries:
            logger.info(f"\nSearching for: '{query}'")
            results = qa_service.search_similar_faqs(query, n_results=3)
            
            if results:
                logger.info(f"  Found {len(results)} results:")
                for i, result in enumerate(results, 1):
                    metadata = result.get('metadata', {})
                    logger.info(f"    {i}. {metadata.get('question_title', 'N/A')}")
                    logger.info(f"       Category: {metadata.get('category_name', 'N/A')}")
                    logger.info(f"       Similarity: {result.get('similarity_score', 0):.3f}")
            else:
                logger.info("  No results found")
        
        logger.info("\nSearch test completed!")
        return True
        
    except Exception as e:
        logger.error(f"Error during search test: {str(e)}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Initialize QA vector index')
    parser.add_argument('--rebuild', action='store_true', help='Rebuild entire index from scratch')
    parser.add_argument('--test', action='store_true', help='Run search test after initialization')
    args = parser.parse_args()
    
    if args.rebuild:
        logger.info("Rebuilding QA vector index from scratch...")
    
    # インデックスの初期化
    if init_qa_vectors():
        logger.info("✓ QA vector initialization successful")
        
        # テスト実行（オプション）
        if args.test:
            test_search()
    else:
        logger.error("✗ QA vector initialization failed")
        sys.exit(1)