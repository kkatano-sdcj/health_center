"use client";

import React from "react";
import { Info, ExternalLink } from "lucide-react";

interface RelatedDocument {
  id: string;
  title: string;
  updatedAt: string;
}

interface InfoPanelProps {
  selectedFile?: {
    name: string;
    size: string;
    lastUpdatedBy: string;
    viewCount: number;
    isLatest: boolean;
  };
  relatedDocs?: RelatedDocument[];
}

const defaultRelatedDocs: RelatedDocument[] = [
  { id: "1", title: "インストールガイド", updatedAt: "3日前" },
  { id: "2", title: "FAQ集", updatedAt: "1週間前" },
  { id: "3", title: "トラブルシューティング", updatedAt: "2週間前" },
];

export const InfoPanel: React.FC<InfoPanelProps> = ({
  selectedFile,
  relatedDocs = defaultRelatedDocs,
}) => {
  return (
    <aside className="w-80 bg-white border-l border-gray-100 overflow-y-auto hidden xl:block">
      <div className="p-6">
        {selectedFile && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              検索結果の詳細
            </h2>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {selectedFile.name}
                </h3>
                {selectedFile.isLatest && (
                  <span className="text-xs text-green-600 font-medium">最新版</span>
                )}
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>ファイルサイズ:</span>
                  <span className="font-medium text-gray-900">{selectedFile.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>最終更新者:</span>
                  <span className="font-medium text-gray-900">
                    {selectedFile.lastUpdatedBy}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>閲覧回数:</span>
                  <span className="font-medium text-gray-900">
                    {selectedFile.viewCount.toLocaleString()}回
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2">
                  <span>ファイルを開く</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            関連ドキュメント
          </h2>
          <div className="space-y-2">
            {relatedDocs.map((doc) => (
              <a
                key={doc.id}
                href="#"
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                <p className="text-xs text-gray-500 mt-1">更新: {doc.updatedAt}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                検索のコツ
              </h3>
              <p className="text-xs text-gray-600">
                キーワードを組み合わせて検索すると、より正確な結果が得られます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};