"use client";

import React from "react";
import { Search, Settings, Bell, Home } from "lucide-react";
import Link from "next/link";

interface NavigationProps {
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
}

export const Navigation: React.FC<NavigationProps> = ({ 
  user = { name: "山田 太郎", role: "管理者" } 
}) => {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Knowledge Search</h1>
                <p className="text-xs text-gray-500">Smart Data Assistant</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors" title="ホームに戻る">
              <Home className="w-5 h-5" />
            </Link>
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <div 
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold"
              >
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};