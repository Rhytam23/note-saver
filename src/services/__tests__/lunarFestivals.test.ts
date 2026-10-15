import { describe, it, expect } from 'vitest';
import { getLunarFestivals, dayNumber } from '../lunarFestivals';

const day = (y: number, m: number, d: number) => dayNumber(new Date(y, m - 1, d));

// Published festival dates; the computed range may be off by a day, so we
// only require the real date to fall inside the theme window.
describe('lunarFestivals', () => {
    const navratriStart: [number, number, number][] = [[2023, 10, 15], [2024, 10, 3], [2025, 9, 22], [2026, 10, 11]];
    const diwali: [number, number, number][] = [[2023, 11, 12], [2024, 11, 1], [2025, 10, 20], [2026, 11, 8]];
    const holi: [number, number, number][] = [[2023, 3, 8], [2024, 3, 25], [2025, 3, 14], [2026, 3, 4]];

    it.each(navratriStart)('Navratri %i starts near %i-%i', (y, m, d) => {
        const { start } = getLunarFestivals(y).navratri;
        expect(Math.abs(start - day(y, m, d))).toBeLessThanOrEqual(1);
    });
    it.each(diwali)('Diwali %i window contains %i-%i', (y, m, d) => {
        const r = getLunarFestivals(y).diwali;
        expect(day(y, m, d)).toBeGreaterThanOrEqual(r.start);
        expect(day(y, m, d)).toBeLessThanOrEqual(r.end);
    });
    it.each(holi)('Holi %i window contains %i-%i', (y, m, d) => {
        const r = getLunarFestivals(y).holi;
        expect(day(y, m, d)).toBeGreaterThanOrEqual(r.start);
        expect(day(y, m, d)).toBeLessThanOrEqual(r.end);
    });
});
