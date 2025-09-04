"use client";

import React from "react";
import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
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
  Database,
  CheckSquare
} from "lucide-react";

const features = [
  {
    title: "AI Chat",
    description: "ベクトルデータベースやWeb検索を活用した高度なAI対話システム",
    icon: MessageSquare,
    href: "/aichat",
    color: "blue",
    badge: "人気",
    stats: "1.2K+ 利用/日"
  },
  {
    title: "QA Chat",
    description: "よくある質問に即座に回答する専門的なQ&Aチャットボット",
    icon: MessageCircle,
    href: "/qachat",
    color: "purple",
    badge: "NEW",
    stats: "500+ 回答/日"
  },
  {
    title: "Document Converter",
    description: "様々なドキュメント形式をMarkdownに変換",
    icon: FileText,
    href: "/convert",
    color: "green",
    stats: "10K+ 変換済み"
  },
  {
    title: "Storage",
    description: "変換済みファイルの閲覧と管理",
    icon: FolderOpen,
    href: "/storage",
    color: "yellow",
    stats: "5GB+ 保存"
  },
  {
    title: "Uploaded Files",
    description: "アップロードされたファイルの管理",
    icon: Upload,
    href: "/uploaded",
    color: "orange",
    stats: "3K+ ファイル"
  },
  {
    title: "Vector DB",
    description: "ベクトルデータベースの管理と検索",
    icon: Database,
    href: "/vectordb",
    color: "red",
    stats: "50K+ ベクトル"
  },
  {
    title: "RAG Query",
    description: "AI検索クエリの実行",
    icon: Sparkles,
    href: "/rag",
    color: "pink",
    stats: "高精度検索"
  },
  {
    title: "Note",
    description: "重要な情報やメモを整理",
    icon: BookOpen,
    href: "/note",
    color: "indigo",
    stats: "200+ ノート"
  },
  {
    title: "FAQ",
    description: "よくある質問の管理",
    icon: HelpCircle,
    href: "/faq",
    color: "teal",
    stats: "100+ 質問"
  },
  {
    title: "FAQ Check",
    description: "FAQの内容を検証",
    icon: CheckSquare,
    href: "/faqcheck",
    color: "cyan",
    badge: "NEW",
    stats: "自動検証"
  },
];

const recentActivity = [
  { icon: FileText, text: "新しいドキュメントを変換しました", time: "2分前", type: "convert" },
  { icon: MessageSquare, text: "AI Chatで5件の質問に回答", time: "15分前", type: "chat" },
  { icon: Upload, text: "3つのファイルをアップロード", time: "1時間前", type: "upload" },
  { icon: Database, text: "ベクトルDBを更新しました", time: "3時間前", type: "vector" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                おかえりなさい、山田様
              </h1>
              <p className="text-blue-100 mb-4">
                今日も効率的なドキュメント管理を始めましょう
              </p>
              <div className="flex gap-4">
                <Link
                  href="/aichat"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  AI Chatを開く
                </Link>
                <Link
                  href="/convert"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 bg-opacity-20 text-white rounded-lg font-medium hover:bg-opacity-30 transition-colors border border-white border-opacity-30"
                >
                  <FileText className="w-4 h-4" />
                  ドキュメント変換
                </Link>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm mb-1">現在の時刻</p>
              <p className="text-2xl font-bold">{new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-blue-100 text-sm mt-1">{new Date().toLocaleDateString('ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Features Grid - 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">すべての機能</h2>
              <Link href="/" className="text-sm text-blue-600 hover:underline">
                詳細を見る →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  cyan: "bg-cyan-100 text-cyan-600 hover:bg-cyan-200",
                  red: "bg-red-100 text-red-600 hover:bg-red-200",
                };

                return (
                  <Link key={feature.href} href={feature.href}>
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 h-full border border-gray-100 hover:border-gray-200 group cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2.5 rounded-lg ${colorClasses[feature.color as keyof typeof colorClasses]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {feature.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            feature.badge === "NEW" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {feature.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{feature.stats}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity - 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">最近のアクティビティ</h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  const typeColors = {
                    convert: "bg-green-100 text-green-600",
                    chat: "bg-blue-100 text-blue-600",
                    upload: "bg-orange-100 text-orange-600",
                    vector: "bg-purple-100 text-purple-600",
                  };
                  
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${typeColors[activity.type as keyof typeof typeColors]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.text}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Link
                  href="/note"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  すべてのアクティビティ
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
              <div className="space-y-2">
                <Link href="/convert" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">新規ドキュメント変換</span>
                </Link>
                <Link href="/aichat" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">AI Chatを開始</span>
                </Link>
                <Link href="/faq" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">FAQを確認</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}