# NoteNirman 2.0 — Enterprise-Grade Cross-Platform Knowledge Ecosystem 🪔

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20pgvector-green)](https://supabase.com/)

NoteNirman 2.0 is an enterprise-grade, offline-first, local-first knowledge management application designed for seamless block editing, realtime CRDT collaboration, multimodal intelligence, hybrid vector search, and multi-format data portability across Web/PWA, Tauri Desktop, and Capacitor Android.

---

## 🌟 Core Capabilities

### 1. Universal Block Editor & Structured Document Model (Phase 1)
* **Canonical Storage**: `Note.content` HTML string remains the sole durable persisted format stored in local IndexedDB.
* **Block AST**: Working in-memory `BlockDocument` AST with stable block UUIDs (`data-block-id="blk_..."`) preserved across edit cycles.
* **Editing Mechanics**: TipTap-powered rich block editing, slash menu (`/`), block nesting, drag-and-drop reordering, task lists, and code blocks.

### 2. Realtime CRDT Collaboration Foundation (Phase 2)
* **CRDT Document Binding**: Yjs Y.Doc integration (`yjsBlockAdapter.ts`) synchronizing structured blocks across collaborative clients.
* **Realtime Presence & Awareness**: User cursors, awareness state, discussion threads, block-anchored comments, and snapshot history.

### 3. Rich Capture & Multimodal Pipeline (Phase 3)
* **Media & Attachments**: Deduplicated content-hashed (SHA-256) attachment storage (`attachmentStorage.ts`) with cloud sync mirroring.
* **Multimodal Extraction**: PDF text extraction (`pdfPipeline.ts`), Tesseract OCR for images (`imageOcrPipeline.ts`), audio recording and transcription (`audioRecorder.ts`, `transcriptionService.ts`), canvas-based handwriting (`handwritingService.ts`), and web clipping (`webClipper.ts`).
* **Asynchronous Job Queue**: Off-main-thread background processing via `processingJobQueue.ts`.

### 4. Search, Hybrid RAG & Gemini Copilot (Phase 4)
* **Off-Main-Thread Lexical Search**: IndexedDB Web Worker (`search.worker.ts`) providing sub-10ms BM25-style lexical search.
* **Vector Search & Hybrid Retrieval**: Remote Supabase `pgvector(768)` embedding storage with Reciprocal Rank Fusion (RRF) hybrid retrieval combining lexical and semantic results.
* **Gemini Copilot & Strict Citations**: RAG pipeline with 4096-token context budgeting, strict citation validation (`citationValidator.ts`), and `CopilotDrawer` UI.

### 5. Platform Productization & Data Portability (Phase 5)
* **Data Portability Core**: Pure `PortabilityAST` serialization contracts converting `Note.content` HTML ↔ AST ↔ `PortabilityAST`.
* **Full Workspace Backup & Recovery**: Full-fidelity `.nnpackage` (ZIP container) workspace backup and restoration with Yjs binary update blobs, attachments, and calendar events.
* **Multi-Format Import & Export**: Import from Markdown, HTML, Plain Text, and CSV; export to Markdown, HTML, JSON, and PDF (`exportService.ts` via `jsPDF`).
* **Schema Migration & Recovery**: `migrationManager.ts` featuring pre-migration storage quota checks ($\ge 2.5\times$ safety multiplier) and recoverable pre-migration data snapshots.
* **Calendar & Temporal Core**: `calendarEventService.ts` providing authoritative events/reminders synced via `syncEngine.ts` (`SyncEntity = 'calendar_event'`) with RFC 5545 recurrence rules.
* **Platform Adapters**: Cross-platform adapter abstraction (`IStorageAdapter`, `INotificationAdapter`, `IFilesystemAdapter`) supporting Web/PWA, Tauri 2 Desktop, and Capacitor 8 Android.
* **Three-Tier Preference System**: `settingsService.ts` resolving preferences obeying `Device-Local > Workspace-Level > Account-Level` hierarchy.
* **Security & Cryptography**: `securitySanitizer.ts` (DOMPurify HTML sanitization & Zip Bomb defense) and `cryptoService.ts` (Web Crypto AES-256-GCM backup encryption).

---

## 🏗️ System Architecture & Invariants

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        NoteNirman 2.0 Architecture                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Canonical Storage: Note.content HTML in IndexedDB ('notenirman-offline')│
│ 2. Single Sync Authority: syncEngine.ts & localDb.ts syncQueue          │
│ 3. Collaboration Boundary: Yjs CRDT Y.Doc state updates                │
│ 4. AI Security Boundary: Supabase Edge Functions (gemini-embed/copilot)│
│    * Gemini API Keys remain 100% server-side in Edge Function secrets. │
└────────────────────────────────────────────────────────────────────────┘
```

1. **`Note.content` Canonicality**: `Note.content` HTML remains the sole durable canonical note representation stored in IndexedDB. There is **NO** IndexedDB `blocks` store or separate block database table.
2. **Single Sync Authority**: `syncEngine.ts` and `localDb.ts` `syncQueue` remain the **SOLE** synchronization authority. No secondary sync engine or duplicate sync queue exists.
3. **Local-First Storage**: Authoritative storage is local IndexedDB (`notenirman-offline`, `notenirman-attachments`, `notenirman-lexical-index`). Remote Supabase PostgreSQL mirrors local state.

---

## 💻 Platform Support

| Platform | Target Runtime | Implementation Status | Storage / Notification Capabilities |
| :--- | :--- | :--- | :--- |
| **Web / PWA** | Modern Browsers (Chrome, Firefox, Safari, Edge) | **Fully Functional** | IndexedDB local storage; Web Notification API & active-tab `setTimeout` scheduling. |
| **Tauri Desktop** | Windows 10/11 Desktop (`src-tauri`) | **Functional Adapter Abstraction** | Dynamic `@tauri-apps/plugin-fs` & `@tauri-apps/plugin-notification` with Web API fallbacks. |
| **Capacitor Mobile** | Android 8+ App (`android/`) | **Functional Adapter Abstraction** | Dynamic `@capacitor/filesystem`, `@capacitor/local-notifications`, and `@capacitor/preferences` with Web fallbacks. |

---

## 🔒 Security Architecture

* **Server-Side AI Secrets**: Google Gemini API key is stored exclusively in Supabase Edge Function secrets (`GEMINI_API_KEY`) and is **NEVER** exposed to client-side JavaScript.
* **Row Level Security (RLS)**: Supabase PostgreSQL tables (`notes`, `tags`, `attachments`, `calendar_events`, `workspace_settings`, `note_embeddings`) are isolated per user via strict `auth.uid() = user_id` RLS policies.
* **Import Sanitization**: `securitySanitizer.ts` strips dangerous tags (`<script>`, `<iframe>`, `onclick`) via DOMPurify, enforces path traversal shields (`../` stripping), and limits Zip Bomb compression ratios ($100:1$ max ratio, $500\text{ MB}$ max uncompressed limit).
* **Backup Encryption**: `cryptoService.ts` provides optional Web Crypto AES-256-GCM encryption with PBKDF2 key derivation ($100,000$ iterations, $16\text{B}$ salt, $12\text{B}$ IV).

---

## 🚀 Getting Started & Development Commands

### Prerequisites
* **Node.js** (v18+ or v20+)
* **npm** (v9+)
* **Supabase CLI** (for local Edge Functions / migrations)

### Installation
```bash
git clone https://github.com/Rhytam23/note-saver.git
cd note-saver
npm install
```

### Environment Configuration
Create a `.env` file in the root directory (do **NOT** commit this file):
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Available Package Scripts
```bash
# Start local Vite development server
npm run dev

# Run TypeScript type checking
npx tsc --noEmit

# Run ESLint check
npm run lint

# Run Vitest test suite (331 tests across 43 test files)
npm test

# Build production bundle
npm run build
```

---

## 📂 Project Structure

```text
note-nirman/
├── src/
│   ├── collaboration/         # Phase 2 Yjs CRDT collaboration & comment services
│   ├── components/            # React UI components (UniversalBlockEditor, CopilotDrawer, NoteListVirtual, etc.)
│   ├── config/                # Feature flags (featureFlags.ts)
│   ├── contexts/              # React context providers (AuthContext, ThemeContext, SeasonalContext)
│   ├── extensions/            # TipTap editor extensions (SlashCommand, Callout, EmojiSuggestion)
│   ├── hooks/                 # React hooks (useAuth, useNotes, useConnectivity)
│   ├── services/              # Core application services & business logic
│   │   ├── platform/          # Cross-platform adapters (webAdapter, tauriAdapter, capacitorAdapter)
│   │   ├── __tests__/         # Comprehensive Vitest test suite (43 test files, 331 tests)
│   │   ├── backupEngine.ts    # P5.2 Workspace backup (.nnpackage)
│   │   ├── calendarEventService.ts # P5.6 Calendar & temporal metadata
│   │   ├── exportPipeline.ts  # P5.4 Export pipeline (MD, HTML, JSON, PDF)
│   │   ├── importPipeline.ts  # P5.3 Import pipeline (MD, HTML, TXT, CSV)
│   │   ├── localDb.ts         # IndexedDB storage authority (notenirman-offline)
│   │   ├── migrationManager.ts# P5.5 Schema versioning & pre-migration data recovery
│   │   ├── portabilityCore.ts # P5.1 Data portability AST contracts
│   │   ├── quotaManager.ts    # P5.11 Storage quota manager
│   │   ├── securitySanitizer.ts # P5.12 Security & Zip Bomb defense
│   │   ├── settingsService.ts # P5.9 Three-tier settings system
│   │   └── syncEngine.ts      # Offline-first sync authority
│   ├── types/                 # TypeScript interfaces and domain models
│   └── workers/               # Off-main-thread Web Workers (search.worker, export.worker)
├── supabase/
│   ├── functions/             # Deno Edge Functions (gemini-embed, gemini-copilot, gemini-proxy)
│   └── migrations/            # Supabase SQL migrations (RLS, attachments, pgvector search)
└── src-tauri/                 # Tauri 2 desktop native configuration
```

---

## 📊 Testing Status

The application features a comprehensive Vitest test suite:
- **Test Files**: 43 passed
- **Total Tests**: 331 passed
- **Type Checking**: 0 TypeScript errors (`npx tsc --noEmit`)
- **Linting**: 0 ESLint errors (`npm run lint`)

---

## 📌 Deployment Status & Known Limitations

- **Roadmap Status**: Phases P0, P1, P2, P3, P4, and P5 are fully implemented locally and verified (`PHASE 5 VERIFIED`).
- **Phase 4 Live Supabase Deployment Status**: Live Supabase/Gemini deployment verification is currently **DEFERRED** pending development environment Supabase CLI authentication. Local vector search, pgvector migration files, Edge Functions, and mock tests pass 100%.
- **Web Background Notifications**: Web/PWA notification scheduling relies on an active browser tab (`setTimeout`). Native OS background scheduling is supported on mobile via Capacitor (`@capacitor/local-notifications`) or desktop via Tauri.
