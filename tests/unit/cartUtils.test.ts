import { describe, it, expect } from 'vitest'
import { generateCompositeKey, findMatchingItemIndex } from '@/lib/cartUtils'
import { makeCartItem } from './fixtures'

describe('generateCompositeKey', () => {
    it('matches identical items (same product, size, selections, add-ons)', () => {
        const a = makeCartItem({ productId: 1, product_size_id: 2, selections: { Bread: { value: 'White', cost: 0 } } })
        const b = makeCartItem({ productId: 1, product_size_id: 2, selections: { Bread: { value: 'White', cost: 0 } } })
        expect(generateCompositeKey(a)).toBe(generateCompositeKey(b))
    })
    it('differs when size differs', () => {
        const a = makeCartItem({ productId: 1, product_size_id: 2 })
        const b = makeCartItem({ productId: 1, product_size_id: 3 })
        expect(generateCompositeKey(a)).not.toBe(generateCompositeKey(b))
    })
    it('differs when a selection differs', () => {
        const a = makeCartItem({ productId: 1, selections: { Bread: { value: 'White', cost: 0 } } })
        const b = makeCartItem({ productId: 1, selections: { Bread: { value: 'Wheat', cost: 0 } } })
        expect(generateCompositeKey(a)).not.toBe(generateCompositeKey(b))
    })
    it('is independent of add-on ordering', () => {
        const a = makeCartItem({ productId: 1, add_ons: { Toppings: [{ value: 'Cheese', cost: 1 }, { value: 'Pepperoni', cost: 1 }] } })
        const b = makeCartItem({ productId: 1, add_ons: { Toppings: [{ value: 'Pepperoni', cost: 1 }, { value: 'Cheese', cost: 1 }] } })
        expect(generateCompositeKey(a)).toBe(generateCompositeKey(b))
    })
    it('differs by product id', () => {
        expect(generateCompositeKey(makeCartItem({ productId: 1 }))).not.toBe(generateCompositeKey(makeCartItem({ productId: 2 })))
    })
})

describe('findMatchingItemIndex', () => {
    it('finds an existing matching line', () => {
        const items = [
            makeCartItem({ productId: 1, product_size_id: 2 }),
            makeCartItem({ productId: 1, product_size_id: 3 }),
        ]
        const incoming = makeCartItem({ productId: 1, product_size_id: 3 })
        expect(findMatchingItemIndex(items, incoming)).toBe(1)
    })
    it('returns -1 when no line matches', () => {
        const items = [makeCartItem({ productId: 1, product_size_id: 2 })]
        expect(findMatchingItemIndex(items, makeCartItem({ productId: 9 }))).toBe(-1)
    })
})
