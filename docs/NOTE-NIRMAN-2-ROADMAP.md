# NoteNirman 2.0 — Implementation Roadmap

This document outlines the phased roadmap for building **NoteNirman 2.0**. Development proceeds strictly incrementally, ensuring every phase undergoes full type-checking, linting, testing, cross-platform builds, and safety verification.

---

## Roadmap Phases Overview

```text
+-------------------------------------------------------------------+
| P0: Universal Block Model, Stable IDs, Knowledge Links, Setup     |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| P1: Universal Block Editor, Graph View, Canvas, Databases, Tasks |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| P2: Yjs CRDT Collaboration, Comments, Version History, Realtime   |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| P3: PDF Intelligence, Audio Transcription, Handwriting, Clips    |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| P4: Universal Search, RAG Vector Search, AI Agents & Copilot      |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
| P5: Calendar Integration, Import/Export, Desktop/Mobile Polish    |
+-------------------------------------------------------------------+
```

---

## Detailed Phase Breakdown

### Phase 0 — Foundation & Repository Audit (Current Step)
- [x] Complete code audit (`package.json`, `src/`, `src-tauri/`, `android/`, `supabase/`).
- [x] Create `docs/NOTE-NIRMAN-2-ARCHITECTURE.md`.
- [x] Create `docs/NOTE-NIRMAN-2-ROADMAP.md`.
- [ ] Establish testing infrastructure (Vitest + React Testing Library).
- [ ] Implement Feature Flag registry (`src/config/featureFlags.ts`).
- [ ] Introduce Universal Block data interfaces (`src/types/block.ts`).

### Phase 1 — Universal Block Editor Engine
- [ ] Upgrade TipTap extensions to emit structured JSON block items.
- [ ] Implement block properties: `id`, `type`, `content`, `properties`, `position`, `createdAt`, `updatedAt`.
- [ ] Support 24 block types: Paragraph, Heading, Quote, Callout, BulletList, NumberedList, Checklist, Task, Code, Table, Image, Video, Audio, File, PDF, Math, Diagram, Bookmark, Embed, Database, AI, Divider, Toggle.
- [ ] Enhanced Slash Command menu (`/`) supporting block generation.
- [ ] Block drag & drop, duplicate, reorder, and nesting controls.

### Phase 2 — Knowledge Links & Obsidian-Style Graph
- [ ] Stable ID resolution engine for notes and blocks.
- [ ] WikiLink syntax parser `[[Note Name]]` with auto-complete menu.
- [ ] Dynamic Backlinks, Outgoing links, and Unlinked mentions sidebar.
- [ ] Interactive 2D Knowledge Graph visualization (force-directed canvas/SVG).
- [ ] Graph filtering by tags, links, and search queries.

### Phase 3 — Infinite Visual Canvas
- [ ] Infinite 2D spatial canvas surface (pan, zoom, multi-select).
- [ ] Canvas objects: Note cards, text notes, images, PDFs, task cards, database previews, web clips, hand drawings.
- [ ] Bidirectional conversion: Note $\leftrightarrow$ Canvas Card.
- [ ] Connector lines representing semantic relationships.

### Phase 4 — Databases & Custom Views
- [ ] Database block type supporting structured property columns (Text, Number, Date, Checkbox, Select, Multi-Select, Person, URL, Relation, Status, File).
- [ ] Views: Table, Board (Kanban), List, Calendar, Gallery, Timeline.
- [ ] Cross-database relations (e.g. Projects $\leftrightarrow$ Tasks).

### Phase 5 — Centralized Task System
- [ ] Task as a first-class block item (`status`, `priority`, `dueDate`, `assigneeId`, `projectId`).
- [ ] Centralized Task Dashboard aggregating tasks across all notes, databases, and calendar views without data duplication.

### Phase 6 — Integrated Calendar System
- [ ] Day, Week, Month, Agenda calendar views.
- [ ] Seamless integration mapping note dates and database items into calendar slots.
- [ ] Foundation for external Google Calendar sync API.

### Phase 7 — Yjs CRDT Collaboration & Presence
- [ ] Yjs CRDT integration over Supabase Realtime / WebSockets.
- [ ] Multi-user concurrent editing, dynamic cursor tracking, selection highlights.
- [ ] Seamless offline edit merge upon internet reconnection without data loss.

### Phase 8 — Comprehensive Version History
- [ ] Snapshot and delta version tracking with author timestamps.
- [ ] Visual diff comparison view and non-destructive version restoration.

### Phase 9 — Block-Level Comments & Mentions
- [ ] Inline comments attached to individual blocks or text ranges.
- [ ] Discussion threads, @mentions, and resolution states.

### Phase 10 — PDF Intelligence & OCR
- [ ] Embedded PDF viewer with highlighting and annotation tools.
- [ ] Client/Edge text extraction pipeline, chunking, and page-referenced citations.

### Phase 11 — Tablet Handwriting & Ink Support
- [ ] Pen, highlighter, eraser, and lasso gesture canvas controls.
- [ ] Text recognition pipeline converting strokes into searchable text blocks.

### Phase 12 — Audio Recording & Timestamped Transcripts
- [ ] In-app audio recorder with waveform visualizer.
- [ ] Automated speech-to-text transcription with timestamped transcript clicking.

### Phase 13 — Web Clipper Extension
- [ ] Browser extension clip ingestion API (Article text, selection, screenshots, URLs).

### Phase 14 — Universal Search & Indexing
- [ ] Offline-first unified search indexing notes, blocks, tasks, PDFs, audio transcripts, and clips.

### Phase 15 — AI Knowledge Engine & Copilot
- [ ] Context-aware AI proxy integration (Summarize, Rewrite, Quiz generation, Study plan builder).
- [ ] Grounded responses backed by user knowledge base citations.

### Phase 16 — RAG (Retrieval-Augmented Generation)
- [ ] Local/Hybrid vector embeddings index for semantic question answering.

### Phase 17 — Autonomous AI Agents
- [ ] Specialized Agents: Research Agent, Study Agent, Project Manager Agent with human-in-the-loop confirmation.

### Phase 18 — Extensible Command Palette (`Ctrl + K`)
- [ ] Quick switcher command palette for seamless navigation and action execution.

### Phase 19 — Workspace Dashboard & Quick Capture
- [ ] Customizable home view with widgets (Recent notes, Pinned notes, Task overview, Activity feed).

### Phase 20 — Comprehensive Import & Export
- [ ] Import from Markdown, HTML, PDF, Notion, Obsidian. Export to Markdown, HTML, PDF, JSON.

### Phase 21 — Continuous Security Audit
- [ ] RLS policies, token validation, proxy rate limiting, secure local file storage verification.

### Phase 22 — Performance Optimization
- [ ] Lazy loading, virtualized lists, web worker indexing, zero-lag typing guarantees.

### Phase 23 — Mobile (Android) Refinement
- [ ] Touch-first layout adjustments, mobile quick-capture gestures, offline database sync tuning.

### Phase 24 — Desktop (Tauri Windows) Integration
- [ ] System tray integration, native file system dialogues, global keyboard shortcuts.

### Phase 25 — Production Polish & Release Verification
- [ ] End-to-end integration tests, regression checks, release pipeline packaging.

---

## Incremental Quality Checklist (Applied After Every Phase)
1. `npx tsc --noEmit` (TypeScript Check)
2. `npm run lint` (ESLint / Code Formatting)
3. `npm test` (Vitest Suite Execution)
4. `npm run build` (Vite Production Build)
5. Verify Web functionality.
6. Verify Desktop compatibility (`npm run tauri:dev` build verification).
7. Verify Android compatibility (`npx cap sync android`).
8. Review Supabase migration scripts for non-destructive operations.
9. Audit security boundaries (no secret leakages, strict RLS).
10. Generate progress summary report.
