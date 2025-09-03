"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Plus, Search, Calendar, Tag, Trash2, Edit3, Save, X, Pin, Star, FileText, MessageSquare, HelpCircle, Eye, Code, CheckSquare, Square, FileCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Note {
  id: string;
  note_id: string;
  note_type: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  category?: string;
  source_thread_id?: string;
  status: string;
  is_pinned: boolean;
  is_favorite: boolean;
  view_count: number;
  last_viewed_at?: string;
  created_at: string;
  updated_at: string;
}

const NOTE_TYPE_ICONS: Record<string, React.ReactNode> = {
  conversation_summary: <MessageSquare className="w-4 h-4" />,
  user_note: <FileText className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  faq: <HelpCircle className="w-4 h-4" />
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  conversation_summary: "会話要約",
  user_note: "ノート",
  document: "ドキュメント",
  faq: "FAQ"
};

export default function NotePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Load notes from API
  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType) params.append("note_type", selectedType);
      if (selectedTags.length > 0) params.append("tags", selectedTags.join(","));
      if (searchQuery) params.append("search", searchQuery);
      
      const response = await fetch(`http://localhost:8000/api/notes/notes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load notes on mount and when filters change
  useEffect(() => {
    loadNotes();
  }, [selectedType, selectedTags, searchQuery]);

  const createNewNote = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/notes/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "新しいノート",
          content: "",
          note_type: "user_note",
          tags: [],
        }),
      });
      
      if (response.ok) {
        const newNote = await response.json();
        setNotes([newNote, ...notes]);
        setSelectedNote(newNote);
        setEditingNote(newNote);
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const saveNote = async () => {
    if (!editingNote) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/notes/notes/${editingNote.note_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingNote.title,
          content: editingNote.content,
          tags: editingNote.tags,
        }),
      });
      
      if (response.ok) {
        const updatedNote = await response.json();
        setNotes(notes.map(note => 
          note.note_id === updatedNote.note_id ? updatedNote : note
        ));
        setSelectedNote(updatedNote);
        setIsEditing(false);
        setEditingNote(null);
        setShowPreview(false);
      }
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/notes/notes/${noteId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setNotes(notes.filter(note => note.note_id !== noteId));
        if (selectedNote?.note_id === noteId) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const togglePin = async (noteId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/notes/notes/${noteId}/pin`, {
        method: "POST",
      });
      
      if (response.ok) {
        await loadNotes();
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const toggleFavorite = async (noteId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/notes/notes/${noteId}/favorite`, {
        method: "POST",
      });
      
      if (response.ok) {
        await loadNotes();
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingNote(null);
    setShowPreview(false);
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setIsEditing(true);
    setShowPreview(false);
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const clearSelection = () => {
    setSelectedNoteIds([]);
  };

  const generateBusinessReport = async () => {
    if (selectedNoteIds.length === 0) {
      alert("レポートを生成するノートを選択してください。");
      return;
    }

    setIsGeneratingReport(true);
    try {
      const response = await fetch("http://localhost:8000/api/notes/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_ids: selectedNoteIds,
          title: `業務報告 ${new Date().toLocaleDateString("ja-JP")}`,
        }),
      });

      if (response.ok) {
        const report = await response.json();
        alert("業務報告が作成されました！");
        await loadNotes();
        setSelectedNoteIds([]);
        setSelectedNote(report);
      } else {
        alert("業務報告の生成に失敗しました。");
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("業務報告の生成に失敗しました。");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Markdown rendering function
  const renderMarkdownContent = (content: string) => {
    return (
      <div className="prose prose-slate max-w-none 
        prose-h1:text-3xl prose-h1:font-bold prose-h1:text-gray-900 prose-h1:mb-4 prose-h1:mt-6 prose-h1:pb-2 prose-h1:border-b prose-h1:border-gray-200
        prose-h2:text-2xl prose-h2:font-semibold prose-h2:text-gray-800 prose-h2:mb-3 prose-h2:mt-5 prose-h2:pb-1 prose-h2:border-b prose-h2:border-gray-100
        prose-h3:text-xl prose-h3:font-semibold prose-h3:text-gray-800 prose-h3:mb-2 prose-h3:mt-4
        prose-h4:text-lg prose-h4:font-semibold prose-h4:text-gray-700 prose-h4:mb-2 prose-h4:mt-3
        prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline hover:prose-a:text-blue-700
        prose-strong:font-semibold prose-strong:text-gray-900
        prose-em:italic prose-em:text-gray-700
        prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4 prose-ul:text-gray-700
        prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4 prose-ol:text-gray-700
        prose-li:mb-1 prose-li:leading-relaxed
        prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:mb-4 prose-blockquote:bg-blue-50 prose-blockquote:text-gray-700 prose-blockquote:italic
        prose-code:bg-gray-100 prose-code:text-pink-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:p-4 prose-pre:mb-4
        prose-pre:code:bg-transparent prose-pre:code:text-gray-100 prose-pre:code:p-0
        prose-table:w-full prose-table:mb-4
        prose-thead:bg-gray-50 prose-thead:border-b-2 prose-thead:border-gray-200
        prose-th:text-left prose-th:font-semibold prose-th:text-gray-900 prose-th:px-4 prose-th:py-2
        prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-gray-100
        prose-tr:hover:bg-gray-50
        prose-hr:border-gray-200 prose-hr:my-6
        prose-img:rounded-lg prose-img:shadow-md prose-img:my-4
      ">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({children}) => <h1 className="text-3xl font-bold text-gray-900 mb-4 mt-6 pb-2 border-b border-gray-200">{children}</h1>,
            h2: ({children}) => <h2 className="text-2xl font-semibold text-gray-800 mb-3 mt-5 pb-1 border-b border-gray-100">{children}</h2>,
            h3: ({children}) => <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">{children}</h3>,
            h4: ({children}) => <h4 className="text-lg font-semibold text-gray-700 mb-2 mt-3">{children}</h4>,
            p: ({children}) => <p className="text-gray-700 leading-relaxed mb-4">{children}</p>,
            ul: ({children}) => <ul className="list-disc ml-6 mb-4 text-gray-700 space-y-1">{children}</ul>,
            ol: ({children}) => <ol className="list-decimal ml-6 mb-4 text-gray-700 space-y-1">{children}</ol>,
            li: ({children}) => <li className="leading-relaxed">{children}</li>,
            blockquote: ({children}) => (
              <blockquote className="border-l-4 border-blue-400 pl-4 py-2 mb-4 bg-blue-50 text-gray-700 italic rounded-r">
                {children}
              </blockquote>
            ),
            code: ({children, ...props}: any) => {
              const inline = !props.className?.includes('language-');
              if (inline) {
                return <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
              }
              return (
                <code className="block bg-gray-900 text-gray-100 overflow-x-auto rounded-lg p-4 mb-4 font-mono text-sm" {...props}>
                  {children}
                </code>
              )
            },
            pre: ({children}) => <pre className="bg-gray-900 text-gray-100 overflow-x-auto rounded-lg p-4 mb-4">{children}</pre>,
            table: ({children}) => (
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse">{children}</table>
              </div>
            ),
            thead: ({children}) => <thead className="bg-gray-50 border-b-2 border-gray-200">{children}</thead>,
            tbody: ({children}) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
            tr: ({children}) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
            th: ({children}) => <th className="text-left font-semibold text-gray-900 px-4 py-2">{children}</th>,
            td: ({children}) => <td className="px-4 py-2 text-gray-700">{children}</td>,
            hr: () => <hr className="border-gray-200 my-6" />,
            a: ({href, children}) => (
              <a href={href} className="text-blue-600 no-underline hover:underline hover:text-blue-700" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
            em: ({children}) => <em className="italic text-gray-700">{children}</em>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  // Get all unique tags
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));

  // Note type filter options
  const noteTypes = ["conversation_summary", "user_note", "document", "faq"];

  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar - Note List */}
        <div className="w-80 bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={createNewNote}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>新しいノート</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ノートを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType("")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedType === ""
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                すべて
              </button>
              {noteTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                    selectedType === type
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {NOTE_TYPE_ICONS[type]}
                  {NOTE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                {allTags.slice(0, 5).map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
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

          {/* Business Report Button */}
          {selectedNoteIds.length > 0 && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-700">
                  {selectedNoteIds.length}件のノートを選択中
                </span>
                <button
                  onClick={clearSelection}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  選択解除
                </button>
              </div>
              <button
                onClick={generateBusinessReport}
                disabled={isGeneratingReport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                <FileCheck className="w-4 h-4" />
                <span>{isGeneratingReport ? "生成中..." : "選択したノートから業務報告する"}</span>
              </button>
            </div>
          )}

          {/* Note List */}
          <div className="overflow-y-auto" style={{ height: "calc(100% - 300px)" }}>
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">読み込み中...</div>
            ) : (
              notes.map(note => (
                <div
                  key={note.note_id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors relative ${
                    selectedNote?.note_id === note.note_id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start p-4">
                    <div className="flex items-center mr-3 mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNoteSelection(note.note_id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {selectedNoteIds.includes(note.note_id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setSelectedNote(note)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {note.is_pinned && <Pin className="w-3 h-3 text-blue-600" />}
                          {note.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-current" />}
                          {NOTE_TYPE_ICONS[note.note_type]}
                        </div>
                        <span className="text-xs text-gray-400">
                          {NOTE_TYPE_LABELS[note.note_type] || note.note_type}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1 truncate">{note.title}</h3>
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {note.summary || note.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {note.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              #{tag}
                            </span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className="px-2 py-1 text-xs text-gray-400">
                              +{note.tags.length - 2}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(note.updated_at).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content - Note Editor/Viewer */}
        <div className="flex-1 bg-gray-50">
          {selectedNote ? (
            <div className="h-full flex flex-col">
              {/* Note Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingNote?.title || ""}
                      onChange={(e) => setEditingNote(editingNote ? {...editingNote, title: e.target.value} : null)}
                      className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1 mr-4"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-gray-900">{selectedNote.title}</h1>
                  )}
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => togglePin(selectedNote.note_id)}
                          className={`p-2 rounded-lg transition-colors ${
                            selectedNote.is_pinned
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          <Pin className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleFavorite(selectedNote.note_id)}
                          className={`p-2 rounded-lg transition-colors ${
                            selectedNote.is_favorite
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          <Star className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveNote}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        {selectedNote.note_type === "user_note" && (
                          <button
                            onClick={() => startEdit(selectedNote)}
                            className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNote(selectedNote.note_id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    {NOTE_TYPE_ICONS[selectedNote.note_type]}
                    {NOTE_TYPE_LABELS[selectedNote.note_type] || selectedNote.note_type}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    作成: {new Date(selectedNote.created_at).toLocaleString("ja-JP")}
                  </span>
                  <span>
                    更新: {new Date(selectedNote.updated_at).toLocaleString("ja-JP")}
                  </span>
                  <span>
                    閲覧: {selectedNote.view_count}回
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white px-6 py-3 border-b border-gray-200">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={editingNote?.tags.join(", ") || ""}
                      onChange={(e) => setEditingNote(editingNote ? {
                        ...editingNote, 
                        tags: e.target.value.split(",").map(t => t.trim()).filter(t => t)
                      } : null)}
                      placeholder="タグをカンマ区切りで入力..."
                      className="flex-1 text-sm text-gray-700 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    {selectedNote.tags.length > 0 ? (
                      selectedNote.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">タグなし</span>
                    )}
                  </div>
                )}
              </div>

              {/* Edit Mode Toggle Bar */}
              {isEditing && (
                <div className="bg-gray-50 px-6 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPreview(false)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                          !showPreview 
                            ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        <Code className="w-4 h-4" />
                        編集
                      </button>
                      <button
                        onClick={() => setShowPreview(true)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                          showPreview 
                            ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        プレビュー
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Markdown記法が使えます
                    </div>
                  </div>
                </div>
              )}

              {/* Note Content */}
              <div className="flex-1 bg-white overflow-y-auto">
                {isEditing ? (
                  showPreview ? (
                    // Preview mode in editing
                    <div className="p-6">{renderMarkdownContent(editingNote?.content || "")}</div>
                  ) : (
                    // Edit mode
                    <div className="flex h-full">
                      <div className="flex-1 p-6">
                        <textarea
                          value={editingNote?.content || ""}
                          onChange={(e) => setEditingNote(editingNote ? {...editingNote, content: e.target.value} : null)}
                          className="w-full h-full text-gray-700 leading-relaxed resize-none focus:outline-none font-mono text-sm"
                          placeholder="# 見出し1&#10;## 見出し2&#10;&#10;**太字** *イタリック* `コード`&#10;&#10;- リスト項目&#10;- リスト項目&#10;&#10;1. 番号付きリスト&#10;2. 番号付きリスト&#10;&#10;> 引用&#10;&#10;```&#10;コードブロック&#10;```&#10;&#10;[リンク](URL)"
                          spellCheck={false}
                        />
                      </div>
                      {/* Markdown cheat sheet sidebar */}
                      <div className="w-64 p-4 bg-gray-50 border-l border-gray-200 overflow-y-auto">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Markdown記法</h3>
                        <div className="space-y-3 text-xs">
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">見出し</p>
                            <code className="block bg-white p-2 rounded border border-gray-200 font-mono">
                              # 見出し1<br/>
                              ## 見出し2<br/>
                              ### 見出し3
                            </code>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">強調</p>
                            <code className="block bg-white p-2 rounded border border-gray-200 font-mono">
                              **太字**<br/>
                              *イタリック*<br/>
                              `コード`
                            </code>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">リスト</p>
                            <code className="block bg-white p-2 rounded border border-gray-200 font-mono">
                              - 項目1<br/>
                              - 項目2<br/>
                              <br/>
                              1. 番号付き<br/>
                              2. 番号付き
                            </code>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">引用</p>
                            <code className="block bg-white p-2 rounded border border-gray-200 font-mono">
                              &gt; 引用文
                            </code>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">コードブロック</p>
                            <code className="block bg-white p-2 rounded border border-gray-200 font-mono">
                              ```python<br/>
                              def hello():<br/>
                              &nbsp;&nbsp;print("Hi")<br/>
                              ```
                            </code>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">リンク</p>
                            <code className="block bg-white p-2 rounded border border-gray-200 font-mono">
                              [テキスト](URL)
                            </code>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">テーブル</p>
                            <code className="block bg-white p-2 rounded border border-gray-200 font-mono text-xs">
                              | 列1 | 列2 |<br/>
                              |-----|-----|<br/>
                              | A   | B   |
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-6">
                    {renderMarkdownContent(selectedNote.content || "内容がありません")}
                    {selectedNote.source_thread_id && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          このノートはAI会話から生成されました
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit3 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">ノートが選択されていません</p>
                <button
                  onClick={createNewNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  新しいノートを作成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}