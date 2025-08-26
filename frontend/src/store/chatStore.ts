import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface Document {
  id: string;
  title: string;
  type: "pdf" | "doc" | "txt";
  updatedAt: string;
  content?: string;
  url?: string;
}

export interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
  documents?: Document[];
  metadata?: {
    relatedDocsCount?: number;
    confidence?: number;
  };
}

export interface SearchHistory {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}

interface ChatState {
  messages: Message[];
  searchHistory: SearchHistory[];
  isTyping: boolean;
  currentQuery: string;
  selectedDocument: Document | null;
  
  // Actions
  addMessage: (message: Message) => void;
  setTyping: (isTyping: boolean) => void;
  setCurrentQuery: (query: string) => void;
  addSearchHistory: (history: SearchHistory) => void;
  clearMessages: () => void;
  setSelectedDocument: (document: Document | null) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      messages: [],
      searchHistory: [],
      isTyping: false,
      currentQuery: "",
      selectedDocument: null,

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setTyping: (isTyping) =>
        set(() => ({
          isTyping,
        })),

      setCurrentQuery: (query) =>
        set(() => ({
          currentQuery: query,
        })),

      addSearchHistory: (history) =>
        set((state) => ({
          searchHistory: [history, ...state.searchHistory].slice(0, 50), // Keep last 50 items
        })),

      clearMessages: () =>
        set(() => ({
          messages: [],
        })),

      setSelectedDocument: (document) =>
        set(() => ({
          selectedDocument: document,
        })),
    }),
    {
      name: "chat-store",
    }
  )
);