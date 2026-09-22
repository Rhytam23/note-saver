import { useRef } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import type { MotionTier } from './useMotionCapability';

/**
 * Scroll-linked parallax for one element, scoped to that element's own
 * scroll-into/out-of-view progress (not the whole page) so it doesn't fight
 * the sticky header or move unpredictably on short pages.
 *
 * Gated by `tier`: 'full' uses the given range, 'reduced' uses a quarter of
 * it (still some depth, much less motion), 'off' returns a flat 0 - the
 * element never moves, matching today's behavior exactly.
 */
export function useParallax(tier: MotionTier, range: [number, number] = [-24, 24]) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const effectiveRange: [number, number] =
    tier === 'full' ? range : tier === 'reduced' ? [range[0] / 4, range[1] / 4] : [0, 0];

  const y = useTransform(scrollYProgress, [0, 1], effectiveRange);

  return { ref, y, scrollYProgress };
}
