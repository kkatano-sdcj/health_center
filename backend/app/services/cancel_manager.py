"""
変換キャンセル管理サービス
"""
import asyncio
from typing import Set, Dict
import logging

logger = logging.getLogger(__name__)

class CancelManager:
    """変換プロセスのキャンセルを管理"""
    
    def __init__(self):
        self.cancelled_conversions: Set[str] = set()
        self.active_conversions: Dict[str, asyncio.Task] = {}
        
    def cancel_conversion(self, conversion_id: str) -> bool:
        """
        変換をキャンセル
        
        Args:
            conversion_id: キャンセルする変換ID
            
        Returns:
            bool: キャンセル成功の可否
        """
        if conversion_id in self.active_conversions:
            # アクティブな変換をキャンセル
            task = self.active_conversions.get(conversion_id)
            if task and not task.done():
                task.cancel()
                logger.info(f"Conversion {conversion_id} cancelled")
            
        # キャンセルフラグを設定
        self.cancelled_conversions.add(conversion_id)
        return True
    
    def is_cancelled(self, conversion_id: str) -> bool:
        """
        変換がキャンセルされたか確認
        
        Args:
            conversion_id: 確認する変換ID
            
        Returns:
            bool: キャンセルされたかどうか
        """
        return conversion_id in self.cancelled_conversions
    
    def register_conversion(self, conversion_id: str, task: asyncio.Task = None):
        """
        変換を登録
        
        Args:
            conversion_id: 変換ID
            task: 変換タスク（オプション）
        """
        if task:
            self.active_conversions[conversion_id] = task
    
    def unregister_conversion(self, conversion_id: str):
        """
        変換の登録を解除
        
        Args:
            conversion_id: 変換ID
        """
        self.active_conversions.pop(conversion_id, None)
        self.cancelled_conversions.discard(conversion_id)
    
    def clear_cancelled(self, conversion_id: str):
        """
        キャンセルフラグをクリア
        
        Args:
            conversion_id: 変換ID
        """
        self.cancelled_conversions.discard(conversion_id)

# グローバルインスタンス
cancel_manager = CancelManager()