import type { CartItem, Product } from "@/types/products"

/** Backend: -1 means unlimited inventory */
export function isUnlimitedStock(q: number | undefined | null): boolean {
    return q === -1 || q === undefined || q === null
}

export function totalQuantityInCartForProduct(productId: number, items: CartItem[]): number {
    return items.filter((i) => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0)
}

export function remainingUnitsForProduct(product: Product, items: CartItem[]): number {
    if (isUnlimitedStock(product.quantity)) {
        return Number.MAX_SAFE_INTEGER
    }
    return Math.max(0, product.quantity - totalQuantityInCartForProduct(product.id, items))
}

/**
 * Max units this line may hold (finite stock). Same productId may appear on multiple lines
 * (different sizes/options); they share one inventory pool.
 */
export function maxQuantityForCartLine(items: CartItem[], lineIndex: number): number {
    const line = items[lineIndex]
    if (!line) return 0
    if (!line.product || isUnlimitedStock(line.product.quantity)) {
        return Number.MAX_SAFE_INTEGER
    }
    const stock = line.product.quantity
    const usedElsewhere =
        totalQuantityInCartForProduct(line.productId, items) - line.quantity
    return Math.max(0, stock - usedElsewhere)
}

/** Whether `item` can be added on top of `cartItems` (merge = same composite key adds `item.quantity`). */
export function canAddQuantityForProduct(cartItems: CartItem[], item: CartItem): boolean {
    const stock = item.product?.quantity
    if (isUnlimitedStock(stock) || stock === undefined) return true
    const current = totalQuantityInCartForProduct(item.productId, cartItems)
    return current + item.quantity <= stock
}

export function remainingBeforeAdd(cartItems: CartItem[], item: CartItem): number {
    const stock = item.product?.quantity
    if (isUnlimitedStock(stock) || stock === undefined) return Number.MAX_SAFE_INTEGER
    return Math.max(0, stock - totalQuantityInCartForProduct(item.productId, cartItems))
}
