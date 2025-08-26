"use client";

import React, { useState, useEffect } from 'react';
import { listStorageFiles, getStorageFileContent, deleteStorageFile, downloadFile, StorageFile, StorageFileContent } from '@/services/api';
import Link from 'next/link';
import { Home, Download, Eye, Trash2, FileText, Search, X } from 'lucide-react';
import PreviewModal from '@/components/convert/PreviewModal';

export default function StoragePage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<StorageFileContent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await listStorageFiles();
      setFiles(result.files);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (filename: string) => {
    try {
      const content = await getStorageFileContent(filename);
      setSelectedFile(content);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Failed to preview file:', error);
      alert('ファイルのプレビューに失敗しました');
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const blob = await downloadFile(filename);
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

  const handleDelete = async (filename: string) => {
    if (deleteConfirm !== filename) {
      setDeleteConfirm(filename);
      return;
    }

    try {
      await deleteStorageFile(filename);
      setDeleteConfirm(null);
      await loadFiles(); // Reload the file list
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('ファイルの削除に失敗しました');
    }
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.preview.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-semibold">
                Health Center
              </Link>
              <div className="flex space-x-4">
                <Link href="/aichat" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  AI Chat
                </Link>
                <Link href="/convert" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Convert
                </Link>
                <Link href="/storage" className="text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Storage
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors" title="ホームに戻る">
                <Home className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Storage</h1>
          <p className="mt-2 text-gray-600">変換済みファイルの管理</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ファイル名または内容で検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadFiles}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              更新
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            合計: {filteredFiles.length} / {files.length} ファイル
          </div>
        </div>

        {/* File List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
            <div className="divide-y divide-gray-200">
              {filteredFiles.map((file) => (
                <div key={file.filename} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {file.filename}
                      </h3>
                      <div className="text-sm text-gray-500 mb-2">
                        {file.size_formatted} • {formatDate(file.modified)}
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {file.preview}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handlePreview(file.filename)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        title="プレビュー"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(file.filename)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                        title="ダウンロード"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(file.filename)}
                        className={`p-2 rounded-md transition-colors ${
                          deleteConfirm === file.filename
                            ? 'text-white bg-red-600 hover:bg-red-700'
                            : 'text-red-600 hover:bg-red-100'
                        }`}
                        title={deleteConfirm === file.filename ? 'クリックして削除を確認' : '削除'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {deleteConfirm === file.filename && (
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          title="キャンセル"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {selectedFile && (
          <PreviewModal
            isOpen={previewOpen}
            content={selectedFile.content}
            fileName={selectedFile.filename}
            onClose={() => {
              setPreviewOpen(false);
              setSelectedFile(null);
            }}
          />
        )}
      </main>
    </div>
  );
}