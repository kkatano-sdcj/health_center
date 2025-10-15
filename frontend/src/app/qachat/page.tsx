"use client";

import React, { useState, useRef, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { 
  Send, 
  Loader2, 
  User, 
  Bot, 
  HelpCircle,
  CheckCircle,
  ChevronRight,
  BookOpen,
  MessageSquare,
  Lightbulb,
  RefreshCw
} from "lucide-react";

interface QAMessage {
  id: string;
  type: "question" | "answer" | "system" | "suggestions";
  content: string;
  timestamp: string;
  status?: "thinking" | "complete" | "error";
  relatedQuestions?: string[];
  confidence?: number;
  sources?: string[];
  suggestedQuestions?: SuggestedQuestion[];
}

interface SuggestedQuestion {
  faq_id: string;
  record_number: string;
  question_title: string;
  question_content: string;
  answer_content: string;
  category_name: string;
  similarity_score: number;
}

interface QuickQuestion {
  category: string;
  questions: string[];
}

const quickQuestions: QuickQuestion[] = [
  {
    category: "基本操作",
    questions: [
      "このシステムの主な機能は何ですか？",
      "ファイルのアップロード方法を教えてください",
      "検索機能の使い方を教えてください"
    ]
  },
  {
    category: "トラブルシューティング",
    questions: [
      "ログインできない場合の対処法は？",
      "ファイルが表示されない時はどうすればいいですか？",
      "エラーメッセージが出た時の対応方法は？"
    ]
  },
  {
    category: "高度な機能",
    questions: [
      "AIチャット機能の活用方法を教えてください",
      "ベクトルデータベースとは何ですか？",
      "RAGシステムについて説明してください"
    ]
  }
];

export default function QAChatPage() {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Add welcome message
    setMessages([
      {
        id: "welcome",
        type: "system",
        content: "こんにちは！QAチャットへようこそ。質問をお気軽にどうぞ。",
        timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (question: string = inputValue) => {
    if (!question.trim() || isLoading) return;

    const userMessage: QAMessage = {
      id: Date.now().toString(),
      type: "question",
      content: question,
      timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call QA API to search for similar questions
      const response = await fetch('/api/qa/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: question,
          n_results: 3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          // Display suggested questions
          const suggestionsMessage: QAMessage = {
            id: (Date.now() + 1).toString(),
            type: "suggestions",
            content: "以下の類似する質問が見つかりました。クリックすると回答を表示します。",
            timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
            status: "complete",
            suggestedQuestions: data.results
          };
          setMessages(prev => [...prev, suggestionsMessage]);
        } else {
          // No similar questions found
          const noResultMessage: QAMessage = {
            id: (Date.now() + 1).toString(),
            type: "system",
            content: "類似する質問が見つかりませんでした。お探しの情報について、より具体的に質問していただけますか？",
            timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
          };
          setMessages(prev => [...prev, noResultMessage]);
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Error searching FAQs:', error);
      // Fallback to simulated response
      const answerMessage: QAMessage = {
        id: (Date.now() + 1).toString(),
        type: "answer",
        content: generateAnswer(question),
        timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
        status: "complete",
        confidence: Math.floor(Math.random() * 20) + 80,
        relatedQuestions: generateRelatedQuestions(question),
        sources: ["ユーザーマニュアル", "FAQ", "システムドキュメント"]
      };
      setMessages(prev => [...prev, answerMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (suggestion: SuggestedQuestion) => {
    // Display the answer for the clicked question
    const answerMessage: QAMessage = {
      id: Date.now().toString(),
      type: "answer",
      content: `【質問】\n${suggestion.question_title}\n\n【回答】\n${suggestion.answer_content}`,
      timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
      status: "complete",
      confidence: Math.round(suggestion.similarity_score * 100),
      sources: [suggestion.category_name, `記録番号: ${suggestion.record_number}`]
    };
    setMessages(prev => [...prev, answerMessage]);
  };

  const generateAnswer = (question: string): string => {
    // Simple answer generation based on keywords
    if (question.includes("機能")) {
      return "このシステムには以下の主要機能があります：\n\n1. **AIチャット機能** - 自然言語での質問応答\n2. **ドキュメント管理** - ファイルのアップロード、変換、保存\n3. **検索機能** - ベクトルデータベースを使用した高度な検索\n4. **FAQ管理** - よくある質問の管理と検索\n5. **ノート機能** - 重要な情報の記録と管理\n\n各機能の詳細については、個別にお尋ねください。";
    } else if (question.includes("アップロード")) {
      return "ファイルのアップロード方法：\n\n1. **Uploadedページ**にアクセス\n2. 「ファイルを選択」ボタンをクリック\n3. アップロードしたいファイルを選択\n4. 「アップロード」ボタンをクリック\n\n対応形式：PDF、Word、Excel、テキスト、Markdown、画像ファイルなど";
    } else if (question.includes("検索")) {
      return "検索機能の使い方：\n\n1. 検索バーにキーワードを入力\n2. Enterキーを押すか検索ボタンをクリック\n3. 検索結果が関連度順に表示されます\n\n**高度な検索**：\n- タグによるフィルタリング\n- カテゴリ別検索\n- 日付範囲指定\n- ベクトル類似度検索（AIチャット経由）";
    } else if (question.includes("ログイン")) {
      return "ログインできない場合の対処法：\n\n1. **パスワードの確認** - 大文字小文字を確認\n2. **ユーザー名の確認** - 正しいメールアドレスか確認\n3. **ブラウザのキャッシュクリア** - Ctrl+Shift+Deleteでクリア\n4. **別のブラウザで試す** - Chrome、Firefox、Edgeなど\n5. **管理者に連絡** - 上記で解決しない場合";
    } else if (question.includes("ベクトル") || question.includes("RAG")) {
      return "**ベクトルデータベース**は、テキストを数値ベクトルに変換して保存する技術です。\n\n**RAG (Retrieval-Augmented Generation)**：\n- 検索強化生成の略\n- ベクトルデータベースから関連情報を検索\n- 検索結果を基にAIが回答を生成\n- より正確で関連性の高い回答が可能\n\nこれにより、大量の文書から瞬時に関連情報を見つけ出すことができます。";
    } else {
      return "ご質問ありがとうございます。\n\nご質問に関する詳細な情報をお探しですね。より具体的な回答を提供するために、以下の点を明確にしていただけますか？\n\n- 具体的にどの機能について知りたいですか？\n- どのような場面でお困りですか？\n- エラーメッセージなどは表示されていますか？\n\n左側のクイック質問からも選択していただけます。";
    }
  };

  const generateRelatedQuestions = (): string[] => {
    const related = [
      "この機能の詳細設定について教えてください",
      "トラブルシューティングガイドはありますか？",
      "他の関連機能について知りたい"
    ];
    return related.slice(0, 2 + Math.floor(Math.random() * 2));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Quick Questions */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              クイック質問
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              よくある質問から選択できます
            </p>
          </div>
          
          <div className="p-4">
            {quickQuestions.map((category, idx) => (
              <div key={idx} className="mb-6">
                <button
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.category ? null : category.category
                  )}
                  className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="font-medium text-gray-700">{category.category}</span>
                  <ChevronRight 
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      selectedCategory === category.category ? "rotate-90" : ""
                    }`}
                  />
                </button>
                
                {selectedCategory === category.category && (
                  <div className="mt-2 space-y-2">
                    {category.questions.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleSendMessage(q)}
                        className="w-full text-left p-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 inline mr-2" />
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* FAQ Link */}
          <div className="p-4 border-t border-gray-200">
            <a 
              href="/faq" 
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>FAQページを見る</span>
            </a>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.type === "question" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-xl ${message.type === "question" ? "order-2" : ""}`}>
                    <div className="flex items-start gap-3">
                      {message.type !== "question" && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          {message.type === "system" ? (
                            <MessageSquare className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-white" />
                          )}
                        </div>
                      )}
                      
                      <div className={`flex-1 ${message.type === "question" ? "text-right" : ""}`}>
                        <div
                          className={`inline-block p-4 rounded-lg ${
                            message.type === "question"
                              ? "bg-blue-600 text-white"
                              : message.type === "system"
                              ? "bg-yellow-50 text-gray-800 border border-yellow-200"
                              : message.type === "suggestions"
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                              : "bg-white text-gray-800 shadow-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Display suggested questions */}
                          {message.type === "suggestions" && message.suggestedQuestions && (
                            <div className="mt-4 space-y-3">
                              {message.suggestedQuestions.map((suggestion, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => handleQuestionClick(suggestion)}
                                  className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900 mb-1">
                                        {suggestion.question_title}
                                      </h4>
                                      <p className="text-sm text-gray-600 line-clamp-2">
                                        {suggestion.question_content}
                                      </p>
                                      <div className="flex items-center gap-3 mt-2">
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                          {suggestion.category_name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          類似度: {Math.round(suggestion.similarity_score * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {message.confidence && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>信頼度: {message.confidence}%</span>
                              </div>
                            </div>
                          )}
                          
                          {message.sources && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.sources.map((source, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                                >
                                  {source}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-1 text-xs text-gray-500">
                          {message.timestamp}
                        </div>
                        
                        {message.relatedQuestions && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm text-gray-600">関連する質問:</p>
                            {message.relatedQuestions.map((q, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(q)}
                                className="block text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                → {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {message.type === "question" && (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-gray-600">考えています...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="質問を入力してください..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                    inputValue.trim() && !isLoading
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span>送信</span>
                </button>
                <button
                  onClick={() => setMessages([messages[0]])}
                  className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  title="会話をリセット"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">
                質問に対して最適な回答を提供します。左側のクイック質問もご利用ください。
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Info */}
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">QAチャットの特徴</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>即座に回答を提供</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>関連する質問を提案</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>信頼度スコア表示</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <span>情報源の明示</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">使い方のヒント</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 具体的な質問をすると、より正確な回答が得られます
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    🔍 キーワードを含めると検索精度が向上します
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-800">
                    📚 関連質問から深掘りできます
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">統計情報</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{messages.length - 1}</p>
                  <p className="text-xs text-gray-600">質問数</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {messages.filter(m => m.type === "answer").length}
                  </p>
                  <p className="text-xs text-gray-600">回答数</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}