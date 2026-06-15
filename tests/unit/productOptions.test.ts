import { describe, it, expect } from 'vitest'
import { resolveOptionsForSize } from '@/lib/productOptions'

const A = [{ id: 1, value: 'A', cost: 0 }]
const B = [{ id: 2, value: 'B', cost: 1 }]

describe('resolveOptionsForSize', () => {
    it('sized product: exact match on the selected size name', () => {
        const bySize = { Small: A, Medium: B }
        expect(resolveOptionsForSize(bySize, 'Medium', true)).toBe(B)
        expect(resolveOptionsForSize(bySize, 'Small', true)).toBe(A)
    })
    it('sized product: no options when nothing selected or no match', () => {
        const bySize = { Small: A }
        expect(resolveOptionsForSize(bySize, null, true)).toBeUndefined()
        expect(resolveOptionsForSize(bySize, 'Large', true)).toBeUndefined()
    })
    it('size-less product keyed "size" resolves', () => {
        expect(resolveOptionsForSize({ size: A }, null, false)).toBe(A)
    })
    it('size-less product keyed "default" resolves (the bug fix)', () => {
        expect(resolveOptionsForSize({ default: A }, null, false)).toBe(A)
    })
    it('size-less product with a single arbitrary placeholder key resolves', () => {
        expect(resolveOptionsForSize({ whatever: A }, null, false)).toBe(A)
    })
    it('prefers "size" then "default" when multiple placeholders exist', () => {
        expect(resolveOptionsForSize({ size: A, default: B }, null, false)).toBe(A)
        expect(resolveOptionsForSize({ default: B, other: A }, null, false)).toBe(B)
    })
    it('returns undefined for missing/empty maps', () => {
        expect(resolveOptionsForSize(undefined, null, false)).toBeUndefined()
        expect(resolveOptionsForSize({}, null, false)).toBeUndefined()
    })
})
