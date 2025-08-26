"use client";

import React from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { InfoPanel } from "@/components/sidebar/InfoPanel";
import { ChatContainer } from "@/components/chat/ChatContainer";

export default function AIChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <Navigation />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        <ChatContainer />
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