"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Plus, Search, Calendar, Tag, Trash2, Edit3, Save, X } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function NotePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("notes");
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "新しいノート",
      content: "",
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setEditingNote(newNote);
    setIsEditing(true);
  };

  const saveNote = () => {
    if (!editingNote) return;
    
    const updatedNotes = notes.map(note => 
      note.id === editingNote.id 
        ? { ...editingNote, updatedAt: new Date().toISOString() }
        : note
    );
    setNotes(updatedNotes);
    setSelectedNote(editingNote);
    setIsEditing(false);
    setEditingNote(null);
  };

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
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

  // Filter notes based on search and tags
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                        selectedTags.some(tag => note.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)));

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

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="p-4 border-b border-gray-200">
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
          <div className="overflow-y-auto" style={{ height: "calc(100% - 200px)" }}>
            {filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedNote?.id === note.id ? "bg-blue-50" : ""
                }`}
              >
                <h3 className="font-medium text-gray-900 mb-1 truncate">{note.title}</h3>
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">{note.content}</p>
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
                    {new Date(note.updatedAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>
            ))}
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
                        <button
                          onClick={() => startEdit(selectedNote)}
                          className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteNote(selectedNote.id)}
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
                    <Calendar className="w-4 h-4" />
                    作成: {new Date(selectedNote.createdAt).toLocaleString("ja-JP")}
                  </span>
                  <span>
                    更新: {new Date(selectedNote.updatedAt).toLocaleString("ja-JP")}
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
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedNote.content || "内容がありません"}
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