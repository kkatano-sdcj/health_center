"use client";

import React from "react";
import { FileText, File, ChevronRight, Globe } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    processingTime?: number;
    usedReranking?: boolean;
    isError?: boolean;
  };
}

interface ChatMessageProps {
  message: Message;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="w-5 h-5 text-blue-600" />;
    case "web":
      return <Globe className="w-5 h-5 text-green-600" />;
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
          {isUser ? (
            <p className="text-sm text-white">
              {message.content}
            </p>
          ) : (
            <div className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : ""}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-gray-300">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gray-50">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="bg-white divide-y divide-gray-200">
                      {children}
                    </tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-gray-50">
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                      {children}
                    </td>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 text-gray-800">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 mb-3">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 mb-3">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="mb-1">
                      {children}
                    </li>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

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
                      <div className={`w-10 h-10 ${doc.type === 'web' ? 'bg-green-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                        {getFileIcon(doc.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.type === 'web' ? 'URL: ' : '更新: '}{doc.updatedAt}
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