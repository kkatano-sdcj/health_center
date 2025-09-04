"use client";

import React from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  MessageCircle,
  FileText, 
  FolderOpen, 
  Upload, 
  Sparkles, 
  BookOpen, 
  HelpCircle,
  ArrowRight,
  Shield,
  Zap,
  Database,
  Brain,
  ChevronRight,
  Search
} from "lucide-react";

const features = [
  {
    title: "AI Chat",
    description: "ベクトルデータベースやWeb検索を活用した高度なAI対話システム",
    icon: MessageSquare,
    href: "/aichat",
    color: "blue",
    badge: "人気",
  },
  {
    title: "QA Chat",
    description: "よくある質問に即座に回答する専門的なQ&Aチャットボット",
    icon: MessageCircle,
    href: "/qachat",
    color: "purple",
    badge: "NEW",
  },
  {
    title: "Document Converter",
    description: "様々なドキュメント形式をMarkdownに変換する強力なツール",
    icon: FileText,
    href: "/convert",
    color: "green",
  },
  {
    title: "Storage",
    description: "変換済みファイルの閲覧と管理を効率的に行える",
    icon: FolderOpen,
    href: "/storage",
    color: "yellow",
  },
  {
    title: "Uploaded Files",
    description: "アップロードされたオリジナルファイルの管理",
    icon: Upload,
    href: "/uploaded",
    color: "orange",
  },
  {
    title: "RAG Query",
    description: "ベクトル化されたドキュメントへのAI検索クエリ",
    icon: Sparkles,
    href: "/rag",
    color: "pink",
  },
  {
    title: "Note",
    description: "重要な情報やメモを整理して保存",
    icon: BookOpen,
    href: "/note",
    color: "indigo",
  },
  {
    title: "FAQ",
    description: "よくある質問とその回答を管理・検索",
    icon: HelpCircle,
    href: "/faq",
    color: "teal",
  },
];

const highlights = [
  {
    icon: Brain,
    title: "AI搭載",
    description: "最新のAI技術を活用した高度な文書処理"
  },
  {
    icon: Shield,
    title: "セキュア",
    description: "データの暗号化とアクセス制御で安全性を確保"
  },
  {
    icon: Zap,
    title: "高速処理",
    description: "効率的なアルゴリズムで迅速な応答を実現"
  },
  {
    icon: Database,
    title: "大容量対応",
    description: "大量のドキュメントも快適に管理可能"
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Health Center</h1>
                <p className="text-xs text-gray-500">Document Management System</p>
              </div>
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              ダッシュボードへ
            </Link>
          </div>
        </div>
      </nav>
      
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-5xl font-bold mb-6">
                Health Center
              </h1>
              <p className="text-2xl mb-4 text-blue-100">
                Document Management System
              </p>
              <p className="text-lg mb-8 text-blue-100 max-w-2xl mx-auto">
                AI技術を活用した次世代のドキュメント管理システム。
                文書の変換、検索、分析をワンストップで実現します。
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  今すぐ始める
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 bg-opacity-20 text-white rounded-lg font-medium hover:bg-opacity-30 transition-colors border border-white border-opacity-30"
                >
                  使い方を見る
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white py-8 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {highlights.map((highlight, index) => {
                const Icon = highlight.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-3">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{highlight.title}</h3>
                    <p className="text-sm text-gray-600">{highlight.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                すべての機能
              </h2>
              <p className="text-lg text-gray-600">
                業務効率化を実現する充実した機能群
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                const colorClasses = {
                  blue: "bg-blue-100 text-blue-600 hover:bg-blue-200",
                  purple: "bg-purple-100 text-purple-600 hover:bg-purple-200",
                  green: "bg-green-100 text-green-600 hover:bg-green-200",
                  yellow: "bg-yellow-100 text-yellow-600 hover:bg-yellow-200",
                  orange: "bg-orange-100 text-orange-600 hover:bg-orange-200",
                  pink: "bg-pink-100 text-pink-600 hover:bg-pink-200",
                  indigo: "bg-indigo-100 text-indigo-600 hover:bg-indigo-200",
                  teal: "bg-teal-100 text-teal-600 hover:bg-teal-200",
                };

                return (
                  <div key={feature.href} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 p-6 h-full border border-gray-100 hover:border-gray-200 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${colorClasses[feature.color as keyof typeof colorClasses]}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      {feature.badge && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          feature.badge === "NEW" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              今すぐ始めましょう
            </h2>
            <p className="text-lg text-blue-100 mb-8">
              AIの力で文書管理を次のレベルへ
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors shadow-lg"
            >
              <MessageSquare className="w-5 h-5" />
              ダッシュボードを開く
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-semibold text-gray-900">Health Center</h3>
                <p className="text-sm text-gray-600">© 2024 Document Management System</p>
              </div>
              <div className="flex gap-6">
                <Link href="/faq" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  FAQ
                </Link>
                <Link href="/note" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                  ノート
                </Link>
                <span className="text-sm text-gray-400">
                  Powered by AI
                </span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}