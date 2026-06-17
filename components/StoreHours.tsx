"use client"

import { useEffect, useState } from 'react';
import { getRegularTimeslots, fetchSpecials, getSpecialTimeslots } from '@/lib/api';
import { computeWeekdayWindows, formatMinutes, WEEKDAY_NAMES, type DayWindow } from '@/lib/storeHours';

// Mon→Sun display order.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Hours shown on the homepage, derived from live order-pickup availability:
 * regular timeslots (Fri/Sat) + each active special's timeslots (e.g. the
 * Thursday Dinner Special). Closing time is the last pickup slot + the slot
 * interval (see lib/storeHours). Falls back gracefully if the API is down.
 */
export default function StoreHours() {
    const [windows, setWindows] = useState<Record<number, DayWindow> | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const keys: string[] = [];
            try {
                const regular = await getRegularTimeslots(14).catch(() => ({}));
                keys.push(...Object.keys(regular || {}));
                const specials = await fetchSpecials().catch(() => []);
                const slotMaps = await Promise.all(
                    (specials || []).map((s: { id: number }) => getSpecialTimeslots(s.id).catch(() => ({}))),
                );
                for (const m of slotMaps) keys.push(...Object.keys(m || {}));
            } catch {
                // fall through with whatever keys we gathered
            }
            if (!cancelled) setWindows(computeWeekdayWindows(keys));
        })();
        return () => { cancelled = true; };
    }, []);

    if (windows === null) {
        return <div className="text-gray-300 space-y-1"><p>Loading hours…</p></div>;
    }

    const openDays = ORDER.filter((d) => windows[d]);
    if (openDays.length === 0) {
        return (
            <div className="text-gray-300 space-y-1">
                <p>Hours vary by week</p>
                <p>Call (518) 756-1000</p>
            </div>
        );
    }

    return (
        <div className="text-gray-300 space-y-1">
            {ORDER.map((d) =>
                windows[d] ? (
                    <p key={d}>
                        {WEEKDAY_NAMES[d]}: {formatMinutes(windows[d].open)} – {formatMinutes(windows[d].close)}
                    </p>
                ) : null,
            )}
            {openDays.length < 7 && <p className="text-sm text-gray-400">Closed all other days</p>}
        </div>
    );
}
