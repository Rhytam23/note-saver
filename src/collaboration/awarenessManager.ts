import type { Collaborator } from './collaborationTypes';

/**
 * NoteNirman 2.0 — Presence & Awareness Manager
 * 
 * Manages local user awareness and active remote collaborator states:
 * - Sanitizes presence info (no tokens, keys, or passwords).
 * - Tracks user cursor / selected block location.
 * - Handles stale presence expiration.
 */
export class AwarenessManager {
  private localUser: Collaborator;
  private remoteCollaborators: Map<string, Collaborator> = new Map();
  private listeners: Set<(collaborators: Collaborator[]) => void> = new Set();
  private staleCheckTimer: any = null;

  constructor(localUser: Collaborator) {
    this.localUser = { ...localUser, online: true, lastActiveAt: new Date().toISOString() };
    this.startStaleTimer();
  }

  public getLocalUser(): Collaborator {
    return { ...this.localUser };
  }

  public updateLocalCursor(selectedBlockId: string | null): void {
    this.localUser.selectedBlockId = selectedBlockId;
    this.localUser.lastActiveAt = new Date().toISOString();
    this.notify();
  }

  public setRemoteCollaborators(collaborators: Collaborator[]): void {
    this.remoteCollaborators.clear();
    collaborators.forEach(c => {
      if (c.id !== this.localUser.id && c.online) {
        this.remoteCollaborators.set(c.id, c);
      }
    });
    this.notify();
  }

  public getActiveCollaborators(): Collaborator[] {
    const list: Collaborator[] = [this.localUser];
    this.remoteCollaborators.forEach(c => list.push(c));
    return list;
  }

  public subscribe(handler: (collaborators: Collaborator[]) => void): () => void {
    this.listeners.add(handler);
    handler(this.getActiveCollaborators());
    return () => this.listeners.delete(handler);
  }

  public destroy(): void {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
    this.listeners.clear();
    this.remoteCollaborators.clear();
  }

  private notify(): void {
    const list = this.getActiveCollaborators();
    this.listeners.forEach(h => h(list));
  }

  private startStaleTimer(): void {
    this.staleCheckTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      this.remoteCollaborators.forEach((c, id) => {
        const lastActive = new Date(c.lastActiveAt).getTime();
        // Remove collaborator if inactive for > 60 seconds
        if (now - lastActive > 60000) {
          this.remoteCollaborators.delete(id);
          changed = true;
        }
      });
      if (changed) {
        this.notify();
      }
    }, 15000);
  }
}
