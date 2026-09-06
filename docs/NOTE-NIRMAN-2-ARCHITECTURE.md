# NoteNirman 2.0 — Architecture & Technical Audit

## Executive Summary

NoteNirman 2.0 represents an evolution of the NoteNirman knowledge application from a single-document text editor with basic cloud synchronization into a **connected, offline-first, intelligent knowledge system**. 

This document serves as the authoritative architectural blueprint for NoteNirman 2.0, detailing existing system topology, data flows, operational boundaries, security models, technical debt, and target evolution strategies.

---

## 1. Existing System Architecture (v0.1.0 Audit)

```text
                                +--------------------------------+
                                |      Web / Desktop / Mobile    |
                                +--------------------------------+
                                                |
                                      [ React 19 / Vite ]
                                                |
                     +--------------------------+--------------------------+
                     |                          |                          |
             [ State & Hooks ]          [ TipTap Editor ]           [ Auth Context ]
                     |                          |                          |
                     v                          v                          v
             useNotes Hook              HTML Content (String)        Supabase Auth (JWT)
                     |                          |
                     +--------------------------+
                                                |
                                       [ Local DB Engine ]
                                  IndexedDB (idb v8: notenirman-offline)
                                     - notes (by-user index)
                                     - tags (by-user index)
                                     - syncQueue (operation log)
                                                |
                                      [ Sync Engine Loop ]
                                  - Optimistic version check
                                  - Backoff retry queue
                                                |
                     +--------------------------+--------------------------+
                     |                                                     |
             [ Supabase PostgreSQL ]                              [ Supabase Edge Proxy ]
             - RLS Policies (auth.uid())                          - Rate Limit (Upstash Redis)
             - Version Bump Triggers                             - Gemini 2.5 Flash Proxy
```

### 1.1 Core Technology Stack
- **Frontend Core**: React 19.2.0, TypeScript 5.8.2, Vite 6.2.0, Tailwind CSS 3.4.1, Framer Motion 12.23.24.
- **Rich Text Editor**: TipTap 3.14.0 (StarterKit, Placeholder, TaskList, TaskItem, custom Callout, SlashCommand, EmojiSuggestion extensions).
- **Local Storage Engine**: IndexedDB via `idb` 8.0.3 (`notenirman-offline` database v1).
- **Cloud Persistence & Auth**: Supabase JS v2.105.1, PostgreSQL with RLS, Supabase Auth.
- **AI Acceleration Engine**: Supabase Edge Function (`gemini-proxy`), Deno HTTP Server, Upstash Redis Rate Limiting (5 requests/min sliding window), Gemini 2.5 Flash API.
- **Cross-Platform Delivery**:
  - **Web**: Progressive Web Application build output.
  - **Desktop**: Tauri 2.11 (Rust backend wrapper targeting Windows NSIS/MSI).
  - **Mobile**: Capacitor 8.3 (Android native wrapper).

---

## 2. Note & Synchronization Lifecycle

### 2.1 Data Models (v1)
```typescript
interface SyncMeta {
  version?: number;
  syncStatus?: 'synced' | 'pending' | 'syncing' | 'failed' | 'conflict';
  deleted?: boolean;
  deletedAt?: string | null;
  conflictServerData?: Record<string, any> | null;
}

interface Note extends SyncMeta {
  id: string;
  title: string;
  content: string; // HTML string output from TipTap
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  priority: 'high' | 'medium' | 'low' | 'none';
  coverImage?: string;
}
```

### 2.2 Local Write Lifecycle
1. **User Edit**: User types in `NoteEditor` (TipTap instance).
2. **Debounced Auto-Save**: Changes trigger `writeNote(userId, note, 'upsert')` in `syncEngine.ts` after 1 second.
3. **IndexedDB Commit**: `putLocalNote` updates the local record with `syncStatus: 'pending'`.
4. **Queue Enqueue**: `enqueueOp` records a `SyncOp` in the `syncQueue` store.
5. **UI Notification**: `subscribeLocalChanges` fires, notifying UI components to re-render local state instantaneously.

### 2.3 Cloud Synchronization Lifecycle
1. **Connectivity Detection**: `subscribeConnectivity` monitors browser online/offline status.
2. **Queue Processing**: `processSyncQueue(userId)` fetches non-expired operations sorted by `createdAt`.
3. **Optimistic Version Check**:
   - Queries server for existing row version (`SELECT version FROM notes WHERE id = ?`).
   - If `serverVersion > op.baseVersion`, flags local note as `syncStatus: 'conflict'` and retains server snapshot for user resolution.
   - If version matches, issues `upsert` with `version = serverVersion + 1`.
4. **Server Trigger**: PostgreSQL trigger `notes_bump_version` updates `updated_at = now()` and `version = OLD.version + 1`.
5. **Local Acknowledgment**: Queue item deleted, local note updated with `syncStatus: 'synced'`.

---

## 3. Security Model

1. **API Key Isolation**: Gemini API Key (`GEMINI_API_KEY`) is stored exclusively in Supabase Edge Function environment variables and NEVER bundled into Vite/client apps.
2. **Authentication & Authorization**:
   - Supabase Auth manages user JWTs.
   - Database level: PostgreSQL Row Level Security (RLS) policies restrict all `SELECT`, `INSERT`, `UPDATE`, `DELETE` operations strictly to `auth.uid() = user_id`.
   - Proxy level: `gemini-proxy` validates incoming `Authorization: Bearer <JWT>` against `supabaseClient.auth.getUser()` before processing AI requests.
3. **Rate Limiting**: Upstash Redis sliding-window algorithm limits users to 5 AI requests per minute to prevent token abuse and Denial of Service.
4. **CORS Restrictions**: `gemini-proxy` enforces strict origin whitelist matching Vercel, localhost (3000, 5173), Tauri (`tauri://localhost`, `http://tauri.localhost`), and Capacitor (`capacitor://localhost`).

---

## 4. Technical Debt & Current Limitations

| Area | Current Limitation | Impact on 2.0 Requirements |
| :--- | :--- | :--- |
| **Editor Data Architecture** | Content stored as unstructured HTML strings | Prevents block-level ID tracking, granular indexing, block drag-and-drop, block tasks, and graph node mapping. |
| **Entity Identification** | Notes depend heavily on titles for referencing | Cannot reliably perform WikiLink (`[[Note Name]]`) resolution when titles change. |
| **Conflict Resolution** | Entire-note optimistic locking with manual conflict dialog | Multi-device edits overwrite or create duplicate notes rather than seamlessly merging concurrent edits. |
| **Database & Schema Rigidity** | Fixed `Note` & `Tag` entities | Cannot represent inline databases, visual canvas nodes, audio transcripts, or PDF highlights as unified knowledge objects. |
| **Testing Infrastructure** | Zero automated tests (no Vitest, RTL, or Playwright setup) | Risk of regression during major architectural upgrades. |

---

## 5. NoteNirman 2.0 Target Architecture

```text
                                 NoteNirman 2.0 Architecture
                                              |
        +-------------------------------------+-------------------------------------+
        |                                     |                                     |
      Editor                              Knowledge                                 AI
        |                                     |                                     |
  - Block Model (JSON)                  - Stable UUID Entities                 - Context Proxy
  - Multi-type Blocks                   - WikiLinks [[Note]]                   - Hybrid RAG Vector Search
  - Drag & Drop / Slash Menu            - Graph Visualization                  - Autonomous AI Agents
  - TipTap Block Extensions             - Infinite Canvas                      - PDF & Audio Pipeline
        |                                     |                                     |
        +-------------------------------------+-------------------------------------+
                                              |
                                     Local-First Core
                                              |
                              IndexedDB (Universal Storage)
                                              |
                                      CRDT Engine (Yjs)
                                              |
                                   Sync Engine (Delta Sync)
                                              |
                                        Supabase Cloud
                                              |
                        +---------------------+---------------------+
                        |                     |                     |
                      Auth                 Storage               Realtime
                        |                     |                     |
                        +---------------------+---------------------+
                                              |
                                    Cross-Platform Layer
                                              |
                             Web / Windows (Tauri) / Android (Capacitor)
```

### 5.1 Universal Block Data Model (Target)
```typescript
export type BlockType =
  | 'paragraph' | 'heading' | 'quote' | 'callout'
  | 'bulletList' | 'numberedList' | 'checklist' | 'task'
  | 'code' | 'table' | 'image' | 'video' | 'audio' | 'file'
  | 'pdf' | 'math' | 'diagram' | 'bookmark' | 'embed'
  | 'database' | 'ai' | 'divider' | 'toggle';

export interface BlockProperties {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  language?: string;
  checked?: boolean;
  status?: string;
  priority?: 'high' | 'medium' | 'low' | 'none';
  dueDate?: string | null;
  assigneeId?: string | null;
  url?: string;
  caption?: string;
  style?: Record<string, any>;
  [key: string]: any;
}

export interface Block {
  id: string; // Stable UUID
  noteId: string; // Parent Note UUID
  parentId?: string | null; // Support nesting
  type: BlockType;
  content: string; // Text or serialized schema
  properties: BlockProperties;
  position: number;
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 Universal Knowledge Entity Link Graph
```typescript
export interface KnowledgeLink {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  sourceBlockId?: string;
  anchorText?: string;
  type: 'wikilink' | 'tag' | 'mention' | 'relation';
  createdAt: string;
}
```

---

## 6. Migration Strategy & Feature Flag Matrix

To guarantee zero downtime and preserve data integrity for existing NoteNirman users during incremental rollout, all 2.0 features will be controlled via strict runtime **Feature Flags**.

```typescript
export const FEATURE_FLAGS = {
  BLOCK_EDITOR: false,      // Universal Block Engine
  STABLE_IDS: false,        // Stable Entity ID Resolution
  KNOWLEDGE_GRAPH: false,   // WikiLinks & Graph View
  CANVAS: false,            // Infinite Canvas
  DATABASES: false,         // Database Blocks & Views
  TASK_SYSTEM: false,       // Centralized Task Aggregation
  CRDT_COLLAB: false,       // Yjs Realtime Sync
  PDF_INTELLIGENCE: false,  // PDF Parsing & RAG
  AUDIO_NOTES: false,       // Audio Transcription
  AI_AGENTS: false,         // Autonomous AI Agents
} as const;
```

### 6.1 Database Migration & Backwards Compatibility
1. **Schema Non-Destructiveness**: New database columns (`blocks`, `knowledge_links`, `canvases`, `databases`, `tasks`) will be added incrementally via Supabase SQL migrations.
2. **HTML to Block Converter**: Existing HTML content in `notes.content` will be parsed automatically upon access and transformed into typed Block structures while retaining raw `content` as a fallback mirror.
