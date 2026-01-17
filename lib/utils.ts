import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount)
}

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
}

export function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    })
}

export function formatDateTime(date: Date | string): string {
    return `${formatDate(date)} at ${formatTime(date)}`
}

export function formatSpecialDateRange(start: Date | string, end: Date | string): string {
    const startDate = typeof start === 'string' ? new Date(start) : start
    const endDate = typeof end === 'string' ? new Date(end) : end
    
    // Check if same day
    const sameDay = startDate.toDateString() === endDate.toDateString()
    
    const formatDateWithOrdinal = (d: Date) => {
        const day = d.getDate()
        const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 !== 10 ? day % 10 : 0)]
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).replace(/\d+/, day + suffix)
    }
    
    if (sameDay) {
        // Same day: "December 4th 4:00 PM - 7:00 PM"
        return `${formatDateWithOrdinal(startDate)} ${formatTime(startDate)} - ${formatTime(endDate)}`
    } else {
        // Multi-day: "December 4th 4:00 PM - December 5th 7:00 PM"
        return `${formatDateWithOrdinal(startDate)} ${formatTime(startDate)} - ${formatDateWithOrdinal(endDate)} ${formatTime(endDate)}`
    }
}



