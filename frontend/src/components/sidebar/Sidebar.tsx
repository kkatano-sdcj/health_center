"use client";

import React, { useState, useEffect } from "react";
import { FileText, Code, Book, Clock, Save, HelpCircle, Database, Globe, MessageSquare, Plus, Trash2 } from "lucide-react";

interface ThreadItem {
  id: string;
  title: string;
  timestamp: string;
  messageCount: number;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

// スレッドのサンプルデータ（実際にはAPIから取得）
const sampleThreads: ThreadItem[] = [
  { id: "1", title: "製品仕様書について", timestamp: "2分前", messageCount: 5 },
  { id: "2", title: "API ドキュメント v2.0", timestamp: "1時間前", messageCount: 3 },
  { id: "3", title: "セキュリティガイドライン", timestamp: "昨日", messageCount: 8 },
];

const categories: Category[] = [
  { 
    id: "docs", 
    name: "ドキュメント", 
    icon: <FileText className="w-4 h-4" />, 
    count: 1234,
    color: "blue"
  },
  { 
    id: "api", 
    name: "API", 
    icon: <Code className="w-4 h-4" />, 
    count: 456,
    color: "green"
  },
  { 
    id: "guides", 
    name: "ガイド", 
    icon: <Book className="w-4 h-4" />, 
    count: 89,
    color: "purple"
  },
];

interface SidebarProps {
  useDatabase: boolean;
  useWebSearch: boolean;
  onUseDatabaseChange: (value: boolean) => void;
  onUseWebSearchChange: (value: boolean) => void;
  currentThreadId?: string;
  onThreadSelect?: (threadId: string) => void;
  onNewThread?: () => void;
  onDeleteThread?: (threadId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  useDatabase, 
  useWebSearch, 
  onUseDatabaseChange, 
  onUseWebSearchChange,
  currentThreadId,
  onThreadSelect,
  onNewThread,
  onDeleteThread
}) => {
  const [threads, setThreads] = useState<ThreadItem[]>(sampleThreads);
  
  // APIからスレッド一覧を取得
  useEffect(() => {
    fetchThreads();
  }, []);
  
  const fetchThreads = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/aichat/threads');
      if (response.ok) {
        const data = await response.json();
        if (data.threads && data.threads.length > 0) {
          setThreads(data.threads);
        }
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    }
  };
  
  const handleDeleteThread = async (threadId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/aichat/threads/${threadId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setThreads(prev => prev.filter(t => t.id !== threadId));
        if (onDeleteThread) onDeleteThread(threadId);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  return (
    <aside className="w-80 bg-white border-r border-gray-100 overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              スレッド
            </h2>
            <button
              onClick={onNewThread}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="新しいスレッド"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="space-y-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer ${
                  currentThreadId === thread.id ? 'bg-blue-50 hover:bg-blue-100' : ''
                }`}
                onClick={() => onThreadSelect && onThreadSelect(thread.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {thread.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-500">{thread.timestamp}</p>
                      <span className="text-xs text-gray-400">{thread.messageCount} メッセージ</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(thread.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            カテゴリ
          </h2>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.id}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 bg-${category.color}-100 rounded-lg flex items-center justify-center`}>
                    <div className={`text-${category.color}-600`}>
                      {category.icon}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {category.name}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{category.count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* データソース設定 */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            データソース設定
          </h2>
          <div className="space-y-3">
            {/* データベースから回答する */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">データベースから回答する</p>
                  <p className="text-xs text-gray-500">ベクトルDBの情報を使用</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={useDatabase}
                  onChange={(e) => onUseDatabaseChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Webから情報収集する */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Webから情報収集する</p>
                  <p className="text-xs text-gray-500">最新の情報を検索</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={useWebSearch}
                  onChange={(e) => onUseWebSearchChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">💡 ヒント</h3>
          <p className="text-xs text-gray-600 mb-3">
            より具体的な質問をすると、より正確な回答が得られます。
          </p>
          <button className="text-xs font-medium text-primary hover:text-secondary transition-colors">
            使い方を見る →
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <button 
            onClick={() => console.log('Save to note')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">ここまでの会話をノートに保存</span>
          </button>
          
          <button 
            onClick={() => console.log('Save to FAQ')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">会話をFAQに保存</span>
          </button>
        </div>
      </div>
    </aside>
  );
};