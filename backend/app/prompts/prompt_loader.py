"""
Prompt Template Loader
Loads and manages prompt templates for the RAG system
"""
import os
import logging
from typing import Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class PromptLoader:
    """Loads and caches prompt templates from files"""
    
    def __init__(self, prompts_dir: Optional[str] = None):
        """
        Initialize the prompt loader
        
        Args:
            prompts_dir: Directory containing prompt templates
        """
        if prompts_dir is None:
            # Default to app/prompts directory
            self.prompts_dir = Path(__file__).parent
        else:
            self.prompts_dir = Path(prompts_dir)
        
        self._cache: Dict[str, str] = {}
        self._load_prompts()
    
    def _load_prompts(self):
        """Load all prompt templates into cache"""
        prompt_files = {
            'system': 'system_prompt.txt',
            'user': 'user_prompt_template.txt'
        }
        
        for key, filename in prompt_files.items():
            filepath = self.prompts_dir / filename
            if filepath.exists():
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        self._cache[key] = f.read().strip()
                    logger.info(f"Loaded prompt template: {filename}")
                except Exception as e:
                    logger.error(f"Error loading prompt template {filename}: {e}")
                    # Set default prompts as fallback
                    self._set_default_prompts(key)
            else:
                logger.warning(f"Prompt template not found: {filename}")
                self._set_default_prompts(key)
    
    def _set_default_prompts(self, key: str):
        """Set default prompts if files are not found"""
        defaults = {
            'system': """あなたは医療文書に関する質問に答える専門アシスタントです。Health Center Document Management Systemのデータベースに基づいて回答します。

重要なルール:
- 提供されたコンテキストの情報のみを根拠として回答する
- 推測や憶測は絶対に行わない
- 不明な点は「文書に記載がありません」と明記する
- 医療的判断や診断は行わない
- 各要点の末尾に出典番号 [番号] を必ず付与する
- 日本語で回答する

回答形式:
- 簡潔で分かりやすい説明
- 重要なポイントを優先して記載
- 専門用語には適切な説明を併記
- 箇条書きを活用して読みやすくする""",
            'user': """以下のコンテキストに基づいて質問に答えてください。

## 質問
{query}

## コンテキスト（番号付き文書抜粋）
{context}

## 回答要件
- コンテキストの情報のみを使用
- 各要点に出典番号 [番号] を付与
- 不明な点は「文書に記載がありません」と明記
- 医療的判断は避け、文書の内容のみ提供

回答:"""
        }
        
        if key in defaults:
            self._cache[key] = defaults[key]
            logger.info(f"Using default prompt for: {key}")
    
    def get_system_prompt(self) -> str:
        """Get the system prompt"""
        return self._cache.get('system', '')
    
    def get_user_prompt_template(self) -> str:
        """Get the user prompt template"""
        return self._cache.get('user', '')
    
    def format_user_prompt(self, query: str, context: str) -> str:
        """
        Format the user prompt with query and context
        
        Args:
            query: User's question
            context: Retrieved document context
            
        Returns:
            Formatted prompt
        """
        template = self.get_user_prompt_template()
        return template.format(query=query, context=context)
    
    def reload_prompts(self):
        """Reload prompts from files (useful for hot-reloading)"""
        self._cache.clear()
        self._load_prompts()
        logger.info("Prompts reloaded")

# Singleton instance
_prompt_loader: Optional[PromptLoader] = None

def get_prompt_loader() -> PromptLoader:
    """Get or create the singleton prompt loader"""
    global _prompt_loader
    if _prompt_loader is None:
        _prompt_loader = PromptLoader()
    return _prompt_loader