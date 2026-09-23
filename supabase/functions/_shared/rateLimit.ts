// Fixed-window per-chat rate limit. Pure: the caller persists the state.

export interface RateState {
  windowStart: number;
  count: number;
}

export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 60_000;

export interface RateResult {
  allowed: boolean;
  next: RateState;
  /** True exactly once per window, so the bot warns the user once and then stays quiet. */
  firstBlock: boolean;
}

export function checkRate(state: RateState | null, now: number, limit = RATE_LIMIT, windowMs = RATE_WINDOW_MS): RateResult {
  if (!state || now - state.windowStart >= windowMs) {
    return { allowed: true, next: { windowStart: now, count: 1 }, firstBlock: false };
  }
  const count = state.count + 1;
  return {
    allowed: count <= limit,
    next: { windowStart: state.windowStart, count },
    firstBlock: count === limit + 1,
  };
}
