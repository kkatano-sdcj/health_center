import { useEffect, useRef, useState, useCallback } from 'react';

interface ProgressData {
  type: 'progress' | 'batch_progress' | 'completion';
  conversion_id?: string;
  batch_id?: string;
  progress?: number;
  status?: 'processing' | 'completed' | 'error' | 'cancelled';
  current_step?: string;
  file_name?: string;
  files?: Record<string, unknown>;
  success?: boolean;
  error_message?: string;
  processing_time?: number;
  markdown_content?: string;
  output_file?: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  progressData: Record<string, ProgressData>;
  connect: () => void;
  disconnect: () => void;
  clearProgress: (id: string) => void;
}

const getWebSocketUrl = () => {
  // Use absolute URL for WebSocket (can't use relative URLs with WebSocket)
  if (typeof window === 'undefined') {
    return 'ws://localhost:8000/ws';
  }
  const host = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${host}:8000/ws`;
};

export const useWebSocket = (url?: string): UseWebSocketReturn => {
  const wsUrl = url || getWebSocketUrl();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [progressData, setProgressData] = useState<Record<string, ProgressData>>({});

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      console.log('Attempting to connect to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully to:', wsUrl);
        setIsConnected(true);
        
        // Clear any existing ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Send ping to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          } else {
            clearInterval(pingIntervalRef.current!);
            pingIntervalRef.current = null;
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          // Handle pong response
          if (event.data === 'pong') {
            return;
          }
          
          const data: ProgressData = JSON.parse(event.data);
          console.log('🔄 WebSocket message received:', data);
          console.log('Message type:', data.type);
          console.log('Conversion ID:', data.conversion_id);
          console.log('Progress:', data.progress);
          console.log('Status:', data.status);
          
          if (data.type === 'progress' && data.conversion_id) {
            console.log('📊 Updating progress data for conversion:', data.conversion_id);
            setProgressData(prev => {
              // Don't clear other conversions when progress is 0, just add/update
              console.log('📈 Updating conversion progress');
              const updated = {
                ...prev,
                [data.conversion_id!]: data
              };
              console.log('Updated progress data:', updated);
              return updated;
            });
          } else if (data.type === 'batch_progress' && data.batch_id) {
            setProgressData(prev => ({
              ...prev,
              [data.batch_id!]: data
            }));
          } else if (data.type === 'completion' && data.conversion_id) {
            console.log('Processing completion event:', data);
            setProgressData(prev => {
              const updatedData = {
                ...prev,
                [data.conversion_id!]: {
                  ...prev[data.conversion_id!],
                  ...data,
                  progress: 100,
                  status: data.success ? 'completed' as const : 'error' as const
                }
              };
              console.log('Updated progress data:', updatedData);
              return updatedData;
            });
            
            // Auto-clear completed progress after 10 seconds (increased from 5)
            setTimeout(() => {
              console.log('Auto-clearing progress for conversion:', data.conversion_id);
              setProgressData(prev => {
                const newData = { ...prev };
                delete newData[data.conversion_id!];
                return newData;
              });
            }, 10000);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket readyState:', ws.readyState);
        console.error('WebSocket URL:', ws.url);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setIsConnected(false);
        wsRef.current = null;
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt to reconnect after 3 seconds
        if (!event.wasClean) {
          console.log('Attempting to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting WebSocket...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const clearProgress = useCallback((id: string) => {
    setProgressData(prev => {
      const newData = { ...prev };
      delete newData[id];
      return newData;
    });
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    progressData,
    connect,
    disconnect,
    clearProgress
  };
};