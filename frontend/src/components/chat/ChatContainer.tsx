"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Message } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { WelcomeMessage } from "./WelcomeMessage";
import { ChatInput } from "./ChatInput";

interface ChatContainerProps {
  initialMessages?: Message[];
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
  initialMessages = [] 
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    try {
      // Call the RAG chat API
      const response = await fetch('http://localhost:8000/api/v1/aichat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversation_id: conversationId,
          use_reranking: true,
          n_results: 10
        }),
      });

      if (!response.ok) {
        throw new Error('Chat API request failed');
      }

      const data = await response.json();
      
      // Update conversation ID if new
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      // Format sources as documents for the message
      const documents = data.sources?.map((source: ChatSource, index: number) => ({
        id: String(index + 1),
        title: source.filename,
        type: source.filename.endsWith('.pdf') ? 'pdf' : 'md',
        updatedAt: `チャンク ${source.chunk_index + 1}/${source.total_chunks}`,
      })) || [];

      // Calculate average confidence from similarity scores
      const avgConfidence = data.sources?.length > 0 
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
    } catch (error) {
      console.error('Chat error:', error);
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
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action: any) => {
    handleSendMessage(action.label + "を検索");
  };

  const handleClearConversation = async () => {
    setMessages([]);
    setConversationId(null);
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
      <ChatInput onSendMessage={handleSendMessage} isLoading={isTyping} />
    </main>
  );
};