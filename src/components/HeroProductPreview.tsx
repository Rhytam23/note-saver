import React from 'react';
import { motion } from 'framer-motion';

export const HeroProductPreview: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl mx-auto mt-10 md:mt-14 px-2 sm:px-4"
    >
      <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Window Chrome / Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-950/80">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-400/80 inline-block" />
          </div>
          <div className="flex-1 max-w-md mx-4">
            <div className="flex items-center justify-center px-3 py-1 text-xs rounded-md bg-gray-200/50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-mono">
              <span className="mr-1.5 opacity-70">🔍</span> Search notes, tags, or ask Gemini AI...
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
            <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-mono text-[11px]">Synced</span>
          </div>
        </div>

        {/* Product Workspace Inner Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[360px] md:min-h-[440px] text-left text-sm">
          {/* Sidebar Mock (hidden on tiny screens) */}
          <div className="hidden md:block md:col-span-3 border-r border-gray-200/70 dark:border-gray-800/80 p-3 bg-gray-50/40 dark:bg-gray-950/40 space-y-4">
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <span>Workspace</span>
              <span className="text-accent">+ Note</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 px-2 py-1.5 rounded-lg bg-accent/10 text-accent font-medium">
                <span>📄</span>
                <span className="truncate">Product Roadmap 2.0</span>
              </div>
              <div className="flex items-center space-x-2 px-2 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                <span>⚡</span>
                <span className="truncate">CRDT Sync & Yjs</span>
              </div>
              <div className="flex items-center space-x-2 px-2 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                <span>📅</span>
                <span className="truncate">Sprint Planning</span>
              </div>
              <div className="flex items-center space-x-2 px-2 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                <span>📎</span>
                <span className="truncate">Attachments & PDF</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200/60 dark:border-gray-800/60">
              <div className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Tags</div>
              <div className="flex flex-wrap gap-1 px-1">
                <span className="px-2 py-0.5 text-[11px] rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">#architecture</span>
                <span className="px-2 py-0.5 text-[11px] rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">#gemini-ai</span>
                <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">#offline-first</span>
              </div>
            </div>
          </div>

          {/* Main Editor Canvas Mock */}
          <div className="col-span-1 md:col-span-6 lg:col-span-6 p-4 sm:p-6 space-y-4 bg-white/50 dark:bg-gray-900/50">
            <div className="space-y-1">
              <span className="inline-block px-2 py-0.5 text-[11px] font-mono rounded bg-accent/10 text-accent">P5 VERIFIED</span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">
                NoteNirman 2.0 Architectural Specification
              </h2>
            </div>

            {/* Block 1: Callout */}
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start space-x-2">
              <span className="text-base">💡</span>
              <div>
                <strong>Local-First Guarantee:</strong> Note.content HTML remains the canonical storage format in IndexedDB with zero block store dependencies.
              </div>
            </div>

            {/* Block 2: Task List */}
            <div className="space-y-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center space-x-2">
                <span className="text-accent font-bold">✓</span>
                <span className="line-through text-gray-400">Phase 1 Universal Block Editor Foundation</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-accent font-bold">✓</span>
                <span className="line-through text-gray-400">Phase 2 Yjs Realtime Collaboration & Awareness</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-accent font-bold">✓</span>
                <span className="line-through text-gray-400">Phase 4 Hybrid RAG & Vector Embeddings</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-accent font-bold">✓</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">Phase 5 Data Portability & Platform Adapters</span>
              </div>
            </div>

            {/* Block 3: Code Snippet */}
            <div className="p-3 rounded-lg bg-gray-950 text-gray-200 font-mono text-[11px] sm:text-xs overflow-x-auto border border-gray-800">
              <span className="text-purple-400">const</span> <span className="text-blue-300">knowledge</span> = <span className="text-yellow-300">await</span> hybridSearch.<span className="text-green-300">query</span>({'{'} query: <span className="text-emerald-400">'vector search'</span> {'}'});
            </div>
          </div>

          {/* AI Copilot Drawer Overlay peek (Right Column) */}
          <div className="hidden lg:block lg:col-span-3 border-l border-gray-200/70 dark:border-gray-800/80 p-3 bg-gray-50/60 dark:bg-gray-950/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-gray-800/60">
              <span className="font-semibold text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span>🤖</span> Gemini Copilot
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 shadow-sm space-y-1">
              <div className="font-medium text-gray-900 dark:text-gray-200">Context RAG Synthesis</div>
              <p>I analyzed your linked notes. NoteNirman handles offline edits locally and syncs optimistic changes when online.</p>
              <div className="pt-1 text-[10px] text-accent font-mono">Citations: [1] architecture.md</div>
            </div>

            <div className="mt-4 p-2 rounded-md bg-gray-200/50 dark:bg-gray-800/50 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Ask a follow-up...</span>
              <span className="text-xs">↵</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
