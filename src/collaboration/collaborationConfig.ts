/**
 * NoteNirman 2.0 — Collaboration Configuration & Utilities
 */

export const COLLABORATION_ROOM_PREFIX = 'notenirman-room-';

export function formatRoomId(noteId: string): string {
  if (!noteId) return `${COLLABORATION_ROOM_PREFIX}default`;
  return noteId.startsWith(COLLABORATION_ROOM_PREFIX)
    ? noteId
    : `${COLLABORATION_ROOM_PREFIX}${noteId}`;
}

export function uint8ArrayToBase64(array: Uint8Array): string {
  let binary = '';
  const len = array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
