"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { fetchSpecials } from '@/lib/api';
import { Special } from '@/types/special';
import { formatSpecialDateRange } from '@/lib/utils';
import Link from 'next/link';
import CachedImage from '@/components/CachedImage';

export default function OrderPage() {
    const [specials, setSpecials] = useState<Special[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSpecials();
    }, []);

    async function loadSpecials() {
        try {
            const data = await fetchSpecials();
            setSpecials(data);
        } catch (error) {
            console.error('Failed to load specials:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Show specials that are active OR upcoming (end date in the future)
    const now = new Date();
    const availableSpecials = specials.filter(s => {
        const endDate = new Date(s.end);
        return s.active || endDate > now;
    });
    const hasAvailableSpecials = availableSpecials.length > 0;

    return (
        <div className="container px-4 py-8 max-w-4xl mx-auto">
            <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold">Start Your Order</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Choose how you'd like to order today
                    </p>
                </div>

                {/* Options Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Specials Option */}
                    {hasAvailableSpecials ? (
                        <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-orange-400 group cursor-pointer flex flex-col">
                            <Link href={`/order/special/${availableSpecials[0].id}`} className="flex flex-col flex-1">
                                {availableSpecials[0].photoUrl ? (
                                    <div className="h-48 overflow-hidden relative">
                                        <CachedImage
                                            src={availableSpecials[0].photoUrl}
                                            alt={availableSpecials[0].name}
                                            fill
                                            containerClassName="w-full h-full"
                                            className="group-hover:scale-105 transition-transform duration-300"
                                            priority
                                        />
                                        <div className="absolute top-4 right-4 z-20">
                                            <Badge className="bg-orange-500 hover:bg-orange-600">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                {new Date(availableSpecials[0].start) > now ? 'Coming Soon' : 'Limited Time'}
                                            </Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-48 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center relative">
                                        <Sparkles className="h-24 w-24 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                                        <div className="absolute top-4 right-4">
                                            <Badge className="bg-orange-500 hover:bg-orange-600">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                {new Date(availableSpecials[0].start) > now ? 'Coming Soon' : 'Limited Time'}
                                            </Badge>
                                        </div>
                                    </div>
                                )}

                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-2xl">
                                        <Sparkles className="h-6 w-6 text-orange-500" />
                                        {availableSpecials[0].name}
                                    </CardTitle>
                                    <CardDescription className="text-base">
                                        {new Date(availableSpecials[0].start) > now ? 'Upcoming Special' : 'This Week\'s Special'}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex-1 flex flex-col">
                                    <div className="space-y-4 flex-1">
                                        {availableSpecials[0].description && (
                                            <p className="text-muted-foreground">
                                                {availableSpecials[0].description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4 flex-shrink-0" />
                                            <span>
                                                {formatSpecialDateRange(availableSpecials[0].start, availableSpecials[0].end)}
                                            </span>
                                        </div>
                                    </div>

                                    <Button className="w-full group-hover:bg-orange-500 transition-colors mt-4">
                                        {new Date(availableSpecials[0].start) > now ? 'Pre-Order Special' : 'Order Special'}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Link>
                        </Card>
                    ) : (
                        <Card className="relative overflow-hidden opacity-60 flex flex-col">
                            <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <Sparkles className="h-24 w-24 text-gray-400" />
                            </div>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <Sparkles className="h-6 w-6 text-gray-400" />
                                    Weekly Special
                                </CardTitle>
                                <CardDescription className="text-base">
                                    No active specials right now
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <p className="text-muted-foreground flex-1">
                                    Check back soon for our next special offering!
                                </p>
                                <Button disabled className="w-full mt-4">
                                    Coming Soon
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Regular Menu Option */}
                    <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary group cursor-pointer flex flex-col">
                        <Link href="/menu" className="flex flex-col flex-1">
                            <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                <ChefHat className="h-24 w-24 text-amber-600 group-hover:scale-110 transition-transform duration-300" />
                            </div>

                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-2xl">
                                    <ChefHat className="h-6 w-6 text-amber-600" />
                                    Regular Menu
                                </CardTitle>
                                <CardDescription className="text-base">
                                    Our full selection of baked goods
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1 flex flex-col">
                                <div className="space-y-4 flex-1">
                                    <p className="text-muted-foreground">
                                        Browse our complete menu featuring fresh bread, pizza, wings,
                                        pastries, and more - all made fresh daily.
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">Bread</Badge>
                                        <Badge variant="outline">Pizza</Badge>
                                        <Badge variant="outline">Wings</Badge>
                                        <Badge variant="outline">Pastries</Badge>
                                        <Badge variant="outline">& More</Badge>
                                    </div>
                                </div>

                                <Button className="w-full mt-4">
                                    Browse Menu
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>
                </div>

                {/* Additional Specials (if more than one) */}
                {availableSpecials.length > 1 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold">Other Available Specials</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableSpecials.slice(1).map((special) => (
                                <Link key={special.id} href={`/order/special/${special.id}`}>
                                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                        {special.photoUrl ? (
                                            <CachedImage
                                                src={special.photoUrl}
                                                alt={special.name}
                                                fill
                                                containerClassName="w-full h-32"
                                            />
                                        ) : (
                                            <div className="w-full h-32 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                                                <Sparkles className="h-12 w-12 text-orange-400" />
                                            </div>
                                        )}
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">{special.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                                <span>{formatSpecialDateRange(special.start, special.end)}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

