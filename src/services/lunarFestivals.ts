// Computes the dates of moon-based Indian festivals for any year, so the
// seasonal themes never need a hand-maintained date table.
//
// New/full moon times use Meeus, "Astronomical Algorithms" ch. 49 (principal
// terms, accurate to a few minutes). Festival rules (amanta calendar):
//   Diwali   = Kartik Amavasya, the new moon after the Ashvin full moon
//   Navratri = 9 days starting the day after the new moon one lunar month
//              before Diwali (Ashvin Shukla Pratipada), ending with Navami
//   Holi     = day after the Phalguna full moon (Holika Dahan); Phalguna is
//              the lunar month containing the Sun's entry into Pisces
// Festival days are decided by tithi at sunrise, so results can be off by a
// day in rare years (e.g. when an adhika month shifts things); the theme
// windows below include a margin day to absorb that.

const SYNODIC_MONTH = 29.530588861;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Time (UTC ms) of the new moon (full = false) or full moon (full = true) with index k. */
const moonPhaseUtc = (k: number, full: boolean): number => {
    const kk = k + (full ? 0.5 : 0);
    const T = kk / 1236.85;
    const jde =
        2451550.09766 + SYNODIC_MONTH * kk +
        0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
    const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
    const M = rad(2.5534 + 29.1053567 * kk - 0.0000014 * T ** 2 - 0.00000011 * T ** 3);
    const Mp = rad(201.5643 + 385.81693528 * kk + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4);
    const F = rad(160.7108 + 390.67050284 * kk - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4);
    const Om = rad(124.7746 - 1.56375588 * kk + 0.0020672 * T ** 2 + 0.00000215 * T ** 3);

    const corr = full
        ? -0.40614 * Math.sin(Mp) + 0.17302 * E * Math.sin(M) + 0.01614 * Math.sin(2 * Mp) +
          0.01043 * Math.sin(2 * F) + 0.00734 * E * Math.sin(Mp - M) - 0.00515 * E * Math.sin(Mp + M) +
          0.00209 * E * E * Math.sin(2 * M)
        : -0.4072 * Math.sin(Mp) + 0.17241 * E * Math.sin(M) + 0.01608 * Math.sin(2 * Mp) +
          0.01039 * Math.sin(2 * F) + 0.00739 * E * Math.sin(Mp - M) - 0.00514 * E * Math.sin(Mp + M) +
          0.00208 * E * E * Math.sin(2 * M);
    const common =
        -0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M) -
        0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + 2 * F) + 0.00038 * E * Math.sin(M - 2 * F) -
        0.00024 * E * Math.sin(2 * Mp - M) - 0.00017 * Math.sin(Om);

    return (jde + corr + common - 2440587.5) * DAY_MS;
};

/** Day number (days since epoch) of an instant, as the calendar date in IST. */
const istDay = (utcMs: number): number => Math.floor((utcMs + IST_OFFSET_MS) / DAY_MS);

/** Day number of a local calendar date, comparable with istDay(). */
export const dayNumber = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;

const kFor = (year: number, month: number) => Math.round((year + month / 12 - 2000) * 12.3685);

/** First phase (new or full) whose IST date falls on or after the given date. */
const firstPhaseOnOrAfter = (year: number, month: number, day: number, full: boolean) => {
    const target = Date.UTC(year, month, day) / DAY_MS;
    for (let k = kFor(year, month) - 2; k < kFor(year, month) + 4; k++) {
        const t = moonPhaseUtc(k, full);
        if (istDay(t) >= target) return { k, day: istDay(t) };
    }
    throw new Error('lunarFestivals: phase not found');
};

export interface FestivalRange {
    start: number;
    end: number;
}

const cache = new Map<number, { diwali: FestivalRange; navratri: FestivalRange; holi: FestivalRange }>();

export const getLunarFestivals = (year: number) => {
    const hit = cache.get(year);
    if (hit) return hit;

    // Diwali: the new moon that falls between Oct 15 and Nov 14 (Kartik Amavasya).
    const diwali = firstPhaseOnOrAfter(year, 9, 15, false);
    const diwaliDay = diwali.day;
    // Navratri begins the day after the previous new moon (one lunar month earlier).
    const navratriStart = istDay(moonPhaseUtc(diwali.k - 1, false)) + 1;
    // Holi: Phalguna is the lunar month containing the Sun's entry into Pisces
    // (~Mar 14). Its full moon is Phalguna Purnima; Holi is the next day.
    const phalgunaStart = firstPhaseOnOrAfter(year, 2, 15, false).k - 1;
    const holiDay = istDay(moonPhaseUtc(phalgunaStart, true)) + 1;

    const result = {
        // Dhanteras (2 days before) through Bhai Dooj (2 days after), plus a margin day.
        diwali: { start: diwaliDay - 3, end: diwaliDay + 3 },
        navratri: { start: navratriStart, end: navratriStart + 8 },
        holi: { start: holiDay - 2, end: holiDay + 1 },
    };
    cache.set(year, result);
    return result;
};

export const isInRange = (d: Date, range: FestivalRange): boolean => {
    const n = dayNumber(d);
    return n >= range.start && n <= range.end;
};

export const isLunarFestival = (d: Date, name: 'diwali' | 'navratri' | 'holi'): boolean =>
    isInRange(d, getLunarFestivals(d.getFullYear())[name]);
