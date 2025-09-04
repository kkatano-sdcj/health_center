"use client";

import React, { useRef, useState, useEffect } from "react";
import { Search, Settings, Bell, Home, MessageSquare, FileText, FolderOpen, Upload, Sparkles, BookOpen, HelpCircle, MessageCircle, CheckSquare, Database, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  
  const navItems = [
    { href: "/aichat", label: "AI Chat", icon: MessageSquare },
    { href: "/qachat", label: "QA Chat", icon: MessageCircle },
    { href: "/convert", label: "Convert", icon: FileText },
    { href: "/storage", label: "Storage", icon: FolderOpen },
    { href: "/uploaded", label: "Uploaded", icon: Upload },
    { href: "/vectordb", label: "VectorDB", icon: Database },
    { href: "/rag", label: "RAG Query", icon: Sparkles },
    { href: "/note", label: "Note", icon: BookOpen },
    { href: "/faq", label: "FAQ", icon: HelpCircle },
    { href: "/faqcheck", label: "FAQ Check", icon: CheckSquare },
  ];

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scrollLeft = () => {
    if (scrollRef.current) {
      const itemWidth = scrollRef.current.firstElementChild?.clientWidth || 150;
      scrollRef.current.scrollBy({ left: -itemWidth, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      const itemWidth = scrollRef.current.firstElementChild?.clientWidth || 150;
      scrollRef.current.scrollBy({ left: itemWidth, behavior: 'smooth' });
    }
  };
  
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
            
            <div className="flex items-center relative" style={{ width: '600px' }}>
              {showLeftArrow && (
                <button
                  onClick={scrollLeft}
                  className="absolute left-0 z-10 bg-white pr-1 flex items-center h-full"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 hover:text-gray-900" />
                </button>
              )}
              
              <div 
                ref={scrollRef}
                className="flex items-center gap-1 overflow-x-auto scrollbar-hide mx-7"
                onScroll={checkScroll}
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none',
                  width: 'calc(100% - 56px)',
                  scrollBehavior: 'smooth'
                }}
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                      }`}
                      style={{ width: '112px' }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              
              {showRightArrow && (
                <button
                  onClick={scrollRight}
                  className="absolute right-0 z-10 bg-white pl-1 flex items-center h-full"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 hover:text-gray-900" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-blue-600 transition-colors" title="ダッシュボードに戻る">
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