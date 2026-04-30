"use client"

import type { CartItem, Product } from "@/types/products"
import { isUnlimitedStock, remainingUnitsForProduct } from "@/lib/stockUtils"

/**
 * Shown on catalog cards when inventory is finite so customers (and E2E) see limits before adding.
 */
export function ProductStockHint({ product, items }: { product: Product; items: CartItem[] }) {
    if (isUnlimitedStock(product.quantity)) return null

    const remaining = remainingUnitsForProduct(product, items)
    const cannotAdd = product.quantity <= 0 || remaining <= 0

    if (cannotAdd) {
        return (
            <p
                className="text-base font-bold tracking-wide text-destructive"
                data-testid="product-stock-hint"
            >
                SOLD OUT
            </p>
        )
    }

    return (
        <p
            className="text-base font-bold tabular-nums tracking-tight text-amber-950 dark:text-amber-100"
            data-testid="product-stock-hint"
        >
            <span className="rounded-md bg-amber-100 px-2 py-1 dark:bg-amber-950/60 dark:ring-1 dark:ring-amber-800/80">
                {remaining} Left
            </span>
        </p>
    )
}
