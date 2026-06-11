import { describe, it, expect } from 'vitest'
import { filterProductsForOrderSite } from '@/lib/catalogFilter'
import { makeProduct } from './fixtures'

const TYPES = [
    { id: 1, name: 'Bread' },
    { id: 5, name: 'Special' },
    { id: 7, name: 'Catering' },
    { id: 10, name: 'Superbowl Special' },
    { id: 99, name: 'Plug Power' },
]

const CATALOG = [
    makeProduct({ id: 1, typeId: 1 }),   // Bread — main only
    makeProduct({ id: 2, typeId: 5 }),   // Special — hidden on main
    makeProduct({ id: 3, typeId: 7 }),   // Catering — hidden on main
    makeProduct({ id: 4, typeId: 10 }),  // Superbowl — hidden on main
    makeProduct({ id: 5, typeId: 99 }),  // Plug Power — hidden on main, only on plugpower
]

describe('filterProductsForOrderSite — main', () => {
    it('hides Special, Catering, Superbowl, and Plug Power', () => {
        const ids = filterProductsForOrderSite(CATALOG, TYPES, 'main').map((p) => p.id)
        expect(ids).toEqual([1])
    })
})

describe('filterProductsForOrderSite — plugpower', () => {
    it('shows only Plug Power products', () => {
        const ids = filterProductsForOrderSite(CATALOG, TYPES, 'plugpower').map((p) => p.id)
        expect(ids).toEqual([5])
    })
    it('returns empty when the Plug Power type is missing', () => {
        const typesNoPP = TYPES.filter((t) => t.name !== 'Plug Power')
        expect(filterProductsForOrderSite(CATALOG, typesNoPP, 'plugpower')).toEqual([])
    })
})
