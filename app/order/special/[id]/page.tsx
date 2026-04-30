"use client"

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Calendar, ArrowLeft, ShoppingCart } from 'lucide-react';
import { fetchSpecials, fetchProductTypes } from '@/lib/api';
import { Special } from '@/types/special';
import { Product, CartItem } from '@/types/products';
import { cn, formatCurrency, formatSpecialDateRange } from '@/lib/utils';
import ProductModal from '@/components/ProductModal';
import CachedImage from '@/components/CachedImage';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { isUnlimitedStock, remainingUnitsForProduct } from '@/lib/stockUtils';
import { ProductStockHint } from '@/components/ProductStockHint';
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

/** After API order is applied, list true “Special”-type products first (e.g. entrée vs add-on breads). */
function sortSpecialTypeProductsFirst(specialTypeId: number | null, products: Product[]): Product[] {
    if (!products.length || specialTypeId == null) return products;
    const primary = products.filter((p) => p.typeId === specialTypeId);
    if (primary.length === 0) return products;
    const other = products.filter((p) => p.typeId !== specialTypeId);
    return [...primary, ...other];
}

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
    const [specialTypeId, setSpecialTypeId] = useState<number | null>(null);
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

        const result = addItem(cartItem, { type: 'special', specialId: special.id, specialName: special.name });
        if (result.ok) {
            toast.success(`Added ${product.title} to cart`);
        } else if (result.reason === 'insufficient_stock') {
            toast.error(
                result.remaining === 0
                    ? `${product.title} is out of stock.`
                    : `Only ${result.remaining} left — you already have the rest in your cart.`
            );
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

    const canAddProductFromSpecial = (product: Product) => {
        if (product.quantity === 0) return false;
        if (isUnlimitedStock(product.quantity)) return true;
        return remainingUnitsForProduct(product, items) > 0;
    };

    const handleConfirmModeSwitch = () => {
        if (pendingCartItem && special) {
            const ok = switchMode(
                { type: 'special', specialId: special.id, specialName: special.name },
                pendingCartItem
            );
            if (ok) {
                toast.success(`Cart cleared. Added ${pendingCartItem.product_name} to cart`);
            } else {
                toast.error('Not enough stock left for that item.');
            }
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
            const [specials, types] = await Promise.all([fetchSpecials(), fetchProductTypes()]);
            const specialRow = types.find((t: { name: string }) => t.name === 'Special');
            setSpecialTypeId(specialRow?.id ?? null);
            const found = specials.find((s: Special) => s.id === specialId);
            setSpecial(found || null);
        } catch (error) {
            console.error('Failed to load special:', error);
        } finally {
            setLoading(false);
        }
    }

    const displayProducts = useMemo(
        () => sortSpecialTypeProductsFirst(specialTypeId, special?.products ?? []),
        [special?.products, specialTypeId],
    );

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

    const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div
            className={cn(
                'container px-4 pt-8',
                cartItemCount > 0
                    ? 'pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-8'
                    : 'pb-8'
            )}
        >
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

                {/* Orderable items first — main reason visitors open this page */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{special.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Available: {formatSpecialDateRange(special.start, special.end)}</span>
                        </div>
                    </div>

                    {displayProducts.length > 0 ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {displayProducts.map((product) => (
                                <Card key={product.id} className="flex flex-col hover:shadow-lg transition-shadow">
                                    <CardHeader className="p-0 space-y-0 shrink-0">
                                        <div className="relative w-full aspect-square overflow-hidden rounded-t-lg bg-muted">
                                            {product.photoUrl ? (
                                                <CachedImage
                                                    src={product.photoUrl}
                                                    alt={product.title}
                                                    fill
                                                    containerClassName="absolute inset-0 size-full"
                                                    className="rounded-t-lg"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
                                                    <span className="text-4xl">🥖</span>
                                                </div>
                                            )}
                                        </div>
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
                                        <ProductStockHint product={product} items={items} />
                                    </CardContent>

                                    <CardFooter className="pt-0">
                                        <Button
                                            className="w-full"
                                            onClick={() => handleAddToCart(product)}
                                            disabled={!canAddProductFromSpecial(product)}
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

