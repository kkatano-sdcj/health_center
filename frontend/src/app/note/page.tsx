"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Plus, Search, Calendar, Tag, Trash2, Edit3, Save, X, Pin, Star, FileText, MessageSquare, HelpCircle } from "lucide-react";

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
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setIsEditing(true);
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

          {/* Note List */}
          <div className="overflow-y-auto" style={{ height: "calc(100% - 300px)" }}>
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">読み込み中...</div>
            ) : (
              notes.map(note => (
                <div
                  key={note.note_id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors relative ${
                    selectedNote?.note_id === note.note_id ? "bg-blue-50" : ""
                  }`}
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

              {/* Note Content */}
              <div className="flex-1 bg-white p-6 overflow-y-auto">
                {isEditing ? (
                  <textarea
                    value={editingNote?.content || ""}
                    onChange={(e) => setEditingNote(editingNote ? {...editingNote, content: e.target.value} : null)}
                    className="w-full h-full text-gray-700 leading-relaxed resize-none focus:outline-none"
                    placeholder="ノートの内容を入力..."
                  />
                ) : (
                  <div className="prose max-w-none">
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedNote.content || "内容がありません"}
                    </div>
                    {selectedNote.source_thread_id && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
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