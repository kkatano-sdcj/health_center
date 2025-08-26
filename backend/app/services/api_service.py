"""
OpenAI API統合サービス
Markdown変換結果の強化処理を実行
"""
import os
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)
load_dotenv()

class APIService:
    """OpenAI APIを使用したMarkdown強化サービス"""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """APIクライアントの初期化"""
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                self.client = OpenAI(api_key=api_key)
            except Exception as e:
                logger.error(f"OpenAI APIクライアント初期化エラー: {e}")
                self.client = None
    
    async def enhance_markdown(self, content: str) -> str:
        """
        Markdownコンテンツを強化
        
        Args:
            content: 元のMarkdownコンテンツ
            
        Returns:
            強化されたMarkdownコンテンツ
        """
        if not self.client:
            logger.warning("APIクライアントが初期化されていません")
            return content
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "あなたはMarkdownドキュメントを改善する専門家です。"
                                   "与えられたMarkdownを、より読みやすく、構造化された形式に改善してください。"
                                   "フォーマットを整え、見出しを適切に配置し、リストや表を最適化してください。"
                    },
                    {
                        "role": "user",
                        "content": f"以下のMarkdownを改善してください:\n\n{content}"
                    }
                ],
                max_tokens=4000,
                temperature=0.3
            )
            
            enhanced_content = response.choices[0].message.content
            return enhanced_content if enhanced_content else content
            
        except Exception as e:
            logger.error(f"Markdown強化エラー: {e}")
            return content
    
    async def validate_api_key(self, api_key: str) -> tuple[bool, Optional[str]]:
        """
        APIキーの有効性を確認
        
        Args:
            api_key: 検証するAPIキー
            
        Returns:
            (有効性, エラーメッセージ)
        """
        try:
            test_client = OpenAI(api_key=api_key)
            # 簡単なAPIコールでキーの有効性を確認
            test_client.models.list()
            return True, None
        except Exception as e:
            error_message = str(e)
            if "authentication" in error_message.lower():
                return False, "無効なAPIキーです"
            elif "rate limit" in error_message.lower():
                return False, "APIレート制限に達しました"
            else:
                return False, f"API接続エラー: {error_message}"
    
    def update_api_key(self, api_key: str):
        """APIキーを更新"""
        os.environ["OPENAI_API_KEY"] = api_key
        self._initialize_client()
    
    def get_api_status(self) -> dict:
        """API接続状態を取得"""
        return {
            "is_configured": self.client is not None,
            "has_api_key": bool(os.getenv("OPENAI_API_KEY"))
        }