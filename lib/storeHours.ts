/**
 * Derive display "hours" (order/pickup windows) per weekday from timeslot keys.
 *
 * The timeslot APIs key their maps by JS `Date.toString()` strings, e.g.
 * "Fri Jun 19 2026 16:00:00 GMT-0400 (Eastern Daylight Time)". We parse the
 * weekday + wall-clock time directly out of that string so the displayed hours
 * are the bakery's local time regardless of the viewer's timezone.
 *
 * Regular timeslots give Fri/Sat; the Thursday special's timeslots give
 * Thursday — combine both key sets and group by weekday.
 */
export interface DayWindow {
    open: number; // minutes from midnight (bakery-local)
    close: number;
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ABBR: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
// Slots are 15 min apart; the listed times are pickup slots, so closing time is
// the last slot + one interval (e.g. last pickup 7:45pm → closes 8pm).
const SLOT_MINUTES = 15;

export function computeWeekdayWindows(timeKeys: string[]): Record<number, DayWindow> {
    const out: Record<number, DayWindow> = {};
    for (const key of timeKeys) {
        const parts = key.split(' '); // [Fri, Jun, 19, 2026, 16:00:00, GMT-0400, ...]
        const day = ABBR[parts[0]];
        const time = parts[4];
        if (day === undefined || !time) continue;
        const [h, mi] = time.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(mi)) continue;
        const mins = h * 60 + mi;
        const w = out[day];
        if (!w) out[day] = { open: mins, close: mins };
        else {
            if (mins < w.open) w.open = mins;
            if (mins > w.close) w.close = mins;
        }
    }
    // Closing time = last pickup slot + one interval.
    for (const d of Object.keys(out)) out[Number(d)].close += SLOT_MINUTES;
    return out;
}

export function formatMinutes(m: number): string {
    const h = Math.floor(m / 60);
    const mi = m % 60;
    const ap = h < 12 ? 'am' : 'pm';
    const hh = h % 12 || 12;
    return mi ? `${hh}:${String(mi).padStart(2, '0')}${ap}` : `${hh}${ap}`;
}
