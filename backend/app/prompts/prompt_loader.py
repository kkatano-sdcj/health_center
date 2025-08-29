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
            'user': 'user_prompt_template.txt',
            'web_user': 'web_user_prompt_template.txt'
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

回答:""",
            'web_user': """以下のWeb検索結果に基づいて質問に答えてください。

## 質問
{query}

## Web検索結果（番号付き）
{context}

## 回答要件
- Web検索結果の情報のみを使用
- 各要点に出典番号 [番号] を付与
- 不明な点は「検索結果に記載がありません」と明記
- 最新の情報に基づいて回答
- 読みやすく自然な文体、出力を心がける（文節毎に改行し1行空ける）
- テーブル形式で出力する場合は、Markdownテーブル形式を使用し、以下のフォーマットに従う：
  - ヘッダー行と区切り行を含める（| 列1 | 列2 | 列3 |）
  - 各セルは適切な幅で整列させる
  - 必要に応じて列を右寄せ、左寄せ、中央寄せに設定
  - 長い内容は適切に改行または省略


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
    
    def format_user_prompt(self, query: str, context: str, template_type: str = "default") -> str:
        """
        Format the user prompt with query and context
        
        Args:
            query: User's question
            context: Retrieved document context
            template_type: Type of template to use ("default" or "web")
            
        Returns:
            Formatted prompt
        """
        if template_type == "web":
            # First try to get from cache, then load directly
            template = self._cache.get('web_user')
            if not template:
                template = self.load_template("web_user_prompt_template.txt")
            if not template:
                # Fallback to default web template
                template = self._cache.get('web_user', self._cache.get('user', ''))
        else:
            # Use default database template
            template = self.get_user_prompt_template()
            if not template:
                # Fallback to default template
                template = self._cache.get('user', '')
                
        if not template:
            logger.error(f"No template found for type: {template_type}")
            return f"Query: {query}\nContext: {context}"
            
        return template.format(query=query, context=context)
    
    def load_template(self, filename: str) -> str:
        """
        Load a specific template file
        
        Args:
            filename: Name of the template file
            
        Returns:
            Template content as string
        """
        filepath = self.prompts_dir / filename
        if filepath.exists():
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    logger.info(f"Loaded template: {filename}")
                    return content
            except Exception as e:
                logger.error(f"Error loading template {filename}: {e}")
                return ""
        else:
            logger.warning(f"Template not found: {filename}")
            return ""
    
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