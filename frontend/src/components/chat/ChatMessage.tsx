"use client";

import React from "react";
import { FileText, File, ChevronRight } from "lucide-react";

export interface Document {
  id: string;
  title: string;
  type: "pdf" | "doc" | "txt";
  updatedAt: string;
}

export interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
  documents?: Document[];
  metadata?: {
    relatedDocsCount?: number;
    confidence?: number;
  };
}

interface ChatMessageProps {
  message: Message;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-5 h-5 text-blue-600" />;
    default:
      return <File className="w-5 h-5 text-gray-600" />;
  }
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.type === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} message-bubble`}>
      <div className={`max-w-md ${isUser ? "" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 smooth-shadow ${
            isUser
              ? "bg-gradient-to-br from-primary to-secondary text-white rounded-br-sm"
              : "bg-white rounded-bl-sm"
          }`}
        >
          <p className={`text-sm ${isUser ? "text-white" : "text-gray-800"}`}>
            {message.content}
          </p>

          {message.documents && message.documents.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.documents.map((doc) => (
                <a
                  key={doc.id}
                  href="#"
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getFileIcon(doc.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          更新: {doc.updatedAt}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          )}

          {message.metadata && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                関連ドキュメント: {message.metadata.relatedDocsCount}件 | 
                信頼度: {message.metadata.confidence}%
              </p>
            </div>
          )}
        </div>
        <p className={`text-xs text-gray-500 mt-1 ${isUser ? "text-right" : ""}`}>
          {message.timestamp}
        </p>
      </div>
    </div>
  );
};