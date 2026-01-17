"use client"

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Calendar, ArrowLeft, ShoppingCart } from 'lucide-react';
import { fetchSpecials } from '@/lib/api';
import { Special } from '@/types/special';
import { Product, CartItem } from '@/types/products';
import { formatCurrency, formatSpecialDateRange } from '@/lib/utils';
import ProductModal from '@/components/ProductModal';
import CachedImage from '@/components/CachedImage';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
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

// Check if product has customization options (sizes, selections, or add-ons)
function productNeedsModal(product: Product): boolean {
    const hasSizes = !!(product.product_sizes && product.product_sizes.length > 0);
    const hasSelections = !!(product.product_selection_values && Object.keys(product.product_selection_values).length > 0);
    const hasAddOns = !!(product.product_add_on_values && Object.keys(product.product_add_on_values).length > 0);
    return hasSizes || hasSelections || hasAddOns;
}

export default function SpecialOrderPage() {
    const params = useParams();
    const specialId = parseInt(params.id as string);

    const [special, setSpecial] = useState<Special | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showModeConflictDialog, setShowModeConflictDialog] = useState(false);
    const [pendingCartItem, setPendingCartItem] = useState<CartItem | null>(null);
    const { items, addItem, cartMode, switchMode } = useCart();

    // Add simple product directly to cart without modal
    const addSimpleProduct = (product: Product) => {
        if (!special) {
            console.error('Cannot add product: special is null');
            toast.error('Error: Special information is missing');
            return;
        }

        const cartItem: CartItem = {
            productId: product.id,
            product_name: product.title,
            quantity: 1,
            price: product.special_price || product.price,
            product_size_id: null,
            selections: {},
            add_ons: {},
            typeId: product.typeId,
            product: product,
        };

        console.log('Attempting to add item to cart:', {
            cartItem,
            mode: { type: 'special', specialId: special.id, specialName: special.name },
            currentCartMode: cartMode,
            currentItems: items
        });

        const success = addItem(cartItem, { type: 'special', specialId: special.id, specialName: special.name });
        if (success) {
            toast.success(`Added ${product.title} to cart`);
        } else {
            // Mode conflict - show confirmation dialog
            console.error('[SpecialOrderPage] Failed to add item to cart. Showing conflict dialog:', {
                cartMode,
                requestedMode: { type: 'special', specialId: special.id, specialName: special.name },
                itemsCount: items.length,
                cartItem
            });
            setPendingCartItem(cartItem);
            setShowModeConflictDialog(true);
            console.log('[SpecialOrderPage] Dialog state set:', {
                showModeConflictDialog: true,
                pendingCartItem: cartItem
            });
        }
    };

    const handleConfirmModeSwitch = () => {
        if (pendingCartItem && special) {
            // Switch mode and add the item
            switchMode(
                { type: 'special', specialId: special.id, specialName: special.name },
                pendingCartItem
            );
            toast.success(`Cart cleared. Added ${pendingCartItem.product_name} to cart`);
        }
        setShowModeConflictDialog(false);
        setPendingCartItem(null);
    };

    const getConflictMessage = () => {
        if (!cartMode || !special) return '';

        if (cartMode.type === 'regular') {
            return `You currently have items from the Regular Menu in your cart. Adding items from "${special.name}" will clear your cart.`;
        } else if (cartMode.type === 'special') {
            return `You currently have items from "${cartMode.specialName}" in your cart. Adding items from "${special.name}" will clear your cart.`;
        }
        return '';
    };

    // Handle add to cart click - either show modal or add directly
    const handleAddToCart = (product: Product) => {
        if (productNeedsModal(product)) {
            setSelectedProduct(product);
        } else {
            addSimpleProduct(product);
        }
    };

    useEffect(() => {
        loadSpecial();
    }, [specialId]);

    // Debug: Log dialog state changes
    useEffect(() => {
        if (showModeConflictDialog) {
            console.log('[SpecialOrderPage] Dialog should be visible:', {
                showModeConflictDialog,
                hasPendingCartItem: !!pendingCartItem,
                cartMode,
                itemsCount: items.length
            });
        }
    }, [showModeConflictDialog, pendingCartItem, cartMode, items.length]);

    async function loadSpecial() {
        try {
            const specials = await fetchSpecials();
            const found = specials.find((s: Special) => s.id === specialId);
            setSpecial(found || null);
        } catch (error) {
            console.error('Failed to load special:', error);
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

    if (!special) {
        return (
            <div className="container px-4 py-8">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Special Not Found</h1>
                    <p className="text-muted-foreground">This special may no longer be available.</p>
                    <Link href="/order">
                        <Button>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Order
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const products = special.products || [];
    const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="container px-4 py-8">
            <div className="space-y-6">
                {/* Back Button & Cart */}
                <div className="flex items-center justify-between">
                    <Link href="/order">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    </Link>

                    {cartItemCount > 0 && (
                        <Link href="/cart">
                            <Button className="gap-2">
                                <ShoppingCart className="h-4 w-4" />
                                View Cart ({cartItemCount})
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Special Header */}
                <div className="relative rounded-xl overflow-hidden">
                    {special.photoUrl && (
                        <div className="absolute inset-0">
                            <CachedImage
                                src={special.photoUrl}
                                alt={special.name}
                                fill
                                containerClassName="w-full h-full"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        </div>
                    )}

                    <div className={`relative ${special.photoUrl ? 'text-white py-16 px-6' : 'py-8'}`}>
                        <div className="max-w-2xl">
                            <h1 className="text-4xl font-bold mb-2">{special.name}</h1>
                            {special.description && (
                                <p className={`text-lg ${special.photoUrl ? 'text-gray-200' : 'text-muted-foreground'} mb-4`}>
                                    {special.description}
                                </p>
                            )}
                            <div className={`flex items-center gap-2 text-sm ${special.photoUrl ? 'text-gray-300' : 'text-muted-foreground'}`}>
                                <Calendar className="h-4 w-4" />
                                <span>Available: {formatSpecialDateRange(special.start, special.end)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Grid - Same style as Menu */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Available Items</h2>

                    {products.length > 0 ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.map((product) => (
                                <Card key={product.id} className="flex flex-col hover:shadow-lg transition-shadow">
                                    <CardHeader className="p-0">
                                        {product.photoUrl ? (
                                            <CachedImage
                                                src={product.photoUrl}
                                                alt={product.title}
                                                fill
                                                containerClassName="w-full h-48 rounded-t-lg"
                                                className="rounded-t-lg"
                                            />
                                        ) : (
                                            <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 rounded-t-lg flex items-center justify-center">
                                                <span className="text-4xl">🥖</span>
                                            </div>
                                        )}
                                    </CardHeader>

                                    <CardContent className="flex-1 pt-4">
                                        <h3 className="font-semibold text-lg mb-1">{product.title}</h3>
                                        {product.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                {product.description}
                                            </p>
                                        )}
                                        <p className="font-bold text-lg text-primary">
                                            {formatCurrency(product.price)}
                                        </p>
                                    </CardContent>

                                    <CardFooter className="pt-0">
                                        <Button
                                            className="w-full"
                                            onClick={() => handleAddToCart(product)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add to Cart
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">
                                    No products available for this special yet.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sticky Cart Button (Mobile) */}
                {cartItemCount > 0 && (
                    <div className="fixed bottom-4 left-4 right-4 md:hidden">
                        <Link href="/cart">
                            <Button className="w-full h-14 text-lg shadow-lg">
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                View Cart ({cartItemCount} items)
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Product Modal */}
            {selectedProduct && special && (
                <ProductModal
                    product={selectedProduct}
                    open={true}
                    onClose={() => setSelectedProduct(null)}
                    mode={{ type: 'special', specialId: special.id, specialName: special.name }}
                />
            )}

            {/* Mode Conflict Dialog */}
            <AlertDialog
                open={showModeConflictDialog}
                onOpenChange={(open) => {
                    console.log('[SpecialOrderPage] Dialog onOpenChange:', open);
                    if (!open) {
                        setShowModeConflictDialog(false);
                        setPendingCartItem(null);
                    } else {
                        setShowModeConflictDialog(true);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Switch Cart Mode?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {getConflictMessage() || 'Adding this item will clear your current cart.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setShowModeConflictDialog(false);
                                setPendingCartItem(null);
                            }}
                        >
                            Keep Current Cart
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmModeSwitch}>
                            Clear Cart & Add Item
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

