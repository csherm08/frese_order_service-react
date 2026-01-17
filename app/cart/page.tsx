"use client"

import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Trash2, Plus, Minus, ShoppingBag, Sparkles, ChefHat } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CachedImage from '@/components/CachedImage';

// Calculate item cost including selections and add-ons
function getItemCost(item: any): number {
    let cost = item.price;
    
    // Add selections costs
    if (item.selections) {
        Object.values(item.selections).forEach((selection: any) => {
            if (selection.cost) {
                cost += selection.cost;
            }
        });
    }
    
    // Add add-ons costs
    if (item.add_ons) {
        Object.values(item.add_ons).forEach((addOnArray: any) => {
            if (Array.isArray(addOnArray)) {
                addOnArray.forEach((addOn: any) => {
                    if (addOn.cost) {
                        cost += addOn.cost;
                    }
                });
            }
        });
    }
    
    return cost;
}

export default function CartPage() {
    const { items, removeItem, updateQuantity, subtotal, tax, total, clearCart, cartMode } = useCart();
    const router = useRouter();

    // Determine where "Continue Shopping" should link to
    const continueShoppingLink = cartMode?.type === 'special'
        ? `/order/special/${cartMode.specialId}`
        : '/menu';

    if (items.length === 0) {
        return (
            <div className="container px-4 py-16">
                <Card className="max-w-lg mx-auto">
                    <CardContent className="pt-6 text-center space-y-6">
                        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Your cart is empty</h2>
                            <p className="text-muted-foreground">
                                Add some delicious items to your cart to get started!
                            </p>
                        </div>
                        <Button asChild size="lg">
                            <Link href="/menu">Browse Menu</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container px-4 py-8">
            <div className="flex items-center gap-4 mb-8">
                <h1 className="text-4xl font-bold">Shopping Cart</h1>
                {cartMode && (
                    <Badge variant="outline" className="text-sm py-1 px-3">
                        {cartMode.type === 'special' ? (
                            <>
                                <Sparkles className="h-3 w-3 mr-1 inline" />
                                {cartMode.specialName}
                            </>
                        ) : (
                            <>
                                <ChefHat className="h-3 w-3 mr-1 inline" />
                                Regular Menu
                            </>
                        )}
                    </Badge>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item, index) => (
                        <Card key={index}>
                            <CardContent className="p-6">
                                <div className="flex gap-4">
                                    {/* Product Image */}
                                    {item.product?.photoUrl ? (
                                        <CachedImage
                                            src={item.product.photoUrl}
                                            alt={item.product_name}
                                            fill
                                            containerClassName="w-24 h-24 rounded-lg flex-shrink-0"
                                            className="rounded-lg"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-gray-400 text-xs">No image</span>
                                        </div>
                                    )}

                                    {/* Product Details */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between">
                                            <div>
                                                <h3 className="font-semibold text-lg">{item.product_name}</h3>
                                                {item.product_size_id && item.product?.product_sizes && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Size: {item.product.product_sizes.find(s => s.id === item.product_size_id)?.size}
                                                    </p>
                                                )}
                                                {Object.keys(item.selections).length > 0 && (
                                                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                                        {Object.entries(item.selections).map(([key, value]) => (
                                                            <p key={key}>{key}: {value.value}</p>
                                                        ))}
                                                    </div>
                                                )}
                                                {Object.keys(item.add_ons).length > 0 && (
                                                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                                        <p className="font-medium">Extras:</p>
                                                        {Object.entries(item.add_ons).map(([key, values]) => (
                                                            <p key={key}>{key}: {values.map(v => v.value).join(', ')}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItem(index)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => updateQuantity(index, item.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => updateQuantity(index, item.quantity + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-semibold text-lg">
                                                    {formatCurrency(getItemCost(item) * item.quantity)}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatCurrency(getItemCost(item))} each
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button
                        variant="outline"
                        onClick={clearCart}
                        className="w-full"
                    >
                        Clear Cart
                    </Button>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                        <CardContent className="p-6 space-y-4">
                            <h2 className="text-2xl font-bold">Order Summary</h2>

                            <div className="space-y-2 py-4 border-b">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax (8%)</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between text-xl font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => router.push('/checkout')}
                            >
                                Proceed to Checkout
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full"
                                asChild
                            >
                                <Link href={continueShoppingLink}>Continue Shopping</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

