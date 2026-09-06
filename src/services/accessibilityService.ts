export interface AccessibilityOptions {
  enableReducedMotion?: boolean;
  highContrastMode?: boolean;
}

export class AccessibilityService {
  /**
   * Evaluates WCAG 2.1 AA text contrast ratio.
   * Contrast ratio must be >= 4.5:1 for normal text and >= 3:1 for large text.
   */
  static getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  static getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
    const lum1 = this.getLuminance(...rgb1);
    const lum2 = this.getLuminance(...rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  static isWcagAACompliant(
    textRgb: [number, number, number],
    bgRgb: [number, number, number],
    isLargeText = false
  ): boolean {
    const ratio = this.getContrastRatio(textRgb, bgRgb);
    const requiredRatio = isLargeText ? 3.0 : 4.5;
    return ratio >= requiredRatio;
  }
}
