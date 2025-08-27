"use client";

import React, { useState, useEffect } from 'react';
import { UnifiedHeader } from '@/components/layout/UnifiedHeader';
import { Search, Database, FileText, BarChart, Loader, RefreshCw, Trash2, X, CheckSquare, Square } from 'lucide-react';

interface VectorStats {
  collection_name: string;
  total_chunks: number;
  unique_documents: number;
  documents: string[];
  chunk_size: number;
  overlap_percentage: number;
  embedding_model: string;
}

interface SearchResult {
  text: string;
  metadata: {
    source_filename: string;
    chunk_index: number;
    total_chunks: number;
    doc_id: string;
  };
  similarity: number;
  distance: number;
}

export default function VectorDBPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [numResults, setNumResults] = useState(5);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/conversion/vectorize/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load vector stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('検索クエリを入力してください');
      return;
    }

    setLoading(true);
    setSearchResults([]);

    try {
      const response = await fetch('http://localhost:8000/api/v1/conversion/vectorize/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          n_results: numResults,
        }),
      });

      const data = await response.json();
      if (data.success && data.results) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('検索中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    if (deleteConfirm !== filename) {
      setDeleteConfirm(filename);
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/conversion/vectorize/file/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert(`${filename} を削除しました`);
        setDeleteConfirm(null);
        await loadStats();
        // Clear search results if any
        setSearchResults([]);
        // Remove from selected if it was selected
        const newSelected = new Set(selectedDocs);
        newSelected.delete(filename);
        setSelectedDocs(newSelected);
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('削除中にエラーが発生しました');
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedDocs.size === 0) {
      alert('削除するドキュメントを選択してください');
      return;
    }

    if (!confirm(`選択した${selectedDocs.size}件のドキュメントを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setDeleting(true);
    const errors = [];
    const successes = [];

    for (const filename of Array.from(selectedDocs)) {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/conversion/vectorize/file/${encodeURIComponent(filename)}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          successes.push(filename);
        } else {
          errors.push(filename);
        }
      } catch (error) {
        errors.push(filename);
      }
    }

    if (successes.length > 0) {
      alert(`${successes.length}件のドキュメントを削除しました`);
    }
    if (errors.length > 0) {
      alert(`${errors.length}件の削除に失敗しました`);
    }

    setSelectedDocs(new Set());
    await loadStats();
    setSearchResults([]);
    setDeleting(false);
  };

  const toggleDocSelection = (filename: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedDocs(newSelected);
  };

  const toggleSelectAll = () => {
    if (stats?.documents) {
      if (selectedDocs.size === stats.documents.length) {
        setSelectedDocs(new Set());
      } else {
        setSelectedDocs(new Set(stats.documents));
      }
    }
  };

  const handleReset = async () => {
    if (!confirm('ベクトルDBのすべてのデータを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/conversion/vectorize/reset', {
        method: 'POST',
      });

      if (response.ok) {
        alert('ベクトルDBをリセットしました');
        await loadStats();
        setSearchResults([]);
        setSelectedDocs(new Set());
      } else {
        alert('リセットに失敗しました');
      }
    } catch (error) {
      console.error('Reset error:', error);
      alert('リセット中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'text-green-600';
    if (similarity >= 0.6) return 'text-yellow-600';
    if (similarity >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.8) return '高';
    if (similarity >= 0.6) return '中';
    if (similarity >= 0.4) return '低';
    return '極低';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedHeader />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Vector Database
          </h1>
          <p className="mt-2 text-gray-600">ChromaDBに登録されたベクトルデータの検索と管理</p>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-primary" />
              データベース統計
            </h2>
            <div className="flex gap-2">
              <button
                onClick={loadStats}
                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="統計を更新"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleReset}
                disabled={loading || !stats || stats.total_chunks === 0}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="ベクトルDBをリセット"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {statsLoading ? (
            <div className="text-center py-4">
              <Loader className="w-6 h-6 animate-spin mx-auto text-primary" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">総チャンク数</div>
                <div className="text-2xl font-bold text-primary">{stats.total_chunks}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">ドキュメント数</div>
                <div className="text-2xl font-bold text-secondary">{stats.unique_documents}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">チャンクサイズ</div>
                <div className="text-2xl font-bold text-green-600">{stats.chunk_size}</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">オーバーラップ</div>
                <div className="text-2xl font-bold text-orange-600">{stats.overlap_percentage}%</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              統計情報を取得できませんでした
            </div>
          )}

          {stats && stats.documents.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">登録済みドキュメント:</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    {selectedDocs.size === stats.documents.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    すべて選択
                  </button>
                  {selectedDocs.size > 0 && (
                    <button
                      onClick={handleBatchDelete}
                      disabled={deleting}
                      className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      選択削除 ({selectedDocs.size})
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {stats.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleDocSelection(doc)}
                        className="text-gray-500 hover:text-primary"
                      >
                        {selectedDocs.has(doc) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 truncate max-w-md" title={doc}>
                        {doc}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deleting}
                      className={`px-2 py-0.5 rounded transition-colors text-xs font-medium ${
                        deleteConfirm === doc
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'text-red-600 hover:bg-red-50'
                      } disabled:opacity-50`}
                      title={deleteConfirm === doc ? 'クリックして削除を確認' : '削除'}
                    >
                      削除
                    </button>
                    {deleteConfirm === doc && (
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors ml-1"
                        title="キャンセル"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="ベクトルDBを検索..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <select
                value={numResults}
                onChange={(e) => setNumResults(Number(e.target.value))}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              >
                <option value={5}>5件</option>
                <option value={10}>10件</option>
                <option value={20}>20件</option>
              </select>
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                検索
              </button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                検索結果 ({searchResults.length}件)
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {searchResults.map((result, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {result.metadata.source_filename}
                      </span>
                      <span className="text-sm text-gray-500">
                        (チャンク {result.metadata.chunk_index + 1}/{result.metadata.total_chunks})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${getSimilarityColor(result.similarity)}`}>
                        {(result.similarity * 100).toFixed(1)}%
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getSimilarityColor(result.similarity)
                        } bg-opacity-10 ${getSimilarityColor(result.similarity).replace(
                          'text',
                          'bg'
                        )}`}
                      >
                        関連度: {getSimilarityLabel(result.similarity)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap break-words">
                      {result.text}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>Doc ID: {result.metadata.doc_id.substring(0, 8)}...</span>
                    <span>Distance: {result.distance.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && searchQuery && searchResults.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">検索結果が見つかりませんでした</p>
            <p className="text-sm text-gray-500 mt-2">
              別のキーワードで検索してみてください
            </p>
          </div>
        )}

        {/* Initial State */}
        {!loading && !searchQuery && searchResults.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ベクトルDBを検索してください</p>
            <p className="text-sm text-gray-500 mt-2">
              キーワードを入力して関連するドキュメントを検索できます
            </p>
          </div>
        )}
      </main>
    </div>
  );
}