import { supabase } from '../services/supabase';
import type {
  ICollaborationProvider,
  CollaborationStatus,
  CollaborationSessionConfig,
  Collaborator,
  TransportMessage,
  DocUpdateMessage,
  AwarenessMessage,
} from './collaborationTypes';
import { formatRoomId, uint8ArrayToBase64, base64ToUint8Array } from './collaborationConfig';

export const PROVIDER_ORIGIN_REMOTE = 'provider-remote';

/**
 * NoteNirman 2.0 — Supabase Realtime Transport Provider
 * 
 * Implements the realtime transport protocol boundary:
 * - Uses Supabase Broadcast channel for low-latency peer updates.
 * - Encodes Yjs binary updates into Base64 transport messages.
 * - Distinguishes doc updates, awareness state, and session control.
 * - Handles auto-reconnect, subscription cleanup, duplicate guards.
 * - Zero secrets or service-role keys exposed.
 */
export class SupabaseRealtimeProvider implements ICollaborationProvider {
  public status: CollaborationStatus = 'disconnected';
  private channel: any = null;
  private config: CollaborationSessionConfig | null = null;

  private docUpdateHandlers: Set<(update: Uint8Array, origin: string) => void> = new Set();
  private awarenessHandlers: Set<(collaborators: Collaborator[]) => void> = new Set();
  private statusHandlers: Set<(status: CollaborationStatus) => void> = new Set();

  private activeCollaborators: Map<string, Collaborator> = new Map();

  public async connect(config: CollaborationSessionConfig): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      if (this.config?.noteId === config.noteId && this.config?.userId === config.userId) {
        return; // Guard against duplicate connect
      }
      await this.disconnect();
    }

    this.config = config;
    this.setStatus('connecting');

    const roomId = formatRoomId(config.noteId);

    try {
      this.channel = supabase.channel(roomId, {
        config: { broadcast: { self: false } },
      });

      this.channel
        .on('broadcast', { event: 'collab-message' }, (payload: { payload: TransportMessage }) => {
          this.handleIncomingMessage(payload.payload);
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            this.setStatus('connected');
            // Announce presence on join
            this.sendAwareness({ online: true });
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.setStatus('reconnecting');
          }
        });
    } catch (err) {
      console.error('[RealtimeProvider] Connect error:', err);
      this.setStatus('error');
    }
  }

  public async disconnect(): Promise<void> {
    if (this.channel) {
      try {
        // Send leave message
        if (this.config) {
          this.sendAwareness({ online: false });
        }
        await supabase.removeChannel(this.channel);
      } catch (err) {
        console.error('[RealtimeProvider] Disconnect cleanup error:', err);
      }
      this.channel = null;
    }
    this.activeCollaborators.clear();
    this.config = null;
    this.setStatus('disconnected');
  }

  public sendDocUpdate(update: Uint8Array, _origin?: string): void {
    if (this.status !== 'connected' || !this.channel || !this.config) return;

    const msg: DocUpdateMessage = {
      type: 'doc-update',
      senderId: this.config.userId,
      noteId: this.config.noteId,
      timestamp: Date.now(),
      update: uint8ArrayToBase64(update),
    };

    this.channel.send({
      type: 'broadcast',
      event: 'collab-message',
      payload: msg,
    });
  }

  public sendAwareness(state: Partial<Collaborator>): void {
    if (!this.channel || !this.config) return;

    const fullUser: Collaborator = {
      id: this.config.userId,
      name: this.config.userName,
      avatar: this.config.userAvatar,
      online: state.online !== undefined ? state.online : true,
      selectedBlockId: state.selectedBlockId || null,
      lastActiveAt: new Date().toISOString(),
      ...state,
    };

    const msg: AwarenessMessage = {
      type: 'awareness',
      senderId: this.config.userId,
      noteId: this.config.noteId,
      timestamp: Date.now(),
      state: {
        user: fullUser,
        cursorBlockId: state.selectedBlockId,
      },
    };

    this.channel.send({
      type: 'broadcast',
      event: 'collab-message',
      payload: msg,
    });
  }

  public onDocUpdate(handler: (update: Uint8Array, origin: string) => void): () => void {
    this.docUpdateHandlers.add(handler);
    return () => this.docUpdateHandlers.delete(handler);
  }

  public onAwareness(handler: (collaborators: Collaborator[]) => void): () => void {
    this.awarenessHandlers.add(handler);
    return () => this.awarenessHandlers.delete(handler);
  }

  public onStatusChange(handler: (status: CollaborationStatus) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private setStatus(status: CollaborationStatus): void {
    this.status = status;
    this.statusHandlers.forEach(h => h(status));
  }

  private handleIncomingMessage(msg: TransportMessage): void {
    if (!msg || msg.senderId === this.config?.userId) return; // Ignore self

    switch (msg.type) {
      case 'doc-update': {
        try {
          const binaryUpdate = base64ToUint8Array(msg.update);
          this.docUpdateHandlers.forEach(h => h(binaryUpdate, PROVIDER_ORIGIN_REMOTE));
        } catch (err) {
          console.error('[RealtimeProvider] Failed to decode doc update:', err);
        }
        break;
      }
      case 'awareness': {
        if (msg.state?.user) {
          const user = msg.state.user;
          if (user.online) {
            this.activeCollaborators.set(user.id, user);
          } else {
            this.activeCollaborators.delete(user.id);
          }
          const list = Array.from(this.activeCollaborators.values());
          this.awarenessHandlers.forEach(h => h(list));
        }
        break;
      }
    }
  }
}
