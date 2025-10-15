"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { 
  Search, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  FileText,
  BarChart3,
  Info,
  Clock,
  Database,
  CheckSquare,
  Square
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
  lastChecked?: string;
  status?: "verified" | "needs-update" | "outdated" | "unchecked";
  accuracy?: number;
  notes?: string;
}

interface CheckResult {
  faqId: string;
  status: "verified" | "needs-update" | "outdated";
  accuracy: number;
  notes: string;
  checkedAt: string;
}

const statusColors = {
  verified: "bg-green-100 text-green-800",
  "needs-update": "bg-yellow-100 text-yellow-800",
  outdated: "bg-red-100 text-red-800",
  unchecked: "bg-gray-100 text-gray-600"
};

const statusIcons = {
  verified: <CheckCircle className="w-4 h-4" />,
  "needs-update": <AlertCircle className="w-4 h-4" />,
  outdated: <XCircle className="w-4 h-4" />,
  unchecked: <Info className="w-4 h-4" />
};

export default function FAQCheckPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "status" | "accuracy">("date");
  const [selectedFAQs, setSelectedFAQs] = useState<Set<string>>(new Set());
  const [checkHistory, setCheckHistory] = useState<CheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Load FAQs and check history
  useEffect(() => {
    const savedFAQs = localStorage.getItem("faqs");
    if (savedFAQs) {
      const parsedFAQs = JSON.parse(savedFAQs);
      // Add check status to FAQs
      const faqsWithStatus = parsedFAQs.map((faq: FAQ) => ({
        ...faq,
        status: faq.status || "unchecked",
        accuracy: faq.accuracy || 0,
        lastChecked: faq.lastChecked || null
      }));
      setFaqs(faqsWithStatus);
    }

    const savedHistory = localStorage.getItem("faqCheckHistory");
    if (savedHistory) {
      setCheckHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save check history
  useEffect(() => {
    if (checkHistory.length > 0) {
      localStorage.setItem("faqCheckHistory", JSON.stringify(checkHistory));
    }
  }, [checkHistory]);

  // Filter and sort FAQs
  const filteredAndSortedFAQs = faqs
    .filter(faq => {
      const matchesSearch = 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = 
        statusFilter === "all" || faq.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "status":
          const statusOrder = { verified: 0, "needs-update": 1, outdated: 2, unchecked: 3 };
          return (statusOrder[a.status || "unchecked"] || 3) - (statusOrder[b.status || "unchecked"] || 3);
        case "accuracy":
          return (b.accuracy || 0) - (a.accuracy || 0);
        default:
          return 0;
      }
    });

  // Toggle FAQ selection
  const toggleSelection = (faqId: string) => {
    const newSelection = new Set(selectedFAQs);
    if (newSelection.has(faqId)) {
      newSelection.delete(faqId);
    } else {
      newSelection.add(faqId);
    }
    setSelectedFAQs(newSelection);
  };

  // Select all visible FAQs
  const selectAll = () => {
    if (selectedFAQs.size === filteredAndSortedFAQs.length) {
      setSelectedFAQs(new Set());
    } else {
      setSelectedFAQs(new Set(filteredAndSortedFAQs.map(faq => faq.id)));
    }
  };

  // Check selected FAQs
  const checkSelectedFAQs = async () => {
    if (selectedFAQs.size === 0) {
      alert("チェックするFAQを選択してください。");
      return;
    }

    setIsChecking(true);

    // Simulate checking process
    const results: CheckResult[] = [];
    const updatedFAQs = [...faqs];

    for (const faqId of selectedFAQs) {
      // Simulate AI/manual checking
      await new Promise(resolve => setTimeout(resolve, 500));

      const faq = updatedFAQs.find(f => f.id === faqId);
      if (faq) {
        // Random simulation for demo
        const random = Math.random();
        let status: "verified" | "needs-update" | "outdated";
        let accuracy: number;

        if (random > 0.7) {
          status = "verified";
          accuracy = 90 + Math.random() * 10;
        } else if (random > 0.3) {
          status = "needs-update";
          accuracy = 60 + Math.random() * 30;
        } else {
          status = "outdated";
          accuracy = Math.random() * 60;
        }

        const result: CheckResult = {
          faqId,
          status,
          accuracy: Math.round(accuracy),
          notes: status === "verified" 
            ? "内容は正確で最新です" 
            : status === "needs-update"
            ? "一部の情報を更新する必要があります"
            : "情報が古くなっています。大幅な更新が必要です",
          checkedAt: new Date().toISOString()
        };

        results.push(result);

        // Update FAQ
        faq.status = status;
        faq.accuracy = result.accuracy;
        faq.lastChecked = result.checkedAt;
      }
    }

    setFaqs(updatedFAQs);
    setCheckHistory([...results, ...checkHistory]);
    localStorage.setItem("faqs", JSON.stringify(updatedFAQs));
    setSelectedFAQs(new Set());
    setIsChecking(false);
  };

  // Calculate statistics
  const stats = {
    total: faqs.length,
    verified: faqs.filter(f => f.status === "verified").length,
    needsUpdate: faqs.filter(f => f.status === "needs-update").length,
    outdated: faqs.filter(f => f.status === "outdated").length,
    unchecked: faqs.filter(f => !f.status || f.status === "unchecked").length,
    averageAccuracy: faqs.filter(f => f.accuracy).reduce((sum, f) => sum + (f.accuracy || 0), 0) / 
                     (faqs.filter(f => f.accuracy).length || 1)
  };

  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">FAQ検証システム</h1>
                <p className="text-gray-600">FAQの内容を確認・検証し、最新性と正確性を管理します</p>
              </div>
              <button
                onClick={checkSelectedFAQs}
                disabled={selectedFAQs.size === 0 || isChecking}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedFAQs.size === 0 || isChecking
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isChecking ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span>{isChecking ? "チェック中..." : `選択したFAQをチェック (${selectedFAQs.size})`}</span>
              </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Database className="w-5 h-5 text-gray-500" />
                  <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                </div>
                <p className="text-sm text-gray-600">総FAQ数</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">{stats.verified}</span>
                </div>
                <p className="text-sm text-gray-600">検証済み</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <span className="text-2xl font-bold text-yellow-600">{stats.needsUpdate}</span>
                </div>
                <p className="text-sm text-gray-600">要更新</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">{stats.outdated}</span>
                </div>
                <p className="text-sm text-gray-600">期限切れ</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Info className="w-5 h-5 text-gray-500" />
                  <span className="text-2xl font-bold text-gray-600">{stats.unchecked}</span>
                </div>
                <p className="text-sm text-gray-600">未チェック</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <span className="text-2xl font-bold text-blue-600">
                    {Math.round(stats.averageAccuracy)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">平均精度</p>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="FAQを検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">すべてのステータス</option>
                    <option value="verified">検証済み</option>
                    <option value="needs-update">要更新</option>
                    <option value="outdated">期限切れ</option>
                    <option value="unchecked">未チェック</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "date" | "status" | "accuracy")}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">更新日順</option>
                    <option value="status">ステータス順</option>
                    <option value="accuracy">精度順</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {selectedFAQs.size === filteredAndSortedFAQs.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>すべて選択</span>
                </button>
                <span className="text-sm text-gray-500">
                  {filteredAndSortedFAQs.length}件のFAQ
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredAndSortedFAQs.map(faq => (
                <div 
                  key={faq.id} 
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleSelection(faq.id)}
                      className="mt-1"
                    >
                      {selectedFAQs.has(faq.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-base font-medium text-gray-900 mb-1">
                            {faq.question}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {faq.answer}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                            statusColors[faq.status || "unchecked"]
                          }`}>
                            {statusIcons[faq.status || "unchecked"]}
                            {faq.status === "verified" && "検証済み"}
                            {faq.status === "needs-update" && "要更新"}
                            {faq.status === "outdated" && "期限切れ"}
                            {(!faq.status || faq.status === "unchecked") && "未チェック"}
                          </span>
                          {faq.accuracy !== undefined && faq.accuracy > 0 && (
                            <span className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                              精度: {faq.accuracy}%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {faq.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          更新: {new Date(faq.updatedAt).toLocaleDateString("ja-JP")}
                        </span>
                        {faq.lastChecked && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            最終チェック: {new Date(faq.lastChecked).toLocaleDateString("ja-JP")}
                          </span>
                        )}
                        {faq.notes && (
                          <span className="text-gray-600 italic">{faq.notes}</span>
                        )}
                      </div>
                      
                      {faq.tags && faq.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {faq.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Check History */}
          {checkHistory.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">最近のチェック履歴</h2>
              <div className="space-y-2">
                {checkHistory.slice(0, 5).map((result, index) => {
                  const faq = faqs.find(f => f.id === result.faqId);
                  return (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        {statusIcons[result.status]}
                        <div>
                          <p className="text-sm text-gray-900">{faq?.question || "削除されたFAQ"}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(result.checkedAt).toLocaleString("ja-JP")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[result.status]}`}>
                          {result.status === "verified" && "検証済み"}
                          {result.status === "needs-update" && "要更新"}
                          {result.status === "outdated" && "期限切れ"}
                        </span>
                        <span className="text-xs text-gray-500">精度: {result.accuracy}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedFAQs.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">該当するFAQが見つかりませんでした</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}