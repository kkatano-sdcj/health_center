"use client";

import React, { useState } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { InfoPanel } from "@/components/sidebar/InfoPanel";
import { ChatContainer } from "@/components/chat/ChatContainer";

export default function AIChatPage() {
  const [useDatabase, setUseDatabase] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();

  const handleDatabaseToggle = (value: boolean) => {
    setUseDatabase(value);
    if (value) {
      setUseWebSearch(false);
    }
  };

  const handleWebSearchToggle = (value: boolean) => {
    setUseWebSearch(value);
    if (value) {
      setUseDatabase(false);
    }
  };

  const handleThreadSelect = (threadId: string) => {
    setCurrentThreadId(threadId);
  };

  const handleNewThread = async () => {
    try {
      const response = await fetch('/api/aichat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentThreadId(data.thread_id || data.id);
        // Refresh threads list
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleDeleteThread = (threadId: string) => {
    if (currentThreadId === threadId) {
      setCurrentThreadId(undefined);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar 
          useDatabase={useDatabase}
          useWebSearch={useWebSearch}
          onUseDatabaseChange={handleDatabaseToggle}
          onUseWebSearchChange={handleWebSearchToggle}
          currentThreadId={currentThreadId}
          onThreadSelect={handleThreadSelect}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
        />
        <ChatContainer 
          useDatabase={useDatabase}
          useWebSearch={useWebSearch}
          threadId={currentThreadId}
          onThreadIdChange={setCurrentThreadId}
        />
        <InfoPanel 
          selectedFile={{
            name: "製品仕様書_v2.3.pdf",
            size: "2.4 MB",
            lastUpdatedBy: "佐藤 花子",
            viewCount: 1234,
            isLatest: true,
          }}
        />
      </div>
    </div>
  );
}