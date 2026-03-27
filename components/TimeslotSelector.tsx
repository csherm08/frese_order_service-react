"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { getRegularTimeslots, getSpecialTimeslots, fetchSpecials, fetchProductTypes } from "@/lib/api"
import type { CartItem } from "@/types/products"
import { Loader2, Calendar, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface TimeslotSelectorProps {
    items: CartItem[]
    onSelect: (timeslot: any) => void
    loading?: boolean
}

interface GroupedTimeslots {
    [date: string]: any[]
}

function getTimePeriod(timestamp: string): "morning" | "afternoon" | "evening" {
    const hour = new Date(timestamp).getHours()
    if (hour < 12) return "morning"
    if (hour < 17) return "afternoon"
    return "evening"
}

function groupByPeriod(slots: any[]) {
    const groups: { morning: any[]; afternoon: any[]; evening: any[] } = {
        morning: [],
        afternoon: [],
        evening: [],
    }
    slots.forEach((slot) => {
        const period = getTimePeriod(slot.timestamp)
        groups[period].push(slot)
    })
    return groups
}

const periodLabels = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
}

export default function TimeslotSelector({ items, onSelect, loading: externalLoading }: TimeslotSelectorProps) {
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [timeslots, setTimeslots] = useState<any[]>([])
    const [groupedTimeslots, setGroupedTimeslots] = useState<GroupedTimeslots>({})
    const [loading, setLoading] = useState(false)
    const [selectedTimeslot, setSelectedTimeslot] = useState<any>(null)
    const [specialTypeId, setSpecialTypeId] = useState<number | null>(null)

    useEffect(() => {
        loadTimeslots()
    }, [])

    async function loadTimeslots() {
        setLoading(true)
        try {
            if (specialTypeId === null) {
                const types = await fetchProductTypes()
                const specialType = types.find((t: any) => t.name === "Special")
                setSpecialTypeId(specialType?.id || null)
            }

            const currentSpecialTypeId =
                specialTypeId || (await fetchProductTypes()).find((t: any) => t.name === "Special")?.id
            const specialProductsInCart = items.filter((item) => item.typeId === currentSpecialTypeId)

            let allTimes: Record<string, any> = {}

            if (specialProductsInCart.length > 0) {
                const specials = await fetchSpecials()
                const specialIds = new Set<number>()

                for (const specialProduct of specialProductsInCart) {
                    const matchingSpecials = specials.filter((special: any) =>
                        special.products.some((p: any) => p.id === specialProduct.productId),
                    )
                    matchingSpecials.forEach((s: any) => specialIds.add(s.id))
                }

                for (const specialId of specialIds) {
                    const specialTimes = await getSpecialTimeslots(specialId)
                    allTimes = { ...allTimes, ...specialTimes }
                }

                toast.info("Special items in cart - showing special pickup times only")
            } else {
                const specials = await fetchSpecials()
                const productIdsInCart = items.map((i) => i.productId)

                for (const special of specials) {
                    const specialProductIds = special.products.map((p: any) => p.id)
                    if (productIdsInCart.every((id) => specialProductIds.includes(id))) {
                        const specialTimes = await getSpecialTimeslots(special.id)
                        allTimes = { ...allTimes, ...specialTimes }
                        break
                    }
                }

                const regularTimes = await getRegularTimeslots(6)
                allTimes = { ...allTimes, ...regularTimes }
            }

            const timesArray = Object.keys(allTimes)
                .map((timestamp) => ({
                    id: timestamp,
                    timestamp: timestamp,
                    amountLeft: allTimes[timestamp].amountLeft,
                    active: allTimes[timestamp].active,
                }))
                .filter((slot) => slot.active)

            const grouped: GroupedTimeslots = {}
            timesArray.forEach((slot) => {
                try {
                    const dateObj = new Date(slot.timestamp)
                    const date = format(dateObj, "MMMM d, yyyy")
                    if (!grouped[date]) {
                        grouped[date] = []
                    }
                    grouped[date].push(slot)
                } catch (error) {
                    console.error("Failed to parse timestamp:", slot.timestamp, error)
                }
            })

            const sortedDates = Object.keys(grouped).sort((a, b) => {
                return new Date(a).getTime() - new Date(b).getTime()
            })

            const sortedGrouped: GroupedTimeslots = {}
            sortedDates.forEach((date) => {
                sortedGrouped[date] = grouped[date].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
                )
            })

            setTimeslots(timesArray)
            setGroupedTimeslots(sortedGrouped)

            if (sortedDates.length > 0 && !selectedDate) {
                setSelectedDate(sortedDates[0])
            }
        } catch (error) {
            console.error("Failed to load timeslots:", error)
            toast.error("Failed to load available times")
            setTimeslots([])
            setGroupedTimeslots({})
        } finally {
            setLoading(false)
        }
    }

    const handleTimeslotClick = (timeslot: any) => {
        setSelectedTimeslot(timeslot)
    }

    const handleConfirm = () => {
        if (selectedTimeslot) {
            onSelect(selectedTimeslot)
        }
    }

    const availableDates = Object.keys(groupedTimeslots)
    const currentDateSlots = selectedDate ? groupedTimeslots[selectedDate] || [] : []
    const periodGroups = groupByPeriod(currentDateSlots)

    return (
        <div className="space-y-5">
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pickup Date</h3>
                        {availableDates.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                {availableDates.map((date) => {
                                    const dateObj = new Date(date)
                                    const isSelected = selectedDate === date
                                    return (
                                        <button
                                            key={date}
                                            className={cn(
                                                "flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-lg border-2 transition-all",
                                                isSelected
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-border bg-card hover:border-primary/50",
                                            )}
                                            onClick={() => {
                                                setSelectedDate(date)
                                                setSelectedTimeslot(null)
                                            }}
                                        >
                                            <span
                                                className={cn(
                                                    "text-xs font-medium uppercase",
                                                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                                                )}
                                            >
                                                {format(dateObj, "EEE")}
                                            </span>
                                            <span className="text-2xl font-bold">{format(dateObj, "d")}</span>
                                            <span
                                                className={cn("text-xs", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}
                                            >
                                                {format(dateObj, "MMM")}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="pt-6 text-center text-muted-foreground">
                                    No available pickup times. Please try again later.
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {selectedDate && currentDateSlots.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pickup Time</h3>
                            <div className="max-h-64 overflow-y-auto space-y-4 pr-1">
                                {(["morning", "afternoon", "evening"] as const).map((period) => {
                                    const slots = periodGroups[period]
                                    if (slots.length === 0) return null

                                    return (
                                        <div key={period} className="space-y-2">
                                            <p className="text-sm font-medium text-foreground/70">{periodLabels[period]}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {slots.map((slot) => {
                                                    const isSelected = selectedTimeslot?.id === slot.id
                                                    return (
                                                        <button
                                                            key={slot.id}
                                                            className={cn(
                                                                "px-3 py-1.5 text-sm rounded-full border transition-all",
                                                                isSelected
                                                                    ? "bg-primary text-primary-foreground border-primary"
                                                                    : "bg-card border-border hover:border-primary/50 hover:bg-accent",
                                                            )}
                                                            onClick={() => handleTimeslotClick(slot)}
                                                        >
                                                            {format(new Date(slot.timestamp), "h:mm a")}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {selectedTimeslot && (
                        <div className="pt-2 border-t">
                            <Button onClick={handleConfirm} disabled={externalLoading} size="lg" className="w-full">
                                {externalLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(selectedDate!), "EEE, MMM d")} at{" "}
                                        {format(new Date(selectedTimeslot.timestamp), "h:mm a")}
                                        <ChevronRight className="h-4 w-4" />
                                    </span>
                                )}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
