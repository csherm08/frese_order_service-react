"use client"

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - will eventually come from API/admin portal
const mockNewsEvents = [
    {
        id: 1,
        title: "Thursday Dinner Specials Are Back!",
        description: "Join us every Thursday for our famous dinner specials. This week: Chicken Parm served over baked ziti!",
        imageUrl: "https://storage.googleapis.com/frese-product-images/chicken-parm.jpg",
        date: "2025-12-04",
        type: "event" as const,
    },
    {
        id: 2,
        title: "Holiday Hours",
        description: "We'll be closed Christmas Day and New Year's Day. Order ahead for your holiday gatherings!",
        imageUrl: "https://storage.googleapis.com/frese-product-images/holiday.jpg",
        date: "2025-12-20",
        type: "news" as const,
    },
    {
        id: 3,
        title: "New Cinnamon Bread Recipe",
        description: "We've perfected our cinnamon bread recipe - come try the new and improved version!",
        imageUrl: "https://storage.googleapis.com/frese-product-images/cinnamon.jpg",
        date: "2025-11-28",
        type: "news" as const,
    },
    {
        id: 4,
        title: "Catering Available",
        description: "Planning a party or event? We offer full catering services for any occasion.",
        imageUrl: "https://storage.googleapis.com/frese-product-images/catering.jpg",
        date: "2025-11-15",
        type: "news" as const,
    },
];

interface NewsEvent {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    date: string;
    type: 'news' | 'event';
}

export default function NewsCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const items = mockNewsEvents;

    const nextSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    }, [items.length]);

    const prevSlide = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }, [items.length]);

    // Auto-advance carousel
    useEffect(() => {
        if (!isAutoPlaying) return;
        
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [isAutoPlaying, nextSlide]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (items.length === 0) return null;

    return (
        <section className="py-16 bg-gradient-to-b from-white to-orange-50">
            <div className="container px-4">
                <div className="text-center space-y-4 mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold">News & Events</h2>
                    <p className="text-lg text-muted-foreground">Stay updated with what's happening at Frese's</p>
                </div>

                <div 
                    className="relative max-w-4xl mx-auto"
                    onMouseEnter={() => setIsAutoPlaying(false)}
                    onMouseLeave={() => setIsAutoPlaying(true)}
                >
                    {/* Main Carousel */}
                    <div className="overflow-hidden rounded-2xl">
                        <div 
                            className="flex transition-transform duration-500 ease-out"
                            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                        >
                            {items.map((item) => (
                                <div key={item.id} className="w-full flex-shrink-0">
                                    <Card className="border-0 shadow-xl overflow-hidden">
                                        {/* Image */}
                                        <div className="relative h-64 md:h-80 bg-gradient-to-br from-orange-100 to-amber-100">
                                            {item.imageUrl ? (
                                                <div 
                                                    className="absolute inset-0 bg-cover bg-center"
                                                    style={{ 
                                                        backgroundImage: `url(${item.imageUrl})`,
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Calendar className="h-20 w-20 text-orange-300" />
                                                </div>
                                            )}
                                            
                                            {/* Type Badge */}
                                            <div className="absolute top-4 left-4">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-sm font-medium",
                                                    item.type === 'event' 
                                                        ? "bg-orange-500 text-white"
                                                        : "bg-blue-500 text-white"
                                                )}>
                                                    {item.type === 'event' ? 'Event' : 'News'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <CardContent className="p-6 space-y-3">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>{formatDate(item.date)}</span>
                                            </div>
                                            <h3 className="text-2xl font-bold">{item.title}</h3>
                                            <p className="text-muted-foreground text-lg">
                                                {item.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Arrows */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 h-12 w-12 rounded-full bg-white shadow-lg hover:bg-gray-100 z-10"
                        onClick={prevSlide}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 h-12 w-12 rounded-full bg-white shadow-lg hover:bg-gray-100 z-10"
                        onClick={nextSlide}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>

                    {/* Dots Indicator */}
                    <div className="flex justify-center gap-2 mt-6">
                        {items.map((_, index) => (
                            <button
                                key={index}
                                className={cn(
                                    "w-3 h-3 rounded-full transition-all duration-300",
                                    index === currentIndex 
                                        ? "bg-orange-500 w-8" 
                                        : "bg-gray-300 hover:bg-gray-400"
                                )}
                                onClick={() => setCurrentIndex(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

