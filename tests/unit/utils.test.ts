import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@/lib/utils'

describe('formatCurrency', () => {
    it('formats whole and fractional dollars', () => {
        expect(formatCurrency(3.5)).toBe('$3.50')
        expect(formatCurrency(0)).toBe('$0.00')
        expect(formatCurrency(1200)).toBe('$1,200.00')
    })
    it('rounds to two decimal places', () => {
        expect(formatCurrency(1.999)).toBe('$2.00')
    })
})
