import { describe, it, expect } from 'vitest'
import {
    isUnlimitedStock,
    totalQuantityInCartForProduct,
    remainingUnitsForProduct,
    maxQuantityForCartLine,
    canAddQuantityForProduct,
    remainingBeforeAdd,
} from '@/lib/stockUtils'
import { makeProduct, makeCartItem } from './fixtures'

const UNLIMITED = Number.MAX_SAFE_INTEGER

describe('isUnlimitedStock', () => {
    it('treats -1, null, undefined as unlimited', () => {
        expect(isUnlimitedStock(-1)).toBe(true)
        expect(isUnlimitedStock(null)).toBe(true)
        expect(isUnlimitedStock(undefined)).toBe(true)
    })
    it('treats finite quantities (incl. 0) as limited', () => {
        expect(isUnlimitedStock(0)).toBe(false)
        expect(isUnlimitedStock(5)).toBe(false)
    })
})

describe('totalQuantityInCartForProduct', () => {
    it('sums quantities across all lines of the same product', () => {
        const items = [
            makeCartItem({ productId: 1, quantity: 2 }),
            makeCartItem({ productId: 1, quantity: 3, product_size_id: 9 }),
            makeCartItem({ productId: 2, quantity: 5 }),
        ]
        expect(totalQuantityInCartForProduct(1, items)).toBe(5)
        expect(totalQuantityInCartForProduct(2, items)).toBe(5)
        expect(totalQuantityInCartForProduct(3, items)).toBe(0)
    })
})

describe('remainingUnitsForProduct', () => {
    it('is unlimited for unlimited stock', () => {
        expect(remainingUnitsForProduct(makeProduct({ quantity: -1 }), [])).toBe(UNLIMITED)
    })
    it('subtracts what is already in the cart and floors at 0', () => {
        const p = makeProduct({ id: 1, quantity: 5 })
        expect(remainingUnitsForProduct(p, [makeCartItem({ productId: 1, quantity: 2 })])).toBe(3)
        expect(remainingUnitsForProduct(p, [makeCartItem({ productId: 1, quantity: 9 })])).toBe(0)
    })
})

describe('maxQuantityForCartLine', () => {
    it('shares one inventory pool across multiple lines of the same product', () => {
        // product stock 5; line 0 holds 2, line 1 holds 1 → line 0 may hold up to 5-1=4
        const items = [
            makeCartItem({ productId: 1, quantity: 2, product: makeProduct({ id: 1, quantity: 5 }) }),
            makeCartItem({ productId: 1, quantity: 1, product: makeProduct({ id: 1, quantity: 5 }), product_size_id: 9 }),
        ]
        expect(maxQuantityForCartLine(items, 0)).toBe(4)
    })
    it('is unlimited when the product is unlimited', () => {
        const items = [makeCartItem({ productId: 1, product: makeProduct({ quantity: -1 }) })]
        expect(maxQuantityForCartLine(items, 0)).toBe(UNLIMITED)
    })
})

describe('canAddQuantityForProduct', () => {
    it('blocks an add that would exceed finite stock', () => {
        const cart = [makeCartItem({ productId: 1, quantity: 2 })]
        const add = makeCartItem({ productId: 1, quantity: 1, product: makeProduct({ id: 1, quantity: 2 }) })
        expect(canAddQuantityForProduct(cart, add)).toBe(false)
    })
    it('allows an add within stock', () => {
        const cart = [makeCartItem({ productId: 1, quantity: 1 })]
        const add = makeCartItem({ productId: 1, quantity: 1, product: makeProduct({ id: 1, quantity: 5 }) })
        expect(canAddQuantityForProduct(cart, add)).toBe(true)
    })
    it('always allows unlimited stock', () => {
        const add = makeCartItem({ productId: 1, quantity: 99, product: makeProduct({ quantity: -1 }) })
        expect(canAddQuantityForProduct([], add)).toBe(true)
    })
})

describe('remainingBeforeAdd', () => {
    it('returns stock minus what is already in the cart, floored at 0', () => {
        const cart = [makeCartItem({ productId: 1, quantity: 2 })]
        const item = makeCartItem({ productId: 1, product: makeProduct({ id: 1, quantity: 3 }) })
        expect(remainingBeforeAdd(cart, item)).toBe(1)
    })
})
