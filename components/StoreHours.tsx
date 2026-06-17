"use client"

import { useEffect, useState } from 'react';
import { getRegularTimeslots, fetchSpecials, getSpecialTimeslots } from '@/lib/api';
import { computeStoreHours, formatMinutes, WEEKDAY_NAMES, type DayHours } from '@/lib/storeHours';

// Mon→Sun display order.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Hours shown on the homepage, derived from live order-pickup availability:
 * regular timeslots (Fri/Sat) + each active special's timeslots (e.g. the
 * Thursday Dinner Special). Closing time is the last pickup slot + the slot
 * interval (see lib/storeHours). Falls back gracefully if the API is down.
 */
export default function StoreHours() {
    const [windows, setWindows] = useState<Record<number, DayHours> | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const regularKeys: string[] = [];
            const specialKeys: string[] = [];
            try {
                const regular = await getRegularTimeslots(14).catch(() => ({}));
                regularKeys.push(...Object.keys(regular || {}));
                const specials = await fetchSpecials().catch(() => []);
                const slotMaps = await Promise.all(
                    (specials || []).map((s: { id: number }) => getSpecialTimeslots(s.id).catch(() => ({}))),
                );
                for (const m of slotMaps) specialKeys.push(...Object.keys(m || {}));
            } catch {
                // fall through with whatever keys we gathered
            }
            if (!cancelled) setWindows(computeStoreHours(regularKeys, specialKeys));
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
                        {windows[d].specialsOnly && (
                            <span className="text-sm text-[#f5991c]"> (specials only)</span>
                        )}
                    </p>
                ) : null,
            )}
            {openDays.length < 7 && <p className="text-sm text-gray-400">Closed all other days</p>}
        </div>
    );
}
