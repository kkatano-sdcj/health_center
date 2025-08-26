"use client";

import React from "react";
import { Search, Settings, Bell, Home, MessageSquare, FileText, FolderOpen, Upload, Sparkles, Database } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface UnifiedHeaderProps {
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({ 
  user = { name: "山田 太郎", role: "管理者" } 
}) => {
  const pathname = usePathname();
  
  const navItems = [
    { href: "/aichat", label: "AI Chat", icon: MessageSquare },
    { href: "/convert", label: "Convert", icon: FileText },
    { href: "/storage", label: "Storage", icon: FolderOpen },
    { href: "/uploaded", label: "Uploaded", icon: Upload },
    { href: "/vectordb", label: "VectorDB", icon: Database },
    { href: "/rag", label: "RAG Query", icon: Sparkles },
  ];
  
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Health Center</h1>
                <p className="text-xs text-gray-500">Document Management System</p>
              </div>
            </Link>
            
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
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