import { describe, it, expect } from 'vitest'
import { computeWeekdayWindows, formatMinutes, WEEKDAY_NAMES } from '@/lib/storeHours'

// JS Date.toString()-style keys, as the timeslot APIs return them.
const k = (wd: string, time: string) => `${wd} Jun 19 2026 ${time} GMT-0400 (Eastern Daylight Time)`

describe('computeWeekdayWindows', () => {
    it('derives open = first slot, close = last slot + 15 min interval', () => {
        const w = computeWeekdayWindows([
            k('Fri', '16:00:00'), k('Fri', '17:30:00'), k('Fri', '19:45:00'),
        ])
        // Fri: 4pm open, last pickup 7:45 → closes 8pm
        expect(w[5]).toEqual({ open: 16 * 60, close: 20 * 60 })
    })

    it('groups multiple weekdays independently (Thu special + Fri/Sat regular)', () => {
        const w = computeWeekdayWindows([
            k('Thu', '16:00:00'), k('Thu', '18:45:00'), // special → 4pm–7pm
            k('Sat', '14:00:00'), k('Sat', '19:45:00'), // regular → 2pm–8pm
        ])
        expect(w[4]).toEqual({ open: 16 * 60, close: 19 * 60 })
        expect(w[6]).toEqual({ open: 14 * 60, close: 20 * 60 })
        expect(w[5]).toBeUndefined() // no Friday slots
    })

    it('ignores unparseable keys', () => {
        expect(computeWeekdayWindows(['', 'garbage', 'foo bar'])).toEqual({})
    })
})

describe('formatMinutes', () => {
    it('formats on-the-hour and partial times', () => {
        expect(formatMinutes(16 * 60)).toBe('4pm')
        expect(formatMinutes(20 * 60)).toBe('8pm')
        expect(formatMinutes(7 * 60 + 30)).toBe('7:30am')
        expect(formatMinutes(12 * 60)).toBe('12pm')
    })
})

describe('WEEKDAY_NAMES', () => {
    it('is Sunday-indexed (matches Date.getDay)', () => {
        expect(WEEKDAY_NAMES[4]).toBe('Thursday')
        expect(WEEKDAY_NAMES[5]).toBe('Friday')
    })
})
