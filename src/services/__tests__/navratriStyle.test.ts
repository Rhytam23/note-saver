import { describe, it, expect } from 'vitest';
import { getNavratriStyle } from '../navratriStyle';

describe('getNavratriStyle', () => {
    it.each([
        ['Gujarat', 'garba'], ['Maharashtra', 'garba'], ['Goa', 'garba'],
        ['West Bengal', 'durga_puja'], ['Odisha', 'durga_puja'], ['Assam', 'durga_puja'],
        ['Tamil Nadu', 'golu'], ['Kerala', 'golu'], ['Karnataka', 'golu'], ['Telangana', 'golu'],
        ['Uttar Pradesh', 'ramlila'], ['NCT of Delhi', 'ramlila'], ['Delhi', 'ramlila'], ['Punjab', 'ramlila'],
    ])('%s -> %s', (region, style) => {
        expect(getNavratriStyle(region)).toBe(style);
    });

    it('falls back to garba when region is unknown or missing', () => {
        expect(getNavratriStyle(null)).toBe('garba');
        expect(getNavratriStyle(undefined)).toBe('garba');
        expect(getNavratriStyle('Atlantis')).toBe('garba');
    });
});
