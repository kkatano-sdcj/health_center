"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import { Paperclip, Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onAttachFile?: () => void;
  placeholder?: string;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onAttachFile,
  placeholder = "質問を入力してください...",
  isLoading = false,
}) => {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div className="search-focus gradient-border rounded-2xl bg-white transition-all">
            <div className="flex items-end p-2">
              <button
                onClick={onAttachFile}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                disabled={isLoading}
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                className="p-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:opacity-90 transition-opacity hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 px-2">
            <p className="text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> で送信
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>AI準備完了</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};