import os
import hashlib
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)


class QAVectorService:
    """QAChat用のベクトル検索サービス
    既存のRAGチャット用のVectorDBServiceとは独立して動作
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.client = None
            self.collection = None
            self.embedding_model = None
            self.supabase_client: Optional[Client] = None
            self._initialized = True
    
    def initialize(
        self, 
        persist_directory: str = "./chroma_db",
        collection_name: str = "qa_faq_embeddings",
        supabase_url: str = None,
        supabase_key: str = None
    ):
        """QA専用のChromaDBコレクションを初期化"""
        try:
            os.makedirs(persist_directory, exist_ok=True)
            
            # ChromaDBクライアントの初期化
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # 埋め込みモデルの初期化
            self.embedding_model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
            
            # QA専用コレクションの作成または取得
            try:
                self.collection = self.client.get_collection(name=collection_name)
                logger.info(f"Using existing QA collection: {collection_name}")
            except Exception:
                self.collection = self.client.create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine", "type": "qa_faq"}
                )
                logger.info(f"Created new QA collection: {collection_name}")
            
            # Supabaseクライアントの初期化
            if supabase_url and supabase_key:
                self.supabase_client = create_client(supabase_url, supabase_key)
                logger.info("Supabase client initialized for FAQ data access")
            
            logger.info("QA Vector database initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize QA vector database: {str(e)}")
            return False
    
    def generate_embedding(self, text: str) -> List[float]:
        """テキストから埋め込みベクトルを生成"""
        try:
            if not self.embedding_model:
                logger.error("Embedding model not initialized")
                return []
            
            embedding = self.embedding_model.encode(text)
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {str(e)}")
            return []
    
    def fetch_faq_data_from_supabase(self) -> List[Dict[str, Any]]:
        """SupabaseからFAQデータを取得"""
        try:
            if not self.supabase_client:
                logger.error("Supabase client not initialized")
                return []
            
            # FAQデータの取得（回答がある項目のみ）
            response = self.supabase_client.table('faqs')\
                .select('*, faq_categories(name, code)')\
                .not_.is_('answer_content', 'null')\
                .execute()
            
            faqs = []
            for faq in response.data:
                faq_data = {
                    'id': faq['id'],
                    'record_number': faq['record_number'],
                    'question_title': faq['question_title'],
                    'question_content': faq['question_content'],
                    'answer_content': faq['answer_content'],
                    'category_name': faq['faq_categories']['name'] if faq.get('faq_categories') else 'その他',
                    'category_code': faq['faq_categories']['code'] if faq.get('faq_categories') else 'OTHER',
                    'status': faq.get('status', 'resolved'),
                    'priority': faq.get('priority', 'medium'),
                    'tags': faq.get('tags', []),
                    'created_at': faq['created_at'],
                    'updated_at': faq['updated_at']
                }
                faqs.append(faq_data)
            
            logger.info(f"Fetched {len(faqs)} FAQ records from Supabase")
            return faqs
            
        except Exception as e:
            logger.error(f"Failed to fetch FAQ data from Supabase: {str(e)}")
            return []
    
    def index_faq_data(self, faqs: List[Dict[str, Any]] = None) -> bool:
        """FAQデータをベクトル化してインデックスに追加"""
        try:
            if not self.collection:
                logger.error("QA vector collection not initialized")
                return False
            
            # FAQデータの取得
            if faqs is None:
                faqs = self.fetch_faq_data_from_supabase()
            
            if not faqs:
                logger.warning("No FAQ data to index")
                return False
            
            # 既存のデータをクリア（オプション）
            # self.collection.delete(where={})
            
            # FAQデータをベクトル化してインデックスに追加
            for faq in faqs:
                # ベクトル化するテキストの準備
                text_for_embedding = f"""
                カテゴリ: {faq['category_name']}
                質問タイトル: {faq['question_title']}
                質問内容: {faq['question_content']}
                回答内容: {faq['answer_content']}
                """.strip()
                
                # 埋め込みベクトルの生成
                embedding = self.generate_embedding(text_for_embedding)
                
                if not embedding:
                    logger.warning(f"Failed to generate embedding for FAQ {faq['record_number']}")
                    continue
                
                # メタデータの準備
                metadata = {
                    'faq_id': faq['id'],
                    'record_number': faq['record_number'],
                    'category_name': faq['category_name'],
                    'category_code': faq['category_code'],
                    'status': faq['status'],
                    'priority': faq['priority'],
                    'question_title': faq['question_title'][:200],  # タイトルの最初の200文字
                    'created_at': faq['created_at'],
                    'updated_at': faq['updated_at']
                }
                
                # タグの追加
                if faq.get('tags'):
                    metadata['tags'] = ','.join(faq['tags']) if isinstance(faq['tags'], list) else str(faq['tags'])
                
                # ChromaDBに追加
                self.collection.upsert(
                    ids=[f"faq_{faq['id']}"],
                    embeddings=[embedding],
                    documents=[text_for_embedding],
                    metadatas=[metadata]
                )
            
            logger.info(f"Successfully indexed {len(faqs)} FAQ records")
            return True
            
        except Exception as e:
            logger.error(f"Failed to index FAQ data: {str(e)}")
            return False
    
    def search_similar_faqs(
        self,
        query: str,
        n_results: int = 5,
        category_filter: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """類似するFAQを検索"""
        try:
            if not self.collection:
                logger.error("QA vector collection not initialized")
                return []
            
            # クエリの埋め込みベクトルを生成
            query_embedding = self.generate_embedding(query)
            
            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return []
            
            # フィルター条件の構築
            where_clause = {}
            if category_filter:
                where_clause['category_code'] = category_filter
            if status_filter:
                where_clause['status'] = status_filter
            
            # 類似検索の実行
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause if where_clause else None
            )
            
            # 結果の整形
            formatted_results = []
            if results['ids'] and len(results['ids'][0]) > 0:
                for i in range(len(results['ids'][0])):
                    result = {
                        'id': results['ids'][0][i],
                        'document': results['documents'][0][i] if results['documents'] else '',
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results['distances'] else 0,
                        'similarity_score': 1 - (results['distances'][0][i] if results['distances'] else 0)
                    }
                    formatted_results.append(result)
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Failed to search similar FAQs: {str(e)}")
            return []
    
    def update_faq_in_index(self, faq_id: str, faq_data: Dict[str, Any]) -> bool:
        """特定のFAQをインデックスで更新"""
        try:
            if not self.collection:
                logger.error("QA vector collection not initialized")
                return False
            
            # ベクトル化するテキストの準備
            text_for_embedding = f"""
            カテゴリ: {faq_data.get('category_name', '')}
            質問タイトル: {faq_data['question_title']}
            質問内容: {faq_data['question_content']}
            回答内容: {faq_data['answer_content']}
            """.strip()
            
            # 埋め込みベクトルの生成
            embedding = self.generate_embedding(text_for_embedding)
            
            if not embedding:
                logger.warning(f"Failed to generate embedding for FAQ {faq_id}")
                return False
            
            # メタデータの準備
            metadata = {
                'faq_id': faq_id,
                'record_number': faq_data.get('record_number', ''),
                'category_name': faq_data.get('category_name', ''),
                'category_code': faq_data.get('category_code', ''),
                'status': faq_data.get('status', 'resolved'),
                'priority': faq_data.get('priority', 'medium'),
                'question_title': faq_data['question_title'][:200],
                'updated_at': datetime.now().isoformat()
            }
            
            # ChromaDBで更新
            self.collection.upsert(
                ids=[f"faq_{faq_id}"],
                embeddings=[embedding],
                documents=[text_for_embedding],
                metadatas=[metadata]
            )
            
            logger.info(f"Successfully updated FAQ {faq_id} in index")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update FAQ in index: {str(e)}")
            return False
    
    def delete_faq_from_index(self, faq_id: str) -> bool:
        """特定のFAQをインデックスから削除"""
        try:
            if not self.collection:
                logger.error("QA vector collection not initialized")
                return False
            
            self.collection.delete(ids=[f"faq_{faq_id}"])
            logger.info(f"Successfully deleted FAQ {faq_id} from index")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete FAQ from index: {str(e)}")
            return False
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """コレクションの統計情報を取得"""
        try:
            if not self.collection:
                logger.error("QA vector collection not initialized")
                return {}
            
            count = self.collection.count()
            
            # カテゴリ別の統計を取得（サンプリング）
            sample_results = self.collection.get(limit=100)
            category_counts = {}
            
            if sample_results and 'metadatas' in sample_results:
                for metadata in sample_results['metadatas']:
                    if metadata and 'category_name' in metadata:
                        category = metadata['category_name']
                        category_counts[category] = category_counts.get(category, 0) + 1
            
            return {
                'total_faqs': count,
                'collection_name': self.collection.name,
                'collection_metadata': self.collection.metadata,
                'category_distribution': category_counts,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get collection stats: {str(e)}")
            return {}
    
    def rebuild_index(self) -> bool:
        """インデックスを完全に再構築"""
        try:
            if not self.collection:
                logger.error("QA vector collection not initialized")
                return False
            
            logger.info("Starting index rebuild...")
            
            # 既存のデータをクリア
            self.collection.delete(where={})
            
            # FAQデータを再取得してインデックス化
            return self.index_faq_data()
            
        except Exception as e:
            logger.error(f"Failed to rebuild index: {str(e)}")
            return False