"use client";

import React from "react";

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 smooth-shadow">
        <div className="flex space-x-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                style={{ animationDelay: "0ms" }}></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                style={{ animationDelay: "200ms" }}></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                style={{ animationDelay: "400ms" }}></span>
        </div>
      </div>
    </div>
  );
};