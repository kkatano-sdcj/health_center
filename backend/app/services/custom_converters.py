"""
カスタムコンバーター登録
MarkItDownに追加のコンバーターを登録するためのレジストリ
"""
import logging

logger = logging.getLogger(__name__)

class CustomConverterRegistry:
    """カスタムコンバーターを管理するレジストリ"""
    
    def __init__(self):
        """初期化"""
        self.converters = []
        self._register_converters()
    
    def _register_converters(self):
        """カスタムコンバーターを登録"""
        # 現在は追加のカスタムコンバーターなし
        # 将来的に独自フォーマットのコンバーターを追加可能
        pass
    
    def apply_to_markitdown(self, markitdown_instance):
        """
        MarkItDownインスタンスにカスタムコンバーターを適用
        
        Args:
            markitdown_instance: MarkItDownインスタンス
        """
        # 現在は追加処理なし
        # 将来的にカスタムコンバーターを登録する際に使用
        pass
    
    def get_supported_formats(self):
        """
        カスタムコンバーターがサポートする形式を取得
        
        Returns:
            list: サポートする拡張子のリスト
        """
        # 現在は追加フォーマットなし
        return []