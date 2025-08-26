"""
WebSocket endpoint for real-time progress updates
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.progress_data: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket):
        """Accept and store a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_progress(self, conversion_id: str, progress: int, status: str = "processing", 
                           current_step: str = "", file_name: str = ""):
        """Send progress update to all connected clients"""
        message = {
            "type": "progress",
            "conversion_id": conversion_id,
            "progress": progress,
            "status": status,
            "current_step": current_step,
            "file_name": file_name
        }
        
        logger.info(f"Sending progress: conversion_id={conversion_id}, progress={progress}, status={status}, step={current_step}")
        logger.info(f"Active connections: {len(self.active_connections)}")
        
        # Store progress data
        self.progress_data[conversion_id] = message
        
        # Send to all connected clients
        disconnected = set()
        sent_count = 0
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
                sent_count += 1
                logger.debug(f"✅ Progress sent to WebSocket client #{sent_count}")
            except Exception as e:
                logger.error(f"Error sending progress update: {e}")
                disconnected.add(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
        
        logger.info(f"Progress sent to {sent_count} clients")
    
    async def send_batch_progress(self, batch_id: str, file_progress: Dict[str, Dict]):
        """Send batch conversion progress update"""
        message = {
            "type": "batch_progress",
            "batch_id": batch_id,
            "files": file_progress
        }
        
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending batch progress: {e}")
                disconnected.add(connection)
        
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_completion(self, conversion_id: str, success: bool = True, 
                            error_message: str = None, markdown_content: str = None,
                            processing_time: float = None, output_file: str = None):
        """Send completion notification"""
        message = {
            "type": "completion",
            "conversion_id": conversion_id,
            "success": success,
            "error_message": error_message,
            "markdown_content": markdown_content,
            "processing_time": processing_time,
            "output_file": output_file
        }
        
        logger.info(f"Sending completion: conversion_id={conversion_id}, success={success}, content_length={len(markdown_content) if markdown_content else 0}")
        logger.info(f"Message details: {message}")
        
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending completion: {e}")
                disconnected.add(connection)
        
        for conn in disconnected:
            self.disconnect(conn)
        
        # Clear progress data for completed conversion
        self.progress_data.pop(conversion_id, None)

# Global connection manager instance
manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for progress updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            
            # Handle ping/pong for connection keep-alive
            if data == "ping":
                await websocket.send_text("pong")
            else:
                # Handle other message types if needed
                try:
                    message = json.loads(data)
                    logger.info(f"Received WebSocket message: {message}")
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received: {data}")
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)