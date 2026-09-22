import { useEffect, useState } from 'react';

/**
 * How much motion a page is allowed to use.
 * 'full'    - everything: tilt, parallax, hover interactions.
 * 'reduced' - low-end device: smaller ranges, no listeners, single fade-ins.
 * 'off'     - prefers-reduced-motion: static, no animation at all.
 *
 * Centralizes what App.tsx and WelcomeIntroAnimation.tsx currently do ad hoc
 * with a single matchMedia('(prefers-reduced-motion: reduce)') read - this
 * adds a live listener plus a basic low-end-device heuristic. Those two
 * files are not refactored to use this yet; they're natural future adopters.
 */
export type MotionTier = 'full' | 'reduced' | 'off';

export interface MotionCapability {
  tier: MotionTier;
  prefersReducedMotion: boolean;
  isLowEndDevice: boolean;
}

function detectLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  try {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return true;
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return true;
    if (nav.connection?.saveData) return true;
    const effectiveType = nav.connection?.effectiveType;
    if (effectiveType && ['slow-2g', '2g', '3g'].includes(effectiveType)) return true;
  } catch {
    // Any of these APIs can be missing/throw on older or privacy-hardened
    // browsers - treat that as "unknown", not "low-end".
  }
  return false;
}

function deriveTier(prefersReducedMotion: boolean, isLowEndDevice: boolean): MotionTier {
  if (prefersReducedMotion) return 'off';
  if (isLowEndDevice) return 'reduced';
  return 'full';
}

export function useMotionCapability(): MotionCapability {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  // Low-end heuristic doesn't change at runtime, so it's computed once.
  const [isLowEndDevice] = useState(detectLowEndDevice);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  return {
    tier: deriveTier(prefersReducedMotion, isLowEndDevice),
    prefersReducedMotion,
    isLowEndDevice,
  };
}
