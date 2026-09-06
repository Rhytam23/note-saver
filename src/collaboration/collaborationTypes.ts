/**
 * NoteNirman 2.0 — Collaboration Type Definitions
 * 
 * Core interfaces and types for Yjs CRDT integration, transport messaging,
 * presence/awareness, comments, and history foundations.
 */

export type CollaborationStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  online: boolean;
  selectedBlockId?: string | null;
  lastActiveAt: string;
}

export interface CollaborationSessionConfig {
  noteId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  roomId?: string;
}

/**
 * Transport Message Protocol
 * Clearly separates Yjs CRDT document updates, awareness/presence, and control signals.
 */
export type MessageType = 'doc-update' | 'awareness' | 'control';

export interface BaseTransportMessage {
  type: MessageType;
  senderId: string;
  noteId: string;
  timestamp: number;
}

export interface DocUpdateMessage extends BaseTransportMessage {
  type: 'doc-update';
  update: string; // Base64 encoded Yjs binary update (Uint8Array)
}

export interface AwarenessMessage extends BaseTransportMessage {
  type: 'awareness';
  state: {
    user: Collaborator;
    cursorBlockId?: string | null;
  };
}

export interface ControlMessage extends BaseTransportMessage {
  type: 'control';
  action: 'join' | 'leave' | 'ping' | 'pong';
}

export type TransportMessage = DocUpdateMessage | AwarenessMessage | ControlMessage;

/**
 * Abstract Realtime Provider Interface
 */
export interface ICollaborationProvider {
  status: CollaborationStatus;
  connect(config: CollaborationSessionConfig): Promise<void>;
  disconnect(): Promise<void>;
  sendDocUpdate(update: Uint8Array, origin?: string): void;
  sendAwareness(state: Partial<Collaborator>): void;
  onDocUpdate(handler: (update: Uint8Array, origin: string) => void): () => void;
  onAwareness(handler: (collaborators: Collaborator[]) => void): () => void;
  onStatusChange(handler: (status: CollaborationStatus) => void): () => void;
}
