import type { CartItem, Product } from "@/types/products"

/** Backend: -1 means unlimited inventory */
export function isUnlimitedStock(q: number | undefined | null): boolean {
    return q === -1 || q === undefined || q === null
}

export function totalQuantityInCartForProduct(productId: number, items: CartItem[]): number {
    return items.filter((i) => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0)
}

/**
 * Units already in the cart that draw down a product's stock pool. For
 * stock_by_type products (pizza/wings) the pool is shared across the whole
 * type, so count every cart item of that type; otherwise just this product.
 * `product` may be undefined → falls back to counting by productId.
 */
export function unitsDrawnFromPool(
    product: Product | undefined,
    productId: number,
    items: CartItem[],
): number {
    if (product?.stock_by_type) {
        return items
            .filter((i) => (i.product?.typeId ?? i.typeId) === product.typeId)
            .reduce((sum, i) => sum + i.quantity, 0)
    }
    return totalQuantityInCartForProduct(productId, items)
}

export function remainingUnitsForProduct(product: Product, items: CartItem[]): number {
    if (isUnlimitedStock(product.quantity)) {
        return Number.MAX_SAFE_INTEGER
    }
    return Math.max(0, product.quantity - unitsDrawnFromPool(product, product.id, items))
}

/**
 * Max units this line may hold (finite stock). Same productId may appear on multiple lines
 * (different sizes/options); they share one inventory pool — as does the whole type
 * for stock_by_type products.
 */
export function maxQuantityForCartLine(items: CartItem[], lineIndex: number): number {
    const line = items[lineIndex]
    if (!line) return 0
    if (!line.product || isUnlimitedStock(line.product.quantity)) {
        return Number.MAX_SAFE_INTEGER
    }
    const stock = line.product.quantity
    const usedElsewhere = unitsDrawnFromPool(line.product, line.productId, items) - line.quantity
    return Math.max(0, stock - usedElsewhere)
}

/** Whether `item` can be added on top of `cartItems` (merge = same composite key adds `item.quantity`). */
export function canAddQuantityForProduct(cartItems: CartItem[], item: CartItem): boolean {
    const stock = item.product?.quantity
    if (isUnlimitedStock(stock) || stock === undefined) return true
    const current = unitsDrawnFromPool(item.product, item.productId, cartItems)
    return current + item.quantity <= stock
}

export function remainingBeforeAdd(cartItems: CartItem[], item: CartItem): number {
    const stock = item.product?.quantity
    if (isUnlimitedStock(stock) || stock === undefined) return Number.MAX_SAFE_INTEGER
    return Math.max(0, stock - unitsDrawnFromPool(item.product, item.productId, cartItems))
}
