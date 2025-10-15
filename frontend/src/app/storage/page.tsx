"use client";

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Eye, FileText, Search, RefreshCw, FileIcon, FileCode, FileSpreadsheet, Trash2, CheckSquare, Square, Download, Database, CheckCircle } from 'lucide-react';
import { getConvertedFiles, getFileContent, deleteFile, batchDeleteFiles, formatFileSize, ConvertedFile, FileContent, addToVectorDB } from '@/services/storageApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function StoragePage() {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [addingToVectorDB, setAddingToVectorDB] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await getConvertedFiles();
      setFiles(result);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (filename: string) => {
    setLoadingPreview(true);
    try {
      const content = await getFileContent(filename);
      setSelectedFile(content);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Failed to preview file:', error);
      alert('ファイルのプレビューに失敗しました');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (deleteConfirm !== filename) {
      setDeleteConfirm(filename);
      return;
    }

    try {
      await deleteFile(filename);
      setDeleteConfirm(null);
      await loadFiles();
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('ファイルの削除に失敗しました');
    }
  };

  const handleDownload = async (filename: string, content?: string) => {
    try {
      let blob: Blob;
      if (content) {
        blob = new Blob([content], { type: 'text/markdown' });
      } else {
        const fileContent = await getFileContent(filename);
        blob = new Blob([fileContent.content], { type: 'text/markdown' });
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('ファイルのダウンロードに失敗しました');
    }
  };

  const toggleFileSelection = (filename: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedFiles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.name)));
    }
  };

  const handleBatchDelete = async () => {
    if (!batchDeleteConfirm) {
      setBatchDeleteConfirm(true);
      return;
    }

    try {
      const filenames = Array.from(selectedFiles);
      await batchDeleteFiles(filenames);
      setSelectedFiles(new Set());
      setBatchDeleteConfirm(false);
      await loadFiles();
    } catch (error) {
      console.error('Failed to delete files:', error);
      alert('ファイルの一括削除に失敗しました');
    }
  };

  const handleBatchDownload = async () => {
    const filesArray = Array.from(selectedFiles);
    for (const filename of filesArray) {
      await handleDownload(filename);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const handleAddToVectorDB = async () => {
    setAddingToVectorDB(true);
    try {
      const filenames = Array.from(selectedFiles);
      const result = await addToVectorDB(filenames);
      
      if (result.total_added > 0) {
        alert(`${result.total_added}件のファイルをベクトルDBに追加しました`);
      }
      
      if (result.total_errors > 0) {
        const errorMessages = result.errors.map((e: { filename: string; error: string }) => `${e.filename}: ${e.error}`).join('\n');
        alert(`エラーが発生しました:\n${errorMessages}`);
      }
      
      setSelectedFiles(new Set());
      await loadFiles();
    } catch (error) {
      console.error('Failed to add files to vector DB:', error);
      alert('ベクトルDBへの追加に失敗しました');
    } finally {
      setAddingToVectorDB(false);
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
      case 'docx':
      case 'doc':
        return <FileText className="w-5 h-5" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5" />;
      case 'pptx':
      case 'ppt':
        return <FileCode className="w-5 h-5" />;
      default:
        return <FileIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Storage</h1>
          <p className="mt-2 text-gray-600">変換済みマークダウンファイルの管理</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ファイル名で検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={loadFiles}
              className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              更新
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              合計: {filteredFiles.length} / {files.length} ファイル
              {selectedFiles.size > 0 && (
                <span className="ml-2 font-medium text-blue-600">
                  ({selectedFiles.size} 件選択中)
                </span>
              )}
            </div>
            {selectedFiles.size > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddToVectorDB}
                  disabled={addingToVectorDB}
                  className="px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all duration-200 text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <Database className="w-4 h-4" />
                  ベクトルDBに追加
                </button>
                <button
                  onClick={handleBatchDownload}
                  className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-md transition-all duration-200 text-sm flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  一括ダウンロード
                </button>
                <button
                  onClick={handleBatchDelete}
                  className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
                    batchDeleteConfirm
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  {batchDeleteConfirm ? '削除を確認' : '一括削除'}
                </button>
                {batchDeleteConfirm && (
                  <button
                    onClick={() => setBatchDeleteConfirm(false)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    キャンセル
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* File List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">ファイルを読み込み中...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="mt-4 text-gray-600">
                {searchTerm ? '検索結果がありません' : '変換済みファイルがありません'}
              </p>
            </div>
          ) : (
            <>
              {/* Select All Header */}
              {filteredFiles.length > 0 && (
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center space-x-2 text-sm text-gray-700 hover:text-primary transition-colors"
                  >
                    {selectedFiles.size === filteredFiles.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span>すべて選択</span>
                  </button>
                </div>
              )}
              <div className="divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <div key={file.name} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleFileSelection(file.name)}
                          className="text-gray-400 hover:text-primary transition-colors"
                        >
                          {selectedFiles.has(file.name) ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div className="text-gray-400">
                          {getFileIcon(file.file_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {file.name}
                            </h3>
                            {file.in_vectordb && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                ベクトルDB追加済
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {formatFileSize(file.size)} • {formatDate(file.modified)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePreview(file.name)}
                          disabled={loadingPreview}
                          className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Eye className="w-4 h-4" />
                          プレビュー
                        </button>
                        <button
                          onClick={() => handleDelete(file.name)}
                          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                            deleteConfirm === file.name
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          <Trash2 className="w-4 h-4 inline mr-1" />
                          {deleteConfirm === file.name ? '削除を確認' : '削除'}
                        </button>
                        {deleteConfirm === file.name && (
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            キャンセル
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Preview Modal */}
        {selectedFile && previewOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedFile.metadata?.original_filename || selectedFile.filename}
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownload(selectedFile.filename, selectedFile.content)}
                    className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    ダウンロード
                  </button>
                  <button
                    onClick={() => {
                      setPreviewOpen(false);
                      setSelectedFile(null);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-gradient-to-b from-gray-50 to-white">
                <div className="p-8">
                  <article className="prose prose-lg prose-gray max-w-none
                    prose-headings:font-bold prose-headings:text-gray-900
                    prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3
                    prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-gray-800
                    prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-gray-700
                    prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                    prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-gray-900 prose-strong:font-semibold
                    prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm
                    prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:shadow-lg
                    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:pr-4 prose-blockquote:rounded-r
                    prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-2 prose-ul:text-gray-700
                    prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-2 prose-ol:text-gray-700
                    prose-li:text-gray-700 prose-li:leading-relaxed
                    prose-table:w-full prose-table:border-collapse prose-table:overflow-hidden prose-table:rounded-lg prose-table:shadow-sm
                    prose-thead:bg-gradient-to-r prose-thead:from-gray-100 prose-thead:to-gray-50
                    prose-th:text-left prose-th:font-semibold prose-th:text-gray-900 prose-th:px-4 prose-th:py-3 prose-th:border-b prose-th:border-gray-200
                    prose-td:px-4 prose-td:py-3 prose-td:border-b prose-td:border-gray-100 prose-td:text-gray-700
                    prose-tbody:bg-white
                    prose-tr:hover:bg-gray-50 prose-tr:transition-colors
                    prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto
                    prose-hr:border-gray-200 prose-hr:my-8">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedFile.content}
                    </ReactMarkdown>
                  </article>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}