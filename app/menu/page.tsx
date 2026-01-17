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
import { formatCurrency } from '@/lib/utils';
import ProductModal from '@/components/ProductModal';
import CachedImage from '@/components/CachedImage';
import { toast } from 'sonner';

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
    const [specialTypeId, setSpecialTypeId] = useState<number | null>(null);
    const [productTypes, setProductTypes] = useState<any[]>([]);
    const { items, addItem } = useCart();
    const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

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

        const success = addItem(cartItem, { type: 'regular' });
        if (success) {
            toast.success(`Added ${product.title} to cart`);
        }
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
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            // Fetch product types first to get the "Special" typeId and category names
            const types = await fetchProductTypes();
            setProductTypes(types);

            const specialType = types.find((t: any) => t.name === 'Special');
            const specialId = specialType?.id;
            setSpecialTypeId(specialId);

            // Fetch all products
            const data = await fetchProducts();

            // Filter out "Special" type products, "Superbowl Special" type products (typeId 10), and "Catering" type products
            const cateringType = types.find((t: any) => t.name === 'Catering');
            const cateringId = cateringType?.id;

            const regularProducts = data.filter((p: Product) => {
                // Exclude "Special" type
                if (specialId && p.typeId === specialId) {
                    return false;
                }
                // Exclude "Superbowl Special" type (typeId 10)
                if (p.typeId === 10) {
                    return false;
                }
                // Exclude "Catering" type
                if (cateringId && p.typeId === cateringId) {
                    return false;
                }
                return true;
            });

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

                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">Regular Menu</h1>
                    <p className="text-lg text-muted-foreground">
                        Fresh baked goods and more, made daily
                    </p>
                </div>

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
                        <Card key={product.id} className="flex flex-col hover:shadow-lg transition-shadow">
                            <CardHeader className="p-0">
                                {product.photoUrl ? (
                                    <CachedImage
                                        src={product.photoUrl}
                                        alt={product.title}
                                        fill
                                        containerClassName="w-full h-48 rounded-t-xl"
                                        className="rounded-t-xl"
                                    />
                                ) : (
                                    <div className="w-full h-48 bg-gray-200 rounded-t-xl flex items-center justify-center">
                                        <span className="text-gray-400">No image</span>
                                    </div>
                                )}
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

                                {product.quantity === 0 && (
                                    <Badge variant="secondary">Sold Out</Badge>
                                )}
                            </CardContent>

                            <CardFooter className="pt-0">
                                <Button
                                    className="w-full"
                                    onClick={() => handleAddToCart(product)}
                                    disabled={product.quantity === 0}
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

