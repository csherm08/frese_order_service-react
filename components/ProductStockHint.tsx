"use client"

import type { CartItem, Product } from "@/types/products"
import { isUnlimitedStock, remainingUnitsForProduct } from "@/lib/stockUtils"

/**
 * Shown on catalog cards when a finite-stock product is exhausted. Remaining
 * counts are deliberately NOT shown to customers (owner's choice 2026-09) —
 * stock still limits what the cart will accept; the only public signal is
 * SOLD OUT.
 */
export function ProductStockHint({ product, items }: { product: Product; items: CartItem[] }) {
    if (isUnlimitedStock(product.quantity)) return null

    const remaining = remainingUnitsForProduct(product, items)
    const cannotAdd = product.quantity <= 0 || remaining <= 0

    if (!cannotAdd) return null

    return (
        <p
            className="text-base font-bold tracking-wide text-destructive"
            data-testid="product-stock-hint"
        >
            SOLD OUT
        </p>
    )
}
