"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { fetchSpecials } from '@/lib/api';
import { Special } from '@/types/special';
import { formatSpecialDateRange, cn } from '@/lib/utils';
import Link from 'next/link';
import CachedImage from '@/components/CachedImage';
import { getOrderSiteMode } from '@/lib/siteConfig';
import { useCart } from '@/contexts/CartContext';

export default function OrderPage() {
    const siteMode = getOrderSiteMode();
    const { items, cartMode } = useCart();
    const cartHasItems = items.length > 0;
    const lockedToRegular = cartHasItems && cartMode?.type === 'regular';
    const lockedToSpecial = cartHasItems && cartMode?.type === 'special';
    const lockedSpecialId = lockedToSpecial && cartMode?.type === 'special' ? cartMode.specialId : null;
    const [specials, setSpecials] = useState<Special[]>([]);
    const [loading, setLoading] = useState(siteMode === 'main');

    useEffect(() => {
        if (siteMode === 'plugpower') {
            return;
        }
        loadSpecials();
    }, [siteMode]);

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

    if (siteMode === 'plugpower') {
        return (
            <div className="container px-4 py-8 max-w-lg mx-auto">
                <div className="space-y-6 text-center">
                    <h1 className="text-3xl font-bold">Plug Power — Order online</h1>
                    <p className="text-muted-foreground">
                        This menu is for our Plug Power location. Pickup times and hours may differ from the main bakery.
                    </p>
                    <Button asChild size="lg" className="w-full sm:w-auto">
                        <Link href="/menu">
                            Browse menu
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        );
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
    const regularMenuDisabled = lockedToSpecial;

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

                {cartHasItems && cartMode && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-sm text-amber-900">
                            You have an order in progress from{' '}
                            <span className="font-semibold">
                                {cartMode.type === 'regular' ? 'the Regular Menu' : cartMode.specialName}
                            </span>. Finish or clear your cart to start a different order.
                        </p>
                        <div className="flex gap-2">
                            <Link href="/cart">
                                <Button size="sm" variant="outline">View Cart</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Regular Menu — primary option */}
                <Card className={cn(
                    'relative overflow-hidden border-2 group flex flex-col',
                    regularMenuDisabled
                        ? 'opacity-60 pointer-events-none'
                        : 'hover:shadow-xl transition-all duration-300 hover:border-primary cursor-pointer'
                )}>
                    <Link
                        href="/menu"
                        className="flex flex-col flex-1"
                        aria-disabled={regularMenuDisabled}
                        onClick={(e) => { if (regularMenuDisabled) e.preventDefault(); }}
                    >
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

                {/* Specials — smaller cards below */}
                {hasAvailableSpecials && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold">Available Specials</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableSpecials.map((special) => {
                                const disabled = lockedToRegular || (lockedToSpecial && lockedSpecialId !== special.id);
                                return (
                                <Link
                                    key={special.id}
                                    href={`/order/special/${special.id}`}
                                    aria-disabled={disabled}
                                    onClick={(e) => { if (disabled) e.preventDefault(); }}
                                >
                                    <Card className={cn(
                                        'h-full',
                                        disabled
                                            ? 'opacity-60 pointer-events-none'
                                            : 'hover:shadow-lg transition-shadow cursor-pointer'
                                    )}>
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
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

