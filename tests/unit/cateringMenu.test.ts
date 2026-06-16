import { describe, it, expect } from 'vitest'
import {
    isPerPersonMenu,
    groupCateringProducts,
    buildLineItems,
    estimateTotal,
} from '@/lib/cateringMenu'

const TYPES = [
    { id: 1, name: 'Bread' },
    { id: 17, name: 'Full Service Catering' },
    { id: 18, name: 'Barbecue Catering' },
    { id: 19, name: 'A La Carte Catering' },
]

const mk = (id: number, typeId: number, price: number, title = `p${id}`) =>
    ({ id, typeId, price, title } as any)

const PRODUCTS = [
    mk(1, 1, 5),         // regular bread — not catering
    mk(207, 17, 28),     // full service (per person)
    mk(208, 17, 58.75),  // full service (per person)
    mk(300, 18, 20),     // barbecue (per person)
    mk(400, 19, 45),     // a la carte (per item)
]

describe('isPerPersonMenu', () => {
    it('treats Full Service and Barbecue as per-person', () => {
        expect(isPerPersonMenu('Full Service Catering')).toBe(true)
        expect(isPerPersonMenu('Barbecue Catering')).toBe(true)
    })
    it('treats A La Carte as per-item', () => {
        expect(isPerPersonMenu('A La Carte Catering')).toBe(false)
    })
})

describe('groupCateringProducts', () => {
    it('groups only catering types and drops non-catering + empty menus', () => {
        const groups = groupCateringProducts(PRODUCTS, TYPES)
        expect(groups.map((g) => g.typeId)).toEqual([17, 18, 19])
        expect(groups.find((g) => g.typeId === 17)!.products).toHaveLength(2)
        expect(groups.find((g) => g.typeId === 17)!.perPerson).toBe(true)
        expect(groups.find((g) => g.typeId === 19)!.perPerson).toBe(false)
    })
})

describe('buildLineItems + estimateTotal', () => {
    const groups = groupCateringProducts(PRODUCTS, TYPES)

    it('multiplies per-person items by guest count (not the selection value)', () => {
        const items = buildLineItems(groups, { 207: 1 }, 50)
        expect(items).toHaveLength(1)
        expect(items[0]).toMatchObject({ productId: 207, perPerson: true, quantity: 50, lineTotal: 1400 })
    })

    it('uses the chosen quantity for per-item products', () => {
        const items = buildLineItems(groups, { 400: 3 }, 50)
        expect(items[0]).toMatchObject({ productId: 400, perPerson: false, quantity: 3, lineTotal: 135 })
    })

    it('ignores unselected (0) items and sums a mixed quote', () => {
        const items = buildLineItems(groups, { 207: 1, 400: 2, 999: 0 }, 50)
        // 28*50 + 45*2 = 1400 + 90
        expect(items).toHaveLength(2)
        expect(estimateTotal(items)).toBe(1490)
    })

    it('per-person lines are 0 until a guest count is entered', () => {
        const items = buildLineItems(groups, { 208: 1 }, 0)
        expect(items[0].lineTotal).toBe(0)
    })
})
