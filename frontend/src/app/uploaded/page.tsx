"use client";

import React, { useState, useEffect } from 'react';
import { listUploadedFiles, getUploadedFileContent, deleteUploadedFile, UploadedFile, UploadedFileContent } from '@/services/api';
import { UnifiedHeader } from '@/components/layout/UnifiedHeader';
import { Download, Eye, Trash2, FileText, Search, X, File, Image, FileCode, FileArchive, CheckSquare, Square, RefreshCcw } from 'lucide-react';
import PreviewModal from '@/components/convert/PreviewModal';

export default function UploadedPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<UploadedFileContent | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await listUploadedFiles();
      setFiles(result.files);
    } catch (error) {
      console.error('Failed to load uploaded files:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType: string, extension: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-5 h-5" />;
    } else if (mimeType.startsWith('text/') || extension === 'json' || extension === 'xml') {
      return <FileCode className="w-5 h-5" />;
    } else if (extension === 'zip' || extension === 'rar' || extension === '7z') {
      return <FileArchive className="w-5 h-5" />;
    } else {
      return <File className="w-5 h-5" />;
    }
  };

  const handlePreview = async (file: UploadedFile) => {
    // Check if file can be previewed in browser
    const browserViewableTypes = [
      'application/pdf',
      'text/',
      'image/',
      'video/',
      'audio/',
      'application/json',
      'application/xml',
      'application/javascript'
    ];
    
    const canPreviewInBrowser = browserViewableTypes.some(type => 
      file.mime_type.startsWith(type) || file.mime_type === type
    );
    
    if (canPreviewInBrowser) {
      // Open in new tab for browser preview
      window.open(`http://localhost:8000/api/v1/conversion/uploaded/preview/${encodeURIComponent(file.filename)}`, '_blank');
    } else {
      // For other files, try to get content or download
      try {
        const content = await getUploadedFileContent(file.filename);
        
        if (content instanceof Blob) {
          // For binary files, download
          handleDownload(file.filename, content);
        } else {
          // For text files, show in modal
          setSelectedFile(content);
          setPreviewOpen(true);
        }
      } catch (error) {
        console.error('Failed to preview file:', error);
        alert('ファイルのプレビューに失敗しました');
      }
    }
  };

  const handleDownload = async (filename: string, blob?: Blob) => {
    try {
      let downloadBlob = blob;
      
      if (!downloadBlob) {
        const content = await getUploadedFileContent(filename);
        if (content instanceof Blob) {
          downloadBlob = content;
        } else {
          // Convert text content to blob
          downloadBlob = new Blob([content.content], { type: 'text/plain' });
        }
      }
      
      const url = window.URL.createObjectURL(downloadBlob);
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
      await deleteUploadedFile(filename);
      setDeleteConfirm(null);
      await loadFiles(); // Reload the file list
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('ファイルの削除に失敗しました');
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
      setSelectedFiles(new Set(filteredFiles.map(f => f.filename)));
    }
  };

  const handleBatchDownload = async () => {
    const filesArray = Array.from(selectedFiles);
    for (const filename of filesArray) {
      await handleDownload(filename);
      // Add small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const handleBatchDelete = async () => {
    if (!batchDeleteConfirm) {
      setBatchDeleteConfirm(true);
      return;
    }

    try {
      const filesArray = Array.from(selectedFiles);
      for (const filename of filesArray) {
        await deleteUploadedFile(filename);
      }
      setSelectedFiles(new Set());
      setBatchDeleteConfirm(false);
      await loadFiles();
    } catch (error) {
      console.error('Failed to delete files:', error);
      alert('ファイルの削除に失敗しました');
    }
  };

  const handleBatchConvert = async () => {
    // Navigate to convert page with selected files
    const filesToConvert = Array.from(selectedFiles).join(',');
    window.location.href = `/convert?files=${encodeURIComponent(filesToConvert)}`;
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.extension.toLowerCase().includes(searchTerm.toLowerCase())
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
      <UnifiedHeader />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Uploaded Files</h1>
          <p className="mt-2 text-gray-600">アップロード済みファイルの管理</p>
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
                placeholder="ファイル名、拡張子、内容で検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={loadFiles}
              className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
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
                  onClick={handleBatchConvert}
                  className="px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-md transition-all duration-200 text-sm flex items-center gap-1"
                >
                  <RefreshCcw className="w-4 h-4" />
                  一括変換
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
                  className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${
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
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
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
                {searchTerm ? '検索結果がありません' : 'アップロード済みファイルがありません'}
              </p>
            </div>
          ) : (
            <>
              {/* Select All Header */}
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
              <div className="divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <div key={file.filename} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start">
                      <button
                        onClick={() => toggleFileSelection(file.filename)}
                        className="mr-4 mt-1 text-gray-400 hover:text-primary transition-colors"
                      >
                        {selectedFiles.has(file.filename) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-gray-500">
                            {getFileIcon(file.mime_type, file.extension)}
                          </span>
                          <h3 className="text-lg font-medium text-gray-900">
                            {file.filename}
                          </h3>
                          {file.extension && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              .{file.extension}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {file.size_formatted} • {formatDate(file.modified)} • {file.mime_type}
                        </div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {file.preview}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handlePreview(file)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="プレビュー"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(file.filename)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="ダウンロード"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.filename)}
                          className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                            deleteConfirm === file.filename
                              ? 'text-white bg-gradient-to-r from-red-500 to-red-600 hover:shadow-md'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={deleteConfirm === file.filename ? 'クリックして削除を確認' : '削除'}
                        >
                          削除
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
            </>
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