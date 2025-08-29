"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Message } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { WelcomeMessage } from "./WelcomeMessage";
import { ChatInput } from "./ChatInput";

interface ChatContainerProps {
  initialMessages?: Message[];
  useDatabase?: boolean;
  useWebSearch?: boolean;
  threadId?: string;
  onThreadIdChange?: (threadId: string) => void;
}

interface ChatSource {
  filename: string;
  chunk_index: number;
  total_chunks: number;
  similarity: number;
  reranking_score: number;
  excerpt: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  initialMessages = [],
  useDatabase = true,
  useWebSearch = false,
  threadId,
  onThreadIdChange
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(threadId || null);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update conversation ID when thread changes
  useEffect(() => {
    if (threadId !== conversationId) {
      setConversationId(threadId || null);
      setMessages([]);
      loadThreadMessages(threadId);
    }
  }, [threadId]);

  const loadThreadMessages = async (threadId?: string) => {
    if (!threadId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/aichat/threads/${threadId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Check if we have full message data with metadata
        if (data.messages && data.messages.length > 0) {
          const loadedMessages: Message[] = [];
          
          data.messages.forEach((msg: any, index: number) => {
            const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit"
            }) : '';
            
            if (msg.role === 'human') {
              loadedMessages.push({
                id: `loaded-${index}`,
                type: 'user',
                content: msg.content,
                timestamp: timestamp,
              });
            } else if (msg.role === 'ai') {
              // Build message with metadata if available
              const aiMessage: Message = {
                id: `loaded-${index}`,
                type: 'assistant',
                content: msg.content,
                timestamp: timestamp,
              };
              
              // Add sources and metadata if available
              if (msg.metadata) {
                const meta = msg.metadata;
                
                // Convert sources to documents format
                if (meta.sources && meta.sources.length > 0) {
                  aiMessage.documents = meta.search_type === 'web'
                    ? meta.sources.map((source: any, idx: number) => ({
                        id: String(idx + 1),
                        title: source.title || 'Web Result',
                        type: 'web',
                        updatedAt: source.url || '',
                      }))
                    : meta.sources.map((source: any, idx: number) => ({
                        id: String(idx + 1),
                        title: source.filename,
                        type: source.filename?.endsWith('.pdf') ? 'pdf' : 'md',
                        updatedAt: `チャンク ${source.chunk_index + 1}/${source.total_chunks}`,
                      }));
                }
                
                // Add metadata
                if (meta.search_results !== undefined || meta.used_reranking !== undefined) {
                  aiMessage.metadata = {
                    relatedDocsCount: meta.search_results || 0,
                    confidence: meta.sources?.length > 0 
                      ? Math.round(meta.sources.reduce((acc: number, s: any) => acc + (s.similarity || 0.8), 0) / meta.sources.length * 100)
                      : 0,
                    usedReranking: meta.used_reranking
                  };
                }
              }
              
              loadedMessages.push(aiMessage);
            }
          });
          
          setMessages(loadedMessages);
        } else if (data.context) {
          // Fallback to context parsing for older threads
          const contextLines = data.context.split('\n\n');
          const loadedMessages: Message[] = [];
          
          contextLines.forEach((line: string, index: number) => {
            if (line.startsWith('人間:')) {
              loadedMessages.push({
                id: `loaded-${index}`,
                type: 'user',
                content: line.replace('人間: ', ''),
                timestamp: '',
              });
            } else if (line.startsWith('アシスタント:')) {
              loadedMessages.push({
                id: `loaded-${index}`,
                type: 'assistant',
                content: line.replace('アシスタント: ', ''),
                timestamp: '',
              });
            }
          });
          
          setMessages(loadedMessages);
        }
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content,
      timestamp: new Date().toLocaleTimeString("ja-JP", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Call the RAG chat API
      const response = await fetch('http://localhost:8000/api/aichat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversation_id: conversationId,
          use_reranking: true,
          n_results: 10,
          use_database: useDatabase,
          use_web_search: useWebSearch
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Chat API request failed');
      }

      const data = await response.json();
      
      // Update conversation ID if new
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
        if (onThreadIdChange) {
          onThreadIdChange(data.conversation_id);
        }
      }

      // Format sources as documents for the message based on search type
      const documents = data.search_type === 'web' 
        ? data.sources?.map((source: any, index: number) => ({
            id: String(index + 1),
            title: source.title || 'Web Result',
            type: 'web',
            updatedAt: source.url || '',
          })) || []
        : data.sources?.map((source: ChatSource, index: number) => ({
            id: String(index + 1),
            title: source.filename,
            type: source.filename.endsWith('.pdf') ? 'pdf' : 'md',
            updatedAt: `チャンク ${source.chunk_index + 1}/${source.total_chunks}`,
          })) || [];

      // Calculate average confidence from similarity scores (only for database search)
      const avgConfidence = data.search_type === 'web'
        ? 90 // Web search confidence placeholder
        : data.sources?.length > 0 
          ? Math.round(data.sources.reduce((acc: number, s: ChatSource) => acc + s.similarity, 0) / data.sources.length * 100)
          : 0;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.response,
        timestamp: new Date().toLocaleTimeString("ja-JP", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        documents: documents,
        metadata: {
          relatedDocsCount: data.search_results || 0,
          confidence: avgConfidence,
          processingTime: data.processing_time,
          usedReranking: data.used_reranking
        },
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Check if the error was due to abort
      if (error.name === 'AbortError') {
        const abortMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: "生成が停止されました。",
          timestamp: new Date().toLocaleTimeString("ja-JP", { 
            hour: "2-digit", 
            minute: "2-digit" 
          }),
          metadata: {
            isError: true
          }
        };
        setMessages((prev) => [...prev, abortMessage]);
      } else {
        setError('メッセージの送信に失敗しました。もう一度お試しください。');
        
        // Add error message
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: "申し訳ございません。エラーが発生しました。もう一度お試しください。",
          timestamp: new Date().toLocaleTimeString("ja-JP", { 
            hour: "2-digit", 
            minute: "2-digit" 
          }),
          metadata: {
            isError: true
          }
        };
        
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsTyping(false);
      setAbortController(null);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: any) => {
    handleSendMessage(action.label + "を検索");
  };

  const handleClearConversation = async () => {
    setMessages([]);
    if (conversationId) {
      // Clear thread on server
      try {
        await fetch(`http://localhost:8000/api/aichat/threads/${conversationId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to delete thread:', error);
      }
    }
    setConversationId(null);
    if (onThreadIdChange) {
      onThreadIdChange('');
    }
    setError(null);
  };

  return (
    <main className="flex-1 flex flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Clear conversation button */}
          {messages.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleClearConversation}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                会話をクリア
              </button>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          {messages.length === 0 ? (
            <WelcomeMessage onQuickAction={handleQuickAction} />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput 
        onSendMessage={handleSendMessage} 
        onStopGeneration={handleStopGeneration}
        isLoading={isTyping} 
      />
    </main>
  );
};