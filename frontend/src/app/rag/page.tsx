'use client';

import { useState, useCallback } from 'react';
import { Navigation } from '@/components/layout/Navigation';
import { Search, Send, FileText, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface Source {
  filename: string;
  chunk_index: number;
  similarity: number;
  excerpt: string;
}

interface RAGResponse {
  query: string;
  response: string;
  sources: Source[];
  context_used: number;
  timestamp: string;
}

export default function RAGPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useLLM, setUseLLM] = useState(true);
  const [numResults, setNumResults] = useState(5);
  const [showSources, setShowSources] = useState(true);

  const handleQuery = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('http://localhost:8000/api/v1/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          n_results: numResults,
          use_llm: useLLM,
          return_sources: showSources,
        }),
      });

      if (!res.ok) {
        throw new Error(`Query failed: ${res.statusText}`);
      }

      const data: RAGResponse = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('RAG query error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [query, numResults, useLLM, showSources]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-secondary" />
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">RAG Query Interface</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Ask questions about your vectorized documents
        </p>
      </div>

      {/* Query Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <h3 className="font-semibold mb-3">Query Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useLLM}
              onChange={(e) => setUseLLM(e.target.checked)}
              className="rounded text-primary"
            />
            <span>Use AI Response</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showSources}
              onChange={(e) => setShowSources(e.target.checked)}
              className="rounded text-primary"
            />
            <span>Show Sources</span>
          </label>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="numResults">Results:</label>
            <select
              id="numResults"
              value={numResults}
              onChange={(e) => setNumResults(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            >
              {[3, 5, 10, 15, 20].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Query Input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documents..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            rows={3}
          />
        </div>
        <button
          onClick={handleQuery}
          disabled={loading || !query.trim()}
          className="mt-4 bg-gradient-to-r from-primary to-secondary text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Query
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="space-y-6">
          {/* Main Response */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              Response
            </h3>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{response.response}</p>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Context from {response.context_used} document chunks
            </div>
          </div>

          {/* Sources */}
          {showSources && response.sources && response.sources.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Sources
              </h3>
              <div className="space-y-4">
                {response.sources.map((source, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {source.filename}
                      </span>
                      <span className="text-xs bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 px-2 py-1 rounded-lg">
                        {(source.similarity * 100).toFixed(1)}% match
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {source.excerpt}
                    </p>
                    <div className="text-xs text-gray-500 mt-1">
                      Chunk #{source.chunk_index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}