"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X,
  Tag,
  Clock,
  Eye,
  ThumbsUp,
  Filter,
  BookOpen,
  HelpCircle
} from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  viewCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  isExpanded?: boolean;
}

const categories = [
  "全般",
  "技術的な質問",
  "使い方",
  "トラブルシューティング",
  "セキュリティ",
  "その他"
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [newFAQ, setNewFAQ] = useState<Partial<FAQ>>({
    question: "",
    answer: "",
    category: "全般",
    tags: []
  });

  // Load FAQs from localStorage on mount
  useEffect(() => {
    const savedFAQs = localStorage.getItem("faqs");
    if (savedFAQs) {
      setFaqs(JSON.parse(savedFAQs));
    } else {
      // Initialize with sample FAQs
      const sampleFAQs: FAQ[] = [
        {
          id: "1",
          question: "AIチャット機能の使い方を教えてください",
          answer: "AIチャット機能では、データベースまたはWeb検索を選択して質問できます。左側のメニューからデータソースを選択し、質問を入力してEnterキーを押すか送信ボタンをクリックしてください。",
          category: "使い方",
          tags: ["AIチャット", "基本機能"],
          viewCount: 245,
          helpfulCount: 89,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "2",
          question: "アップロードできるファイル形式は何ですか？",
          answer: "PDF、Word文書（.docx）、テキストファイル（.txt）、Markdown（.md）、Excel（.xlsx）など、多様なファイル形式に対応しています。画像ファイルからのテキスト抽出も可能です。",
          category: "技術的な質問",
          tags: ["ファイル", "アップロード"],
          viewCount: 189,
          helpfulCount: 67,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "3",
          question: "データのセキュリティはどのように保護されていますか？",
          answer: "すべてのデータは暗号化されて保存され、アクセス制御により権限のあるユーザーのみがアクセスできます。また、定期的なセキュリティ監査を実施しています。",
          category: "セキュリティ",
          tags: ["セキュリティ", "データ保護"],
          viewCount: 156,
          helpfulCount: 92,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setFaqs(sampleFAQs);
      localStorage.setItem("faqs", JSON.stringify(sampleFAQs));
    }
  }, []);

  // Save FAQs to localStorage whenever they change
  useEffect(() => {
    if (faqs.length > 0) {
      localStorage.setItem("faqs", JSON.stringify(faqs));
    }
  }, [faqs]);

  // Filter FAQs based on search and category
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      selectedCategory === "すべて" || faq.category === selectedCategory;
    const matchesTags = 
      selectedTags.length === 0 || 
      selectedTags.some(tag => faq.tags.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(faqs.flatMap(faq => faq.tags)));

  const toggleFAQ = (id: string) => {
    setFaqs(faqs.map(faq => 
      faq.id === id 
        ? { ...faq, isExpanded: !faq.isExpanded, viewCount: faq.viewCount + 1 }
        : faq
    ));
  };

  const markAsHelpful = (id: string) => {
    setFaqs(faqs.map(faq => 
      faq.id === id 
        ? { ...faq, helpfulCount: faq.helpfulCount + 1 }
        : faq
    ));
  };

  const saveFAQ = () => {
    if (!newFAQ.question || !newFAQ.answer) {
      alert("質問と回答を入力してください。");
      return;
    }

    const faqToSave: FAQ = {
      id: editingFAQ?.id || Date.now().toString(),
      question: newFAQ.question!,
      answer: newFAQ.answer!,
      category: newFAQ.category || "全般",
      tags: newFAQ.tags || [],
      viewCount: editingFAQ?.viewCount || 0,
      helpfulCount: editingFAQ?.helpfulCount || 0,
      createdAt: editingFAQ?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingFAQ) {
      setFaqs(faqs.map(faq => faq.id === editingFAQ.id ? faqToSave : faq));
      setEditingFAQ(null);
    } else {
      setFaqs([faqToSave, ...faqs]);
      setIsAddingNew(false);
    }

    setNewFAQ({ question: "", answer: "", category: "全般", tags: [] });
  };

  const deleteFAQ = (id: string) => {
    if (window.confirm("このFAQを削除してもよろしいですか？")) {
      setFaqs(faqs.filter(faq => faq.id !== id));
    }
  };

  const startEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setNewFAQ({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags
    });
    setIsAddingNew(true);
  };

  const cancelEdit = () => {
    setIsAddingNew(false);
    setEditingFAQ(null);
    setNewFAQ({ question: "", answer: "", category: "全般", tags: [] });
  };

  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">よくある質問（FAQ）</h1>
                <p className="text-gray-600">質問と回答を検索・管理できます</p>
              </div>
              <button
                onClick={() => setIsAddingNew(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>新しいFAQを追加</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="質問や回答を検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="lg:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="すべて">すべてのカテゴリ</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">タグでフィルター:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          selectedTags.includes(tag)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{faqs.length}</p>
                    <p className="text-sm text-gray-600">総FAQ数</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {faqs.reduce((sum, faq) => sum + faq.viewCount, 0)}
                    </p>
                    <p className="text-sm text-gray-600">総閲覧数</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ThumbsUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {faqs.reduce((sum, faq) => sum + faq.helpfulCount, 0)}
                    </p>
                    <p className="text-sm text-gray-600">役立った数</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add/Edit FAQ Form */}
          {isAddingNew && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingFAQ ? "FAQを編集" : "新しいFAQを追加"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    質問
                  </label>
                  <input
                    type="text"
                    value={newFAQ.question || ""}
                    onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="質問を入力..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    回答
                  </label>
                  <textarea
                    value={newFAQ.answer || ""}
                    onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="回答を入力..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      カテゴリ
                    </label>
                    <select
                      value={newFAQ.category || "全般"}
                      onChange={(e) => setNewFAQ({ ...newFAQ, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タグ（カンマ区切り）
                    </label>
                    <input
                      type="text"
                      value={newFAQ.tags?.join(", ") || ""}
                      onChange={(e) => setNewFAQ({
                        ...newFAQ,
                        tags: e.target.value.split(",").map(t => t.trim()).filter(t => t)
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="タグ1, タグ2..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveFAQ}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFAQs.map(faq => (
              <div key={faq.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFAQ(faq.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {faq.isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {faq.question}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {faq.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {faq.viewCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              {faq.helpfulCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(faq.updatedAt).toLocaleDateString("ja-JP")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(faq);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFAQ(faq.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {faq.isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="pt-4">
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 whitespace-pre-wrap">{faq.answer}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {faq.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsHelpful(faq.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>役に立った</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredFAQs.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">該当するFAQが見つかりませんでした</p>
              <button
                onClick={() => setIsAddingNew(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                新しいFAQを追加
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}