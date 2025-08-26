"use client";

import React from "react";
import { FileText, Code, Book, Clock, Save, HelpCircle } from "lucide-react";

interface SearchHistoryItem {
  id: string;
  title: string;
  timestamp: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

const searchHistory: SearchHistoryItem[] = [
  { id: "1", title: "製品仕様書について", timestamp: "2分前" },
  { id: "2", title: "API ドキュメント v2.0", timestamp: "1時間前" },
  { id: "3", title: "セキュリティガイドライン", timestamp: "昨日" },
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

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-80 bg-white border-r border-gray-100 overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            検索履歴
          </h2>
          <div className="space-y-2">
            {searchHistory.map((item) => (
              <button
                key={item.id}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{item.timestamp}</p>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
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