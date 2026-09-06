import React, { useState, useEffect } from 'react';
import { ragPipeline, RagContextBundle } from '../services/ragPipeline';
import { geminiCopilotAdapter } from '../services/geminiAdapter';
import { citationValidator } from '../services/citationValidator';
import { CitationReference } from '../types/search';

export interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeNoteId?: string;
  activeNoteTitle?: string;
  activeNoteContent?: string;
  selectedBlockText?: string;
  onNavigateToSource?: (noteId: string, blockId?: string, attachmentId?: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  citations?: CitationReference[];
  contextBundle?: RagContextBundle;
  error?: string;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  activeNoteId,
  activeNoteTitle,
  selectedBlockText,
  onNavigateToSource,
}) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string, actionType: 'summarize' | 'explain' | 'rewrite' | 'actions' | 'outline' | 'qna' = 'qna') => {
    const promptText = (customPrompt || query).trim();
    if (!promptText || isLoading || isOffline) return;

    const userMsgId = `usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: promptText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setQuery('');
    setIsLoading(true);

    try {
      // 1. RAG Retrieval & Context Budgeting
      const bundle = await ragPipeline.buildRagContext(promptText, {
        activeNoteId,
        activeNoteTitle,
        maxResults: 15,
      });

      const taskTypeMap: Record<string, 'summarize' | 'explain' | 'rewrite' | 'action_items' | 'outline' | 'rag_qa'> = {
        summarize: 'summarize',
        explain: 'explain',
        rewrite: 'rewrite',
        actions: 'action_items',
        outline: 'outline',
        qna: 'rag_qa',
      };

      // 2. Call Gemini Copilot Edge Function
      const copilotRes = await geminiCopilotAdapter.generateCompletion({
        prompt: promptText,
        taskType: taskTypeMap[actionType] || 'rag_qa',
        contextItems: bundle.contextItems,
      });

      if (copilotRes.error) {
        setMessages(prev => [
          ...prev,
          {
            id: `ast_${Date.now()}`,
            sender: 'assistant',
            text: `Error: ${copilotRes.error}`,
            timestamp: Date.now(),
            error: copilotRes.error,
          },
        ]);
        setIsLoading(false);
        return;
      }

      // 3. Strict Citation Validation
      const rawText = copilotRes.text || 'No response generated.';
      const { validCitations } = await citationValidator.validateCitations(rawText, bundle.contextItems);

      setMessages(prev => [
        ...prev,
        {
          id: `ast_${Date.now()}`,
          sender: 'assistant',
          text: rawText,
          timestamp: Date.now(),
          citations: validCitations,
          contextBundle: bundle,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `ast_${Date.now()}`,
          sender: 'assistant',
          text: 'Failed to process AI request. Please verify network connectivity.',
          timestamp: Date.now(),
          error: err?.message || 'Network error',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTextWithCitations = (msg: ChatMessage) => {
    if (!msg.citations || msg.citations.length === 0) {
      return <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>;
    }

    // Replace [Ref 1] or [1] with interactive pills
    const parts = msg.text.split(/(\[(?:Ref\s*)?\d+\])/g);
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {parts.map((part, idx) => {
          const match = part.match(/\[(?:Ref\s*)?(\d+)\]/i);
          if (match) {
            const refId = parseInt(match[1], 10);
            const cit = msg.citations?.find(c => c.refId === refId);
            if (cit) {
              return (
                <span key={idx} className="relative inline-block mx-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToSource) {
                        onNavigateToSource(cit.source.noteId, cit.source.blockId, cit.source.attachmentId);
                      }
                    }}
                    onMouseEnter={() => setActiveTooltip(`${msg.id}_${refId}`)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-800/60 transition-colors cursor-pointer"
                  >
                    [{refId}]
                  </button>
                  {activeTooltip === `${msg.id}_${refId}` && (
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded shadow-xl border border-gray-700 z-50 pointer-events-none">
                      <span className="font-bold block text-blue-400 mb-0.5">{cit.source.noteTitle}</span>
                      <span className="line-clamp-3 text-gray-300">{cit.source.snippetText}</span>
                    </span>
                  )}
                </span>
              );
            }
          }
          return <span key={idx}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">NoteNirman AI Copilot</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close Copilot Drawer"
        >
          ✕
        </button>
      </div>

      {/* Offline Status Banner */}
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <span>Offline Mode — Gemini Copilot is unavailable offline.</span>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/30 dark:bg-gray-800/20 flex flex-wrap gap-1.5">
        <button
          disabled={isOffline || isLoading}
          onClick={() => handleSend('Summarize the current note', 'summarize')}
          className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors disabled:opacity-50"
        >
          ✨ Summarize Note
        </button>
        {selectedBlockText && (
          <>
            <button
              disabled={isOffline || isLoading}
              onClick={() => handleSend(`Explain: "${selectedBlockText}"`, 'explain')}
              className="text-xs px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors disabled:opacity-50"
            >
              🔍 Explain Selection
            </button>
            <button
              disabled={isOffline || isLoading}
              onClick={() => handleSend(`Rewrite cleanly: "${selectedBlockText}"`, 'rewrite')}
              className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors disabled:opacity-50"
            >
              ✍️ Rewrite Selection
            </button>
          </>
        )}
        <button
          disabled={isOffline || isLoading}
          onClick={() => handleSend('Extract key action items', 'actions')}
          className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors disabled:opacity-50"
        >
          📋 Action Items
        </button>
        <button
          disabled={isOffline || isLoading}
          onClick={() => handleSend('Generate structured outline', 'outline')}
          className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50"
        >
          📌 Generate Outline
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 px-4 text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 mx-auto mb-3 flex items-center justify-center text-xl">
              🤖
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">How can NoteNirman Copilot help?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ask questions about your notes, request summaries, or run workspace RAG queries with verified citations.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : msg.error
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 rounded-bl-none'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200/60 dark:border-gray-700/60'
                }`}
              >
                {renderTextWithCitations(msg)}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 p-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
            <span className="ml-1 font-medium">Retrieving workspace context & querying Gemini...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={isOffline ? 'Offline mode...' : 'Ask Copilot about notes or workspace...'}
            disabled={isOffline || isLoading}
            className="flex-1 px-3.5 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!query.trim() || isOffline || isLoading}
            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            aria-label="Send query to Copilot"
          >
            ➔
          </button>
        </form>
      </div>
    </div>
  );
};
