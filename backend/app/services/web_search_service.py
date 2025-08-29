import os
import json
from typing import List, Dict, Any, Tuple
import logging
from datetime import datetime
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from app.prompts.prompt_loader import get_prompt_loader

logger = logging.getLogger(__name__)

class WebSearchService:
    def __init__(self):
        """
        DuckDuckGoSearchRunを使用したWeb検索サービスの初期化
        """
        # DuckDuckGoSearchAPIWrapperの設定
        self.search_wrapper = DuckDuckGoSearchAPIWrapper(
            region="jp-jp",  # 日本地域
            safesearch="moderate",  # セーフサーチレベル
            time="y",  # 時間範囲（y=過去1年）
            max_results=5  # 最大結果数
        )
        
        # DuckDuckGoSearchRunツールの初期化
        self.search_tool = DuckDuckGoSearchRun(api_wrapper=self.search_wrapper)
        self.prompt_loader = get_prompt_loader()
        
    def search_web(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        DuckDuckGoSearchRunを使用してWeb検索を実行
        
        Args:
            query: 検索クエリ
            max_results: 最大結果数
            
        Returns:
            検索結果のリスト
        """
        try:
            # 検索結果を取得（テキスト形式）
            search_results_text = self.search_tool.run(query)
            
            # 結果をパースして構造化
            results = self._parse_search_results(search_results_text, max_results)
            
            return results
        except Exception as e:
            logger.error(f"Web search error: {e}")
            return []
    
    def search_web_detailed(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        より詳細な検索結果を取得
        
        Args:
            query: 検索クエリ
            max_results: 最大結果数
            
        Returns:
            詳細な検索結果のリスト
        """
        try:
            # DuckDuckGoSearchAPIWrapperのresultsメソッドを使用して詳細結果を取得
            detailed_results = self.search_wrapper.results(query, max_results)
            
            results = []
            for idx, result in enumerate(detailed_results):
                results.append({
                    'title': result.get('title', 'No Title'),
                    'url': result.get('link', ''),
                    'snippet': result.get('snippet', ''),
                    'rank': idx + 1
                })
            
            return results
        except Exception as e:
            logger.error(f"Detailed web search error: {e}")
            return []
    
    def _parse_search_results(self, results_text: str, max_results: int) -> List[Dict[str, Any]]:
        """
        テキスト形式の検索結果をパースして構造化
        
        Args:
            results_text: 検索結果のテキスト
            max_results: 最大結果数
            
        Returns:
            構造化された検索結果
        """
        try:
            # 検索結果をパースする簡易的な実装
            # DuckDuckGoSearchRunは通常、改行区切りで結果を返す
            lines = results_text.strip().split('\n')
            
            results = []
            current_result = {}
            result_count = 0
            
            for line in lines:
                if result_count >= max_results:
                    break
                    
                line = line.strip()
                if not line:
                    if current_result:
                        results.append({
                            'title': current_result.get('title', 'No Title'),
                            'url': current_result.get('url', ''),
                            'snippet': current_result.get('snippet', line),
                            'rank': result_count + 1
                        })
                        current_result = {}
                        result_count += 1
                else:
                    # 簡単なパース（実際のフォーマットに応じて調整）
                    if not current_result.get('snippet'):
                        current_result['snippet'] = line
                    
            # 最後の結果を追加
            if current_result and result_count < max_results:
                results.append({
                    'title': current_result.get('title', 'No Title'),
                    'url': current_result.get('url', ''),
                    'snippet': current_result.get('snippet', ''),
                    'rank': result_count + 1
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error parsing search results: {e}")
            return []
    
    def build_web_context(self, search_results: List[Dict[str, Any]], max_sources: int = 3) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Web検索結果からコンテキストを構築
        
        Args:
            search_results: 検索結果のリスト
            max_sources: 使用する最大ソース数
            
        Returns:
            コンテキストとソースのタプル
        """
        context_parts = []
        sources = []
        
        for idx, result in enumerate(search_results[:max_sources]):
            title = result.get('title', 'No Title')
            url = result.get('url', '')
            snippet = result.get('snippet', '')
            
            # コンテキスト用のテキストを作成
            context_text = f"[{idx + 1}] {title}"
            if url:
                context_text += f"\nURL: {url}"
            if snippet:
                context_text += f"\n{snippet}"
            
            context_parts.append(context_text)
            
            # ソース情報を構築
            sources.append({
                'title': title,
                'url': url or 'N/A',
                'snippet': snippet[:200] if snippet else 'No content available',
                'source_index': idx + 1
            })
        
        context = "\n\n".join(context_parts)
        return context, sources
    
    def format_web_response(self, response: str, sources: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Web検索ベースのレスポンスをフォーマット
        
        Args:
            response: LLMのレスポンス
            sources: ソース情報のリスト
            
        Returns:
            フォーマットされたレスポンス
        """
        return {
            'response': response,
            'sources': sources,
            'search_type': 'web',
            'timestamp': datetime.now().isoformat()
        }
    
    def search_and_summarize(self, query: str, max_results: int = 5) -> str:
        """
        検索して結果をサマリーする（オプショナル機能）
        
        Args:
            query: 検索クエリ
            max_results: 最大結果数
            
        Returns:
            サマリーテキスト
        """
        try:
            # 詳細検索を実行
            results = self.search_web_detailed(query, max_results)
            
            if not results:
                return "検索結果が見つかりませんでした。"
            
            # 結果をサマリー形式でフォーマット
            summary_parts = [f"「{query}」の検索結果:"]
            
            for result in results:
                summary_parts.append(
                    f"\n{result['rank']}. {result['title']}\n"
                    f"   {result['snippet'][:150]}..."
                )
            
            return "\n".join(summary_parts)
            
        except Exception as e:
            logger.error(f"Search and summarize error: {e}")
            return f"検索中にエラーが発生しました: {str(e)}"