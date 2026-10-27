import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseRealtimeProvider } from '../realtimeProvider';
import { supabase } from '../../services/supabase';
import { uint8ArrayToBase64 } from '../collaborationConfig';

describe('Realtime Collaboration Security & Private Channel Authorization', () => {
  let mockChannel: any;
  let subscribeCallback: (status: string) => void;
  let broadcastHandler: (payload: any) => void;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockChannel = {
      on: vi.fn().mockImplementation((type: string, filter: any, handler: any) => {
        if (type === 'broadcast') {
          broadcastHandler = handler;
        }
        return mockChannel;
      }),
      subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
        subscribeCallback = cb;
        return mockChannel;
      }),
      send: vi.fn(),
    };

    vi.spyOn(supabase, 'channel').mockReturnValue(mockChannel);
    vi.spyOn(supabase, 'removeChannel').mockResolvedValue('ok' as any);
  });

  it('enables private: true in channel configuration for room access control', async () => {
    const provider = new SupabaseRealtimeProvider();
    await provider.connect({
      noteId: 'note-secret-123',
      userId: 'user-alice',
      userName: 'Alice',
    });

    expect(supabase.channel).toHaveBeenCalledWith(
      'notenirman-room-note-secret-123',
      expect.objectContaining({
        config: expect.objectContaining({
          private: true,
          broadcast: { self: false },
        }),
      })
    );
  });

  it('transitions to error status when server RLS denies access (CHANNEL_ERROR)', async () => {
    const provider = new SupabaseRealtimeProvider();
    const statusChanges: string[] = [];
    provider.onStatusChange((s) => statusChanges.push(s));

    await provider.connect({
      noteId: 'note-unauthorized-999',
      userId: 'user-bob',
      userName: 'Bob',
    });

    expect(provider.status).toBe('connecting');

    // Simulate Supabase Realtime RLS denial
    subscribeCallback('CHANNEL_ERROR');

    expect(provider.status).toBe('error');
    expect(statusChanges).toContain('error');
  });

  it('transitions to connected status when authorized (SUBSCRIBED)', async () => {
    const provider = new SupabaseRealtimeProvider();
    await provider.connect({
      noteId: 'note-authorized-100',
      userId: 'user-alice',
      userName: 'Alice',
    });

    subscribeCallback('SUBSCRIBED');

    expect(provider.status).toBe('connected');
    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'collab-message',
        payload: expect.objectContaining({
          type: 'awareness',
          senderId: 'user-alice',
          noteId: 'note-authorized-100',
        }),
      })
    );
  });

  it('drops messages with mismatched noteId (cross-room injection guard)', async () => {
    const provider = new SupabaseRealtimeProvider();
    const receivedUpdates: Uint8Array[] = [];
    provider.onDocUpdate((update) => receivedUpdates.push(update));

    await provider.connect({
      noteId: 'note-room-A',
      userId: 'user-alice',
      userName: 'Alice',
    });

    subscribeCallback('SUBSCRIBED');

    const fakeUpdate = new Uint8Array([1, 2, 3]);

    // Attacker sends message for note-room-B into note-room-A channel
    broadcastHandler({
      payload: {
        type: 'doc-update',
        senderId: 'attacker-mallory',
        noteId: 'note-room-B',
        timestamp: Date.now(),
        update: uint8ArrayToBase64(fakeUpdate),
      },
    });

    expect(receivedUpdates).toHaveLength(0);

    // Legitimate collaborator sends update with correct noteId
    broadcastHandler({
      payload: {
        type: 'doc-update',
        senderId: 'user-collaborator',
        noteId: 'note-room-A',
        timestamp: Date.now(),
        update: uint8ArrayToBase64(fakeUpdate),
      },
    });

    expect(receivedUpdates).toHaveLength(1);
    expect(Array.from(receivedUpdates[0])).toEqual([1, 2, 3]);
  });
});
