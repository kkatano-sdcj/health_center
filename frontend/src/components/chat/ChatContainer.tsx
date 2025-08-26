"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, Message } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { WelcomeMessage } from "./WelcomeMessage";
import { ChatInput } from "./ChatInput";

interface ChatContainerProps {
  initialMessages?: Message[];
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  initialMessages = [] 
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
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

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `「${content}」について検索しています...`,
        timestamp: new Date().toLocaleTimeString("ja-JP", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        documents: [
          {
            id: "1",
            title: "関連ドキュメント_v2.3.pdf",
            type: "pdf",
            updatedAt: "2024/01/15",
          },
        ],
        metadata: {
          relatedDocsCount: 3,
          confidence: 98,
        },
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 2000);
  };

  const handleQuickAction = (action: any) => {
    handleSendMessage(action.label + "を検索");
  };

  return (
    <main className="flex-1 flex flex-col bg-gray-50">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
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