import { describe, it, expect, vi } from 'vitest';
import type {
  ICollaborationProvider,
  CollaborationStatus,
  CollaborationSessionConfig,
  Collaborator,
} from '../collaborationTypes';
import { CollaborationManager } from '../collaborationManager';
import { createBlockDocument } from '../../services/blockDocument';

class MockCollaborationProvider implements ICollaborationProvider {
  public status: CollaborationStatus = 'disconnected';
  private docUpdateHandlers: Set<(update: Uint8Array, origin: string) => void> = new Set();
  private awarenessHandlers: Set<(collaborators: Collaborator[]) => void> = new Set();
  private statusHandlers: Set<(status: CollaborationStatus) => void> = new Set();
  public sentUpdates: Uint8Array[] = [];

  public async connect(_config: CollaborationSessionConfig): Promise<void> {
    this.status = 'connected';
    this.statusHandlers.forEach(h => h('connected'));
  }

  public async disconnect(): Promise<void> {
    this.status = 'disconnected';
    this.statusHandlers.forEach(h => h('disconnected'));
  }

  public sendDocUpdate(update: Uint8Array, _origin?: string): void {
    this.sentUpdates.push(update);
  }

  public sendAwareness(_state: Partial<Collaborator>): void {}

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

  public simulateRemoteUpdate(update: Uint8Array): void {
    this.docUpdateHandlers.forEach(h => h(update, 'provider-remote'));
  }
}

describe('NoteNirman 2.0 P2.4 & P2.5 Suite — Collaboration Manager & Session Lifecycle', () => {

  it('1. should open session, connect provider, and initialize Y.Doc from BlockDocument', async () => {
    const manager = new CollaborationManager();
    const mockProvider = new MockCollaborationProvider();
    const initialDoc = createBlockDocument('note-sess-1', '<p>Session start</p>');

    await manager.openSession(
      { noteId: 'note-sess-1', userId: 'user-1', userName: 'Alice' },
      initialDoc,
      mockProvider
    );

    expect(manager.getStatus()).toBe('connected');
    expect(manager.getLatestDocument()?.blocks[0].content).toBe('Session start');

    await manager.closeSession();
    expect(manager.getStatus()).toBe('disconnected');
  });

  it('2. should broadcast local updates and update state without infinite loops', async () => {
    const manager = new CollaborationManager();
    const mockProvider = new MockCollaborationProvider();
    const initialDoc = createBlockDocument('note-sess-2', '<p>Original</p>');

    await manager.openSession(
      { noteId: 'note-sess-2', userId: 'user-1', userName: 'Alice' },
      initialDoc,
      mockProvider
    );

    const docListener = vi.fn();
    manager.onDocumentChange(docListener);

    const updatedDoc = {
      ...initialDoc,
      blocks: [{ ...initialDoc.blocks[0], content: 'Updated content' }],
    };

    manager.updateLocalDocument(updatedDoc);

    expect(docListener).toHaveBeenCalled();
    expect(mockProvider.sentUpdates.length).toBeGreaterThan(0);
    expect(manager.getLatestDocument()?.blocks[0].content).toBe('Updated content');

    await manager.closeSession();
  });

  it('3. should support opening and closing sessions repeatedly without listener leaks', async () => {
    const manager = new CollaborationManager();
    const initialDoc = createBlockDocument('note-leak-test', '<p>Test</p>');

    for (let i = 0; i < 3; i++) {
      const mockProvider = new MockCollaborationProvider();
      await manager.openSession(
        { noteId: 'note-leak-test', userId: 'user-1', userName: 'Alice' },
        initialDoc,
        mockProvider
      );
      expect(manager.getStatus()).toBe('connected');
      await manager.closeSession();
      expect(manager.getStatus()).toBe('disconnected');
    }
  });

});
