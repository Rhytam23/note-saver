import { describe, it, expect, vi, afterEach } from 'vitest';
import { getDynamicTheme } from '../seasonalService';

const IN = { country: 'IN', latitude: 20.6 };
const US = { country: 'US', latitude: 39.8 };
const themeOn = (loc: typeof IN, y: number, m: number, d: number) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(y, m - 1, d, 12));
    return getDynamicTheme(loc);
};

afterEach(() => vi.useRealTimers());

describe('festival themes by country (2026)', () => {
    it('Diwali shows worldwide', () => {
        expect(themeOn(IN, 2026, 11, 8)).toBe('diwali');
        expect(themeOn(US, 2026, 11, 8)).toBe('diwali');
    });
    it('Navratri is India only (Mahalaya Oct 10 to Dussehra Oct 20)', () => {
        expect(themeOn(IN, 2026, 10, 10)).toBe('navratri');
        expect(themeOn(IN, 2026, 10, 20)).toBe('navratri');
        expect(themeOn(US, 2026, 10, 15)).not.toBe('navratri');
    });
    it('Holi is India only', () => {
        expect(themeOn(IN, 2026, 3, 4)).toBe('holi');
        expect(themeOn(US, 2026, 3, 4)).not.toBe('holi');
    });
    it('regular seasons apply to both', () => {
        expect(themeOn(IN, 2026, 7, 1)).toBe('monsoon');
        expect(themeOn(US, 2026, 7, 1)).toBe('summer');
    });
});
