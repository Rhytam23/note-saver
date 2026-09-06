/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { AccessibilityService } from '../accessibilityService';

describe('Phase 5 — Accessibility & Contrast Verification (P5.13)', () => {
  it('calculates WCAG 2.1 AA text contrast ratio correctly for black text on white background', () => {
    const black: [number, number, number] = [0, 0, 0];
    const white: [number, number, number] = [255, 255, 255];

    const ratio = AccessibilityService.getContrastRatio(black, white);
    expect(ratio).toBeGreaterThan(20); // Black on white is ~21:1
    expect(AccessibilityService.isWcagAACompliant(black, white, false)).toBe(true);
  });

  it('rejects low contrast text combinations (< 4.5:1 ratio for normal text)', () => {
    const lightGray: [number, number, number] = [200, 200, 200];
    const white: [number, number, number] = [255, 255, 255];

    const ratio = AccessibilityService.getContrastRatio(lightGray, white);
    expect(ratio).toBeLessThan(4.5);
    expect(AccessibilityService.isWcagAACompliant(lightGray, white, false)).toBe(false);
  });
});
