import { supabase } from './supabase';

export type ConnectivityStatus = 'online' | 'offline' | 'backend-unavailable' | 'auth-expired';

type Listener = (status: ConnectivityStatus) => void;

const listeners = new Set<Listener>();
let currentStatus: ConnectivityStatus = typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online';
let checking = false;
let lastCheckAt = 0;
const MIN_CHECK_INTERVAL_MS = 5000;

function setStatus(status: ConnectivityStatus) {
  if (status === currentStatus) return;
  currentStatus = status;
  listeners.forEach(l => l(status));
}

export function getConnectivityStatus(): ConnectivityStatus {
  return currentStatus;
}

export function subscribeConnectivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function probeBackend(): Promise<ConnectivityStatus> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'offline';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const { error } = await supabase
      .from('notes')
      .select('id', { head: true, count: 'exact' })
      .limit(1)
      .abortSignal(controller.signal);

    if (!error) return 'online';

    const status = (error as any).status ?? (error as any).code;
    if (status === 401 || status === 'PGRST301' || /jwt/i.test(error.message || '')) {
      return 'auth-expired';
    }
    return 'backend-unavailable';
  } catch (err: any) {
    if (err?.name === 'AbortError') return 'backend-unavailable';
    return 'offline';
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkConnectivityNow(force = false): Promise<ConnectivityStatus> {
  const now = Date.now();
  if (checking) return currentStatus;
  if (!force && now - lastCheckAt < MIN_CHECK_INTERVAL_MS) return currentStatus;

  checking = true;
  lastCheckAt = now;
  try {
    const status = await probeBackend();
    setStatus(status);
    return status;
  } finally {
    checking = false;
  }
}

let initialized = false;
export function initConnectivityWatcher() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('online', () => {
    checkConnectivityNow(true);
  });
  window.addEventListener('offline', () => {
    setStatus('offline');
  });

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      checkConnectivityNow();
    }
  }, 30000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkConnectivityNow(true);
    }
  });

  checkConnectivityNow(true);
}

