import React from 'react';

type ImportFactory<T extends React.ComponentType<any>> = () => Promise<{ default: T }>;

/**
 * React.lazy() with a timeout and one automatic retry.
 *
 * Plain React.lazy() has no recovery path if the dynamic import() never
 * settles - which happens more often than it seems: a backgrounded browser
 * tab can have its network I/O suspended mid-fetch by the browser (Chrome's
 * ERR_NETWORK_IO_SUSPENDED), a flaky connection can just hang, or a tab left
 * open across a redeploy can reference a chunk hash that no longer exists.
 * In all of those cases the Suspense fallback spins forever with nothing to
 * catch it - that's what happened opening the note editor (see
 * docs/DECISIONS.md, 2026-09-22 entry).
 *
 * This wraps the import in a timeout, retries once after a short delay, and
 * on repeated failure lets the rejection propagate - which the top-level
 * ErrorBoundary (src/components/ErrorBoundary.tsx) catches and turns into a
 * visible "Reload NoteNirman" screen instead of an infinite spinner.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: ImportFactory<T>,
  { timeoutMs = 15000, retryDelayMs = 1000 }: { timeoutMs?: number; retryDelayMs?: number } = {}
): React.LazyExoticComponent<T> {
  const attempt = (): Promise<{ default: T }> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Loading this part of the app timed out. Check your connection and try again.')),
        timeoutMs
      );
      factory().then(
        mod => {
          clearTimeout(timer);
          resolve(mod);
        },
        err => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });

  return React.lazy(() =>
    attempt().catch(
      () =>
        new Promise<{ default: T }>((resolve, reject) => {
          setTimeout(() => {
            attempt().then(resolve, reject);
          }, retryDelayMs);
        })
    )
  );
}
