"use client"

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CartItem } from '@/types/products';
import { findMatchingItemIndex } from '@/lib/cartUtils';
import { fetchProductTypes } from '@/lib/api';

// Cart can be in 'regular' mode (normal menu) or 'special' mode (ordering from a special)
type CartMode = { type: 'regular' } | { type: 'special'; specialId: number; specialName: string };

interface CartContextType {
    items: CartItem[];
    cartMode: CartMode | null;
    addItem: (item: CartItem, mode: CartMode) => boolean; // Returns false if mode conflict
    removeItem: (index: number) => void;
    updateQuantity: (index: number, quantity: number) => void;
    clearCart: () => void;
    switchMode: (newMode: CartMode, initialItem?: CartItem) => void; // Clears cart and switches mode, optionally adds an item
    subtotal: number;
    tax: number;
    total: number;
    isLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TAX_RATE = 0.08;

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [cartMode, setCartMode] = useState<CartMode | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [productTypes, setProductTypes] = useState<any[]>([]);

    // Load cart from localStorage and fetch product types on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        const savedMode = localStorage.getItem('cartMode');
        if (savedCart) {
            try {
                const parsedItems = JSON.parse(savedCart);
                setItems(parsedItems);
                // Only restore cart mode if there are actually items in the cart
                if (parsedItems.length > 0 && savedMode) {
                    try {
                        setCartMode(JSON.parse(savedMode));
                    } catch (e) {
                        console.error('Failed to load cart mode:', e);
                    }
                } else if (parsedItems.length === 0) {
                    // Clear cart mode if cart is empty
                    setCartMode(null);
                }
            } catch (e) {
                console.error('Failed to load cart:', e);
            }
        } else if (savedMode) {
            // If no cart but mode exists, clear it
            try {
                const parsedMode = JSON.parse(savedMode);
                // Only set mode if it's not empty (defensive check)
                console.log('[CartContext] Found saved mode but no cart items, clearing mode:', parsedMode);
            } catch (e) {
                console.error('Failed to parse saved mode:', e);
            }
            setCartMode(null);
        }

        // Fetch product types to determine which items are tax-exempt
        fetchProductTypes()
            .then(types => {
                setProductTypes(types);
                setIsLoaded(true);
            })
            .catch(error => {
                console.error('Failed to fetch product types:', error);
                setIsLoaded(true); // Still mark as loaded even if types fail
            });
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(items));
        if (cartMode) {
            localStorage.setItem('cartMode', JSON.stringify(cartMode));
        } else {
            localStorage.removeItem('cartMode');
        }
    }, [items, cartMode]);

    // Check if modes are compatible
    // If cart is empty (no items), it should accept any mode regardless of cartMode
    const modesMatch = (mode1: CartMode | null, mode2: CartMode): boolean => {
        // If cart is empty, accept any mode (even if cartMode is set from localStorage)
        if (items.length === 0) return true;
        if (!mode1) return true; // No mode set accepts any mode
        if (mode1.type !== mode2.type) return false;
        if (mode1.type === 'special' && mode2.type === 'special') {
            return mode1.specialId === mode2.specialId;
        }
        return true;
    };

    const addItem = (item: CartItem, mode: CartMode): boolean => {
        console.log('[CartContext] addItem called:', {
            item: { productId: item.productId, product_name: item.product_name },
            mode,
            currentCartMode: cartMode,
            currentItemsCount: items.length,
            modesMatch: modesMatch(cartMode, mode)
        });

        // Check if mode matches current cart
        if (!modesMatch(cartMode, mode)) {
            console.warn('[CartContext] Mode conflict detected:', { cartMode, requestedMode: mode });
            return false; // Mode conflict - caller should handle this
        }

        // Set mode if cart was empty
        if (!cartMode) {
            console.log('[CartContext] Setting cart mode:', mode);
            setCartMode(mode);
        }

        setItems(prev => {
            // Check if an identical item already exists (same composite key)
            const matchingIndex = findMatchingItemIndex(prev, item);

            if (matchingIndex >= 0) {
                // Item already exists, increment quantity
                return prev.map((existingItem, index) =>
                    index === matchingIndex
                        ? { ...existingItem, quantity: existingItem.quantity + item.quantity }
                        : existingItem
                );
            } else {
                // New item, add to cart
                return [...prev, item];
            }
        });
        return true;
    };

    const switchMode = (newMode: CartMode, initialItem?: CartItem) => {
        // If an initial item is provided, add it immediately after clearing
        // This avoids React state batching issues where addItem would fail
        setItems(initialItem ? [initialItem] : []);
        setCartMode(newMode);
    };

    const removeItem = (index: number) => {
        setItems(prev => {
            const newItems = prev.filter((_, i) => i !== index);
            // Clear cart mode if cart becomes empty
            if (newItems.length === 0) {
                setCartMode(null);
            }
            return newItems;
        });
    };

    const updateQuantity = (index: number, quantity: number) => {
        if (quantity <= 0) {
            removeItem(index);
            return;
        }

        setItems(prev => {
            const newItems = prev.map((item, i) =>
                i === index ? { ...item, quantity } : item
            );
            // Clear cart mode if cart becomes empty
            if (newItems.length === 0) {
                setCartMode(null);
            }
            return newItems;
        });
    };

    const clearCart = () => {
        setItems([]);
        setCartMode(null);
        localStorage.removeItem('cart');
        localStorage.removeItem('cartMode');
    };

    // Calculate item cost including selections and add-ons
    const getItemCost = (item: CartItem): number => {
        let cost = item.price;

        // Add selections costs
        if (item.selections) {
            Object.values(item.selections).forEach(selection => {
                if (selection.cost) {
                    cost += selection.cost;
                }
            });
        }

        // Add add-ons costs
        if (item.add_ons) {
            Object.values(item.add_ons).forEach(addOnArray => {
                if (Array.isArray(addOnArray)) {
                    addOnArray.forEach(addOn => {
                        if (addOn.cost) {
                            cost += addOn.cost;
                        }
                    });
                }
            });
        }

        return cost;
    };

    // Check if an item should be taxed (Bread items are tax-exempt)
    const shouldBeTaxed = (item: CartItem): boolean => {
        const breadType = productTypes.find(type => type.name === 'Bread');
        return breadType ? item.typeId !== breadType.id : true; // Default to taxable if types not loaded
    };

    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const itemCost = getItemCost(item);
            return sum + (itemCost * item.quantity);
        }, 0);
    }, [items]);

    const tax = useMemo(() => {
        let taxableTotal = 0;
        for (const item of items) {
            if (shouldBeTaxed(item)) {
                const itemCost = getItemCost(item);
                taxableTotal += itemCost * item.quantity * TAX_RATE;
            }
        }
        return Math.round(taxableTotal * 100) / 100; // Round to 2 decimal places
    }, [items, productTypes]);

    const total = subtotal + tax;

    return (
        <CartContext.Provider value={{
            items,
            cartMode,
            addItem,
            removeItem,
            updateQuantity,
            clearCart,
            switchMode,
            subtotal,
            tax,
            total,
            isLoaded,
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
}



