"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Sparkles, ArrowRight, ShoppingCart } from 'lucide-react';
import { fetchSpecials } from '@/lib/api';
import { Special } from '@/types/special';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import CachedImage from '@/components/CachedImage';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';

export default function SpecialsPage() {
    const [specials, setSpecials] = useState<Special[]>([]);
    const [loading, setLoading] = useState(true);
    const { cartMode, items, switchMode } = useCart();
    const [showConflictDialog, setShowConflictDialog] = useState(false);
    const [pendingSpecial, setPendingSpecial] = useState<Special | null>(null);
    const router = useRouter();

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

    const now = new Date();

    // Show specials that are active OR upcoming (end date in the future)
    const availableSpecials = specials.filter(s => {
        const endDate = new Date(s.end);
        return s.active || endDate > now;
    });

    const isUpcoming = (special: Special) => new Date(special.start) > now;
    const isActive = (special: Special) => special.active;

    // Check if ordering from a special would conflict with current cart
    const wouldConflict = (special: Special) => {
        if (items.length === 0) return false;
        if (!cartMode) return false;
        if (cartMode.type === 'regular') return true;
        if (cartMode.type === 'special' && cartMode.specialId !== special.id) return true;
        return false;
    };

    const handleOrderClick = (special: Special, e: React.MouseEvent) => {
        e.preventDefault();
        
        if (wouldConflict(special)) {
            setPendingSpecial(special);
            setShowConflictDialog(true);
        } else {
            router.push(`/order/special/${special.id}`);
        }
    };

    const handleConfirmSwitch = () => {
        if (pendingSpecial) {
            switchMode({ type: 'special', specialId: pendingSpecial.id, specialName: pendingSpecial.name });
            router.push(`/order/special/${pendingSpecial.id}`);
        }
        setShowConflictDialog(false);
        setPendingSpecial(null);
    };

    const getConflictMessage = () => {
        if (!cartMode || !pendingSpecial) return '';
        
        if (cartMode.type === 'regular') {
            return `You have items from the Regular Menu in your cart. Ordering from "${pendingSpecial.name}" will clear your cart.`;
        } else if (cartMode.type === 'special') {
            return `You have items from "${cartMode.specialName}" in your cart. Ordering from "${pendingSpecial.name}" will clear your cart.`;
        }
        return '';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container px-4 py-8 max-w-6xl mx-auto">
            <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                        <Sparkles className="h-10 w-10 text-orange-500" />
                        <h1 className="text-4xl font-bold">Weekly Specials</h1>
                    </div>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Check out our special offerings and limited-time deals. 
                        Click on a special to browse and order!
                    </p>
                </div>

                {/* Cart Mode Indicator */}
                {items.length > 0 && cartMode && (
                    <div className="flex items-center justify-center">
                        <Badge variant="outline" className="text-sm px-4 py-2">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Cart has {items.length} item{items.length !== 1 ? 's' : ''} from: {' '}
                            {cartMode.type === 'regular' ? 'Regular Menu' : cartMode.specialName}
                        </Badge>
                    </div>
                )}

                {availableSpecials.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                        {availableSpecials.map((special) => {
                            const upcoming = isUpcoming(special);
                            const active = isActive(special);
                            const hasConflict = wouldConflict(special);
                            const isCurrentSpecial = cartMode?.type === 'special' && cartMode.specialId === special.id;

                            return (
                                <Card 
                                    key={special.id} 
                                    className={`overflow-hidden transition-all duration-300 border-2 group cursor-pointer
                                        ${isCurrentSpecial ? 'border-green-500 shadow-lg' : 'hover:border-orange-400 hover:shadow-xl'}
                                    `}
                                >
                                    <Link 
                                        href={`/order/special/${special.id}`}
                                        onClick={(e) => handleOrderClick(special, e)}
                                        className="block"
                                    >
                                        {/* Status Badges */}
                                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                                            {isCurrentSpecial && (
                                                <Badge className="bg-green-500 hover:bg-green-600">
                                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                                    In Cart
                                                </Badge>
                                            )}
                                            {upcoming ? (
                                                <Badge className="bg-blue-500 hover:bg-blue-600">
                                                    Coming Soon
                                                </Badge>
                                            ) : active ? (
                                                <Badge className="bg-orange-500 hover:bg-orange-600">
                                                    <Sparkles className="h-3 w-3 mr-1" />
                                                    Active Now
                                                </Badge>
                                            ) : null}
                                        </div>

                                        {/* Image */}
                                        {special.photoUrl ? (
                                            <div className="h-56 overflow-hidden relative">
                                                <CachedImage
                                                    src={special.photoUrl}
                                                    alt={special.name}
                                                    fill
                                                    containerClassName="w-full h-full"
                                                    className="group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-56 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                                                <Sparkles className="h-20 w-20 text-orange-400" />
                                            </div>
                                        )}

                                        <CardHeader>
                                            <CardTitle className="text-2xl">{special.name}</CardTitle>
                                            {special.description && (
                                                <CardDescription className="text-base">
                                                    {special.description}
                                                </CardDescription>
                                            )}
                                        </CardHeader>

                                        <CardContent className="space-y-4">
                                            {/* Date Range */}
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    {formatDate(special.start)} - {formatDate(special.end)}
                                                </span>
                                            </div>

                                            {/* Featured Products Preview */}
                                            {special.products && special.products.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-sm">Featured Items:</h4>
                                                    <div className="flex flex-wrap gap-1">
                                                        {special.products.slice(0, 4).map((product) => (
                                                            <Badge key={product.id} variant="secondary" className="text-xs">
                                                                {product.title}
                                                            </Badge>
                                                        ))}
                                                        {special.products.length > 4 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{special.products.length - 4} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Order Button */}
                                            <Button 
                                                className={`w-full transition-colors ${
                                                    isCurrentSpecial 
                                                        ? 'bg-green-500 hover:bg-green-600' 
                                                        : 'group-hover:bg-orange-500'
                                                }`}
                                            >
                                                {isCurrentSpecial ? (
                                                    <>
                                                        Continue Ordering
                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                    </>
                                                ) : upcoming ? (
                                                    <>
                                                        Pre-Order Now
                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Order Now
                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                    </>
                                                )}
                                            </Button>

                                            {/* Conflict Warning */}
                                            {hasConflict && (
                                                <p className="text-xs text-amber-600 text-center">
                                                    ⚠️ Ordering from here will clear your current cart
                                                </p>
                                            )}
                                        </CardContent>
                                    </Link>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="max-w-lg mx-auto">
                        <CardContent className="pt-12 pb-12 text-center space-y-4">
                            <Sparkles className="h-16 w-16 text-muted-foreground mx-auto" />
                            <p className="text-lg text-muted-foreground">
                                No active specials at this time.
                            </p>
                            <p className="text-muted-foreground">
                                Check back soon for our next special offering!
                            </p>
                            <Link href="/menu">
                                <Button className="mt-4">
                                    Browse Regular Menu
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Link to Regular Menu */}
                {availableSpecials.length > 0 && (
                    <div className="text-center pt-4">
                        <p className="text-muted-foreground mb-4">
                            Looking for something else?
                        </p>
                        <Link href="/menu">
                            <Button variant="outline" size="lg">
                                Browse Regular Menu
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Mode Conflict Dialog */}
            <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Switch to Different Special?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {getConflictMessage()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingSpecial(null)}>
                            Keep Current Cart
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmSwitch}>
                            Clear Cart & Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
