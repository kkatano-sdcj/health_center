"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { supabase, FAQ as SupabaseFAQ } from "@/lib/supabase";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Edit3, 
  Trash2,
  Clock,
  Eye,
  ThumbsUp,
  Filter,
  BookOpen,
  HelpCircle,
  Loader2
} from "lucide-react";

interface FAQ extends SupabaseFAQ {
  isExpanded?: boolean;
  // UI用のプロパティ（データベースのカラム名とは別）
  question: string;
  answer: string;
}

const categories = [
  "すべて",
  "会計カード",
  "レセプト", 
  "DPC",
  "収納・請求",
  "マスタ",
  "統計・DWH",
  "処方・オーダ",
  "病名",
  "外来",
  "入院",
  "システム",
  "帳票",
  "画面表示",
  "その他"
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFAQ, setNewFAQ] = useState<Partial<FAQ>>({
    question: "",
    answer: "",
    question_content: "",
    answer_content: "",
    category: "全般",
    tags: []
  });

  // Load FAQs from Supabase on mount
  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!supabase) {
        // Supabaseが設定されていない場合はローカルストレージから読み込み
        const savedFAQs = localStorage.getItem("faqs");
        if (savedFAQs) {
          setFaqs(JSON.parse(savedFAQs));
        } else {
          setError('Supabaseが設定されていません。env.localファイルにSUPABASE_URLとSUPABASE_ANON_KEYを設定してください。');
        }
        return;
      }
      
      // 解決済みのFAQのみを取得し、カテゴリ情報も含める（ユーザー情報は除外）
      const { data, error } = await supabase
        .from('faqs')
        .select(`
          id,
          record_number,
          question_title,
          question_content,
          answer_content,
          status,
          priority,
          view_count,
          helpful_count,
          not_helpful_count,
          tags,
          question_date,
          response_date,
          resolved_date,
          created_at,
          updated_at,
          faq_categories!inner (
            id,
            code,
            name,
            description,
            color_code,
            icon_name
          )
        `)
        .eq('status', 'resolved')
        .not('answer_content', 'is', null)
        .eq('faq_categories.is_active', true)
        .order('view_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedFAQs: FAQ[] = data.map(faq => ({
          ...faq,
          question: faq.question_content,  // UIで使用するフィールド
          answer: faq.answer_content,      // UIで使用するフィールド
          view_count: faq.view_count || 0,
          helpful_count: faq.helpful_count || 0,
          category: faq.faq_categories?.name || '全般',
          created_at: faq.created_at,
          updated_at: faq.updated_at || faq.created_at,
          tags: faq.tags || [],
          isExpanded: false
        }));
        setFaqs(formattedFAQs);
        console.log('Loaded FAQs:', formattedFAQs.length, 'items');
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // RLSエラーの場合は、より分かりやすいメッセージを表示
      if (errorMessage.includes('infinite recursion') || errorMessage.includes('policy')) {
        setError('データベース設定を修正中です。しばらくお待ちください。');
      } else {
        setError('FAQの読み込みに失敗しました: ' + errorMessage);
      }
      
      // フォールバック：ローカルストレージから読み込み
      const savedFAQs = localStorage.getItem("faqs");
      if (savedFAQs) {
        setFaqs(JSON.parse(savedFAQs));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Filter FAQs based on search and category
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      selectedCategory === "すべて" || faq.category === selectedCategory;
    const matchesTags = 
      selectedTags.length === 0 || 
      selectedTags.some(tag => faq.tags?.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(faqs.flatMap(faq => faq.tags || [])));

  const toggleFAQ = async (id: string) => {
    const faq = faqs.find(f => f.id === id);
    if (!faq) return;

    // UI を即座に更新
    setFaqs(faqs.map(f => 
      f.id === id 
        ? { ...f, isExpanded: !f.isExpanded, view_count: f.view_count + 1 }
        : f
    ));

    // バックグラウンドでビューカウントを更新（RPC関数を使用）
    if (!faq.isExpanded && supabase) {
      try {
        const { error } = await supabase.rpc('increment_faq_view_count', {
          faq_id: id
        });
        if (error) {
          console.error('Error updating view count:', error);
        }
      } catch (err) {
        console.error('Error updating view count:', err);
      }
    }
  };

  const markAsHelpful = async (id: string) => {
    const faq = faqs.find(f => f.id === id);
    if (!faq) return;

    // UI を即座に更新
    setFaqs(faqs.map(f => 
      f.id === id 
        ? { ...f, helpful_count: f.helpful_count + 1 }
        : f
    ));

    // バックグラウンドで有用カウントを更新
    if (supabase) {
      try {
        const { error } = await supabase
          .from('faqs')
          .update({ 
            helpful_count: faq.helpful_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('status', 'resolved');
        
        if (error) {
          console.error('Error updating helpful count:', error);
        }
      } catch (err) {
        console.error('Error updating helpful count:', err);
      }
    }
  };

  const saveFAQ = async () => {
    if (!newFAQ.question || !newFAQ.answer) {
      alert("質問と回答を入力してください。");
      return;
    }

    if (!supabase) {
      alert("Supabaseが設定されていません。");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingFAQ) {
        // 既存のFAQを更新
        const { data, error } = await supabase
          .from('faqs')
          .update({
            question_title: newFAQ.question,
            question_content: newFAQ.question,
            answer_content: newFAQ.answer,
            tags: newFAQ.tags || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFAQ.id)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setFaqs(faqs.map(faq => 
            faq.id === editingFAQ.id 
              ? { 
                  ...data,
                  question: data.question_content,
                  answer: data.answer_content,
                  isExpanded: false 
                }
              : faq
          ));
        }
        setEditingFAQ(null);
      } else {
        // 新しいFAQを作成（注意：実際の実装では必要なフィールドを全て設定する必要があります）
        const { data, error } = await supabase
          .from('faqs')
          .insert({
            record_number: `USER-${Date.now()}`,
            question_title: newFAQ.question,
            question_content: newFAQ.question,
            answer_content: newFAQ.answer,
            status: 'resolved',
            priority: 'medium',
            category_id: '10000000-0000-0000-0000-000000000014', // "その他"カテゴリのID
            tags: newFAQ.tags || [],
            question_date: new Date().toISOString().split('T')[0],
            response_date: new Date().toISOString().split('T')[0],
            resolved_date: new Date().toISOString().split('T')[0],
            view_count: 0,
            helpful_count: 0,
            not_helpful_count: 0
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setFaqs([{ 
            ...data,
            question: data.question_content,
            answer: data.answer_content,
            isExpanded: false 
          }, ...faqs]);
        }
      }

      setIsAddingNew(false);
      setNewFAQ({ question: "", answer: "", question_content: "", answer_content: "", category: "全般", tags: [] });
    } catch (err) {
      console.error('Error saving FAQ:', err);
      setError('FAQの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFAQ = async (id: string) => {
    if (window.confirm("このFAQを削除してもよろしいですか？")) {
      if (!supabase) {
        alert("Supabaseが設定されていません。");
        return;
      }
      try {
        const { error } = await supabase
          .from('faqs')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setFaqs(faqs.filter(faq => faq.id !== id));
      } catch (err) {
        console.error('Error deleting FAQ:', err);
        setError('FAQの削除に失敗しました');
      }
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
    setNewFAQ({ question: "", answer: "", question_content: "", answer_content: "", category: "全般", tags: [] });
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
                      {faqs.reduce((sum, faq) => sum + faq.view_count, 0)}
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
                      {faqs.reduce((sum, faq) => sum + faq.helpful_count, 0)}
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
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Loader2 className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">FAQを読み込んでいます...</p>
            </div>
          ) : (
            <>          
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
                              {faq.view_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              {faq.helpful_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(faq.updated_at).toLocaleDateString("ja-JP")}
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
                          {faq.tags?.map(tag => (
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
          {!isLoading && filteredFAQs.length === 0 && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}