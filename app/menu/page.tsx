"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { fetchProducts, fetchProductTypes } from '@/lib/api';
import { Product, CartItem } from '@/types/products';
import { filterProductsForOrderSite } from '@/lib/catalogFilter';
import { getOrderSiteMode } from '@/lib/siteConfig';
import { cn, formatCurrency } from '@/lib/utils';
import ProductModal from '@/components/ProductModal';
import CachedImage from '@/components/CachedImage';
import { ProductStockHint } from '@/components/ProductStockHint';
import { toast } from 'sonner';
import { isUnlimitedStock, remainingUnitsForProduct } from '@/lib/stockUtils';

// Check if product has customization options (sizes, selections, or add-ons)
function productNeedsModal(product: Product): boolean {
    const hasSizes = !!(product.product_sizes && product.product_sizes.length > 0);
    const hasSelections = !!(product.product_selection_values && Object.keys(product.product_selection_values).length > 0);
    const hasAddOns = !!(product.product_add_on_values && Object.keys(product.product_add_on_values).length > 0);
    return hasSizes || hasSelections || hasAddOns;
}

export default function MenuPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [productTypes, setProductTypes] = useState<any[]>([]);
    const { items, addItem, cartMode } = useCart();
    const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const siteMode = getOrderSiteMode();
    const lockedToSpecial = items.length > 0 && cartMode?.type === 'special';

    // Add simple product directly to cart without modal
    const addSimpleProduct = (product: Product) => {
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

        const result = addItem(cartItem, { type: 'regular' });
        if (result.ok) {
            toast.success(`Added ${product.title} to cart`);
        } else if (result.reason === 'insufficient_stock') {
            toast.error(
                result.remaining === 0
                    ? `${product.title} is out of stock.`
                    : `Only ${result.remaining} left — you already have the rest in your cart.`
            );
        } else {
            toast.error('This item uses a different order type than your cart. Clear the cart or finish that order first.');
        }
    };

    const canAddProductFromMenu = (product: Product) => {
        if (lockedToSpecial) return false;
        if (product.quantity === 0) return false;
        if (isUnlimitedStock(product.quantity)) return true;
        return remainingUnitsForProduct(product, items) > 0;
    };

    // Handle add to cart click - either show modal or add directly
    const handleAddToCart = (product: Product) => {
        if (lockedToSpecial) return;
        if (productNeedsModal(product)) {
            setSelectedProduct(product);
        } else {
            addSimpleProduct(product);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            const types = await fetchProductTypes();
            setProductTypes(types);

            const data = await fetchProducts();
            const siteMode = getOrderSiteMode();
            const regularProducts = filterProductsForOrderSite(data, types, siteMode);

            setProducts(regularProducts);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    }

    const categories = ['all', ...new Set(products.map(p => p.typeId))];
    const filteredProducts = filter === 'all'
        ? products
        : products.filter(p => p.typeId === parseInt(filter));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'container px-4 pt-8',
                // Mobile fixed “View Cart” bar (h-14 + bottom-4): keep last row tappable + home indicator
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

                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">
                        {siteMode === 'plugpower' ? 'Plug Power Menu' : 'Regular Menu'}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        {siteMode === 'plugpower'
                            ? 'Order for pickup at our Plug Power location.'
                            : 'Fresh baked goods and more, made daily'}
                    </p>
                </div>

                {lockedToSpecial && cartMode?.type === 'special' && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-sm text-amber-900">
                            You have an order in progress for <span className="font-semibold">{cartMode.specialName}</span>. Finish it or clear your cart to order from the regular menu.
                        </p>
                        <div className="flex gap-2">
                            <Link href="/cart">
                                <Button size="sm" variant="outline">View Cart</Button>
                            </Link>
                            <Link href={`/order/special/${cartMode.specialId}`}>
                                <Button size="sm">Continue Special</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                    >
                        All Items
                    </Button>
                    {Array.from(new Set(products.map(p => p.typeId))).map(typeId => {
                        const typeName = productTypes.find(t => t.id === typeId)?.name || `Category ${typeId}`;
                        return (
                            <Button
                                key={typeId}
                                variant={filter === typeId.toString() ? 'default' : 'outline'}
                                onClick={() => setFilter(typeId.toString())}
                            >
                                {typeName}
                            </Button>
                        );
                    })}
                </div>

                {/* Products Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <Card key={product.id} className="flex flex-col hover:shadow-lg transition-all duration-300 group overflow-hidden">
                            <CardHeader className="p-0 space-y-0 shrink-0">
                                <div className="relative w-full aspect-square overflow-hidden rounded-t-xl bg-muted">
                                    {product.photoUrl ? (
                                        <CachedImage
                                            src={product.photoUrl}
                                            alt={product.title}
                                            fill
                                            containerClassName="absolute inset-0 size-full"
                                            className="rounded-t-xl group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-muted-foreground text-sm">No image</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 pt-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-lg">{product.title}</CardTitle>
                                    {product.special_price && (
                                        <Badge variant="destructive">Sale</Badge>
                                    )}
                                </div>

                                {product.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {product.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-2">
                                    {product.special_price ? (
                                        <>
                                            <span className="text-lg font-bold text-destructive">
                                                {formatCurrency(product.special_price)}
                                            </span>
                                            <span className="text-sm text-muted-foreground line-through">
                                                {formatCurrency(product.price)}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-lg font-bold">
                                            {formatCurrency(product.price)}
                                        </span>
                                    )}
                                </div>

                                <ProductStockHint product={product} items={items} />
                            </CardContent>

                            <CardFooter className="pt-0">
                                <Button
                                    className="w-full"
                                    onClick={() => handleAddToCart(product)}
                                    disabled={!canAddProductFromMenu(product)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add to Cart
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-lg text-muted-foreground">No products found in this category.</p>
                    </div>
                )}

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

            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    open={!!selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    mode={{ type: 'regular' }}
                />
            )}
        </div>
    );
}

