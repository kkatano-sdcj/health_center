"use client";

import React from "react";
import Link from "next/link";
import { Home as HomeIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Health Center</h1>
            </div>
            <div className="flex items-center space-x-8">
              <div className="flex space-x-4">
                <Link href="/aichat" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  AI Chat
                </Link>
                <Link href="/convert" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Convert
                </Link>
                <Link href="/storage" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Storage
                </Link>
                <Link href="/uploaded" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Uploaded
                </Link>
                <Link href="/rag" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  RAG Query
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 cursor-default" title="現在のページ">
                  <HomeIcon className="w-5 h-5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Health Center
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            AI-powered chat and document conversion tools
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Link href="/aichat" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold mb-2">AI Chat</h3>
                <p className="text-gray-600">
                  Intelligent chat interface with document understanding
                </p>
              </div>
            </Link>
            
            <Link href="/convert" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold mb-2">Document Converter</h3>
                <p className="text-gray-600">
                  Convert various document formats to Markdown
                </p>
              </div>
            </Link>
            
            <Link href="/storage" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold mb-2">Storage</h3>
                <p className="text-gray-600">
                  Browse and manage converted files
                </p>
              </div>
            </Link>
            
            <Link href="/uploaded" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold mb-2">Uploaded</h3>
                <p className="text-gray-600">
                  View and manage uploaded original files
                </p>
              </div>
            </Link>
            
            <Link href="/rag" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold mb-2">RAG Query</h3>
                <p className="text-gray-600">
                  Query vectorized documents with AI
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}