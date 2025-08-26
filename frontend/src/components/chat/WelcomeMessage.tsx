"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
}

interface WelcomeMessageProps {
  onQuickAction?: (action: QuickAction) => void;
}

const quickActions: QuickAction[] = [
  { id: "spec", label: "最新の仕様書", icon: "📋" },
  { id: "api", label: "API リファレンス", icon: "🔧" },
  { id: "guide", label: "ユーザーガイド", icon: "📚" },
  { id: "security", label: "セキュリティ情報", icon: "🔒" },
];

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ onQuickAction }) => {
  return (
    <div className="text-center py-12 animate-fade-in">
      <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
        <MessageCircle className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        こんにちは！何をお探しですか？
      </h2>
      <p className="text-gray-600 mb-8">
        社内のあらゆる情報を瞬時に検索できます
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onQuickAction?.(action)}
            className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors smooth-shadow"
          >
            {action.icon} {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};