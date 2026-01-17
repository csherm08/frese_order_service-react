"use client"

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { format } from 'date-fns';
import { getRegularTimeslots, getSpecialTimeslots, fetchSpecials, fetchProductTypes } from '@/lib/api';
import { CartItem } from '@/types/products';
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TimeslotSelectorProps {
    items: CartItem[];
    onSelect: (timeslot: any) => void;
    loading?: boolean;
}

interface GroupedTimeslots {
    [date: string]: any[];
}

export default function TimeslotSelector({ items, onSelect, loading: externalLoading }: TimeslotSelectorProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [timeslots, setTimeslots] = useState<any[]>([]);
    const [groupedTimeslots, setGroupedTimeslots] = useState<GroupedTimeslots>({});
    const [loading, setLoading] = useState(false);
    const [selectedTimeslot, setSelectedTimeslot] = useState<any>(null);
    const [specialTypeId, setSpecialTypeId] = useState<number | null>(null);

    useEffect(() => {
        loadTimeslots();
    }, []);

    async function loadTimeslots() {
        setLoading(true);
        try {
            // Fetch special typeId if not already loaded
            if (specialTypeId === null) {
                const types = await fetchProductTypes();
                const specialType = types.find((t: any) => t.name === 'Special');
                setSpecialTypeId(specialType?.id || null);
            }

            // Replicate old frontend logic from order.service.ts getTimesForCart()
            const currentSpecialTypeId = specialTypeId || (await fetchProductTypes()).find((t: any) => t.name === 'Special')?.id;

            // Check if cart has special items
            const specialProductsInCart = items.filter(item => item.typeId === currentSpecialTypeId);

            let allTimes: Record<string, any> = {};

            if (specialProductsInCart.length > 0) {
                // Cart has special items - get special times only
                const specials = await fetchSpecials();
                const specialIds = new Set<number>();

                for (const specialProduct of specialProductsInCart) {
                    const matchingSpecials = specials.filter((special: any) =>
                        special.products.some((p: any) => p.id === specialProduct.productId)
                    );
                    matchingSpecials.forEach((s: any) => specialIds.add(s.id));
                }

                // Fetch times for all matching specials
                for (const specialId of specialIds) {
                    const specialTimes = await getSpecialTimeslots(specialId);
                    allTimes = { ...allTimes, ...specialTimes };
                }

                toast.info('Special items in cart - showing special pickup times only');
            } else {
                // No special items - check if all items qualify for a special
                const specials = await fetchSpecials();
                const productIdsInCart = items.map(i => i.productId);

                let qualifiesForSpecial = false;
                for (const special of specials) {
                    const specialProductIds = special.products.map((p: any) => p.id);
                    if (productIdsInCart.every(id => specialProductIds.includes(id))) {
                        // All items belong to this special - include both special and regular times
                        const specialTimes = await getSpecialTimeslots(special.id);
                        allTimes = { ...allTimes, ...specialTimes };
                        qualifiesForSpecial = true;
                        break; // Use first qualifying special
                    }
                }

                // Always include regular times when no special items
                const regularTimes = await getRegularTimeslots(6);
                allTimes = { ...allTimes, ...regularTimes };
            }

            // Convert to array and filter active slots
            const timesArray = Object.keys(allTimes).map(timestamp => ({
                id: timestamp,
                timestamp: timestamp,
                amountLeft: allTimes[timestamp].amountLeft,
                active: allTimes[timestamp].active,
            })).filter(slot => slot.active);

            // Group timeslots by date
            const grouped: GroupedTimeslots = {};
            timesArray.forEach(slot => {
                try {
                    // Parse the timestamp - it's already an ISO string
                    const dateObj = new Date(slot.timestamp);
                    const date = format(dateObj, 'MMMM d, yyyy');
                    if (!grouped[date]) {
                        grouped[date] = [];
                    }
                    grouped[date].push(slot);
                } catch (error) {
                    console.error('Failed to parse timestamp:', slot.timestamp, error);
                }
            });

            // Sort dates
            const sortedDates = Object.keys(grouped).sort((a, b) => {
                return new Date(a).getTime() - new Date(b).getTime();
            });

            const sortedGrouped: GroupedTimeslots = {};
            sortedDates.forEach(date => {
                sortedGrouped[date] = grouped[date].sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
            });

            setTimeslots(timesArray);
            setGroupedTimeslots(sortedGrouped);

            // Auto-select first date
            if (sortedDates.length > 0 && !selectedDate) {
                setSelectedDate(sortedDates[0]);
            }
        } catch (error) {
            console.error('Failed to load timeslots:', error);
            toast.error('Failed to load available times');
            setTimeslots([]);
            setGroupedTimeslots({});
        } finally {
            setLoading(false);
        }
    }


    const handleTimeslotClick = (timeslot: any) => {
        setSelectedTimeslot(timeslot);
    };

    const handleConfirm = () => {
        if (selectedTimeslot) {
            onSelect(selectedTimeslot);
        }
    };

    const availableDates = Object.keys(groupedTimeslots);
    const currentDateSlots = selectedDate ? groupedTimeslots[selectedDate] || [] : [];

    return (
        <div className="space-y-6">
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Available Dates */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg">Select Pickup Date</h3>
                        {availableDates.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {availableDates.map((date) => (
                                    <Button
                                        key={date}
                                        variant={selectedDate === date ? 'default' : 'outline'}
                                        className="h-auto py-4 text-left justify-start"
                                        onClick={() => {
                                            setSelectedDate(date);
                                            setSelectedTimeslot(null); // Clear selected time when date changes
                                        }}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{date}</span>
                                            <span className="text-xs opacity-70">
                                                {groupedTimeslots[date].length} time{groupedTimeslots[date].length !== 1 ? 's' : ''} available
                                            </span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="pt-6 text-center text-muted-foreground">
                                    No available pickup times. Please try again later.
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Available Times for Selected Date */}
                    {selectedDate && currentDateSlots.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg">
                                Select Pickup Time
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {currentDateSlots.map((slot) => (
                                    <Button
                                        key={slot.id}
                                        variant={selectedTimeslot?.id === slot.id ? 'default' : 'outline'}
                                        className="h-auto py-4"
                                        onClick={() => handleTimeslotClick(slot)}
                                    >
                                        <Clock className="h-4 w-4 mr-2" />
                                        {format(new Date(slot.timestamp), 'h:mm a')}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Confirm Button */}
                    {selectedTimeslot && (
                        <Button
                            onClick={handleConfirm}
                            disabled={externalLoading}
                            size="lg"
                            className="w-full"
                        >
                            {externalLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                `Confirm Pickup: ${selectedDate} at ${format(new Date(selectedTimeslot.timestamp), 'h:mm a')}`
                            )}
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}

