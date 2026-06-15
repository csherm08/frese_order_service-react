import { describe, it, expect } from 'vitest'
import { resolveLegacyHash } from '@/lib/legacyHash'

describe('resolveLegacyHash', () => {
    it('maps a legacy special-detail link to /order/special/:id', () => {
        expect(resolveLegacyHash('#/specials/42')).toBe('/order/special/42')
        expect(resolveLegacyHash('#/specials/42/')).toBe('/order/special/42')
    })
    it('maps the specials list', () => {
        expect(resolveLegacyHash('#/specials')).toBe('/specials')
        expect(resolveLegacyHash('#/specials/')).toBe('/specials')
    })
    it('maps unsubscribe (with or without the email segment) to /unsubscribe', () => {
        expect(resolveLegacyHash('#/unsubscribe')).toBe('/unsubscribe')
        expect(resolveLegacyHash('#/unsubscribe/a@b.com')).toBe('/unsubscribe')
    })
    it('maps the retired calendar route to the homepage', () => {
        expect(resolveLegacyHash('#/calendar')).toBe('/')
    })
    it('ignores non-legacy or unknown hashes', () => {
        expect(resolveLegacyHash('')).toBeNull()
        expect(resolveLegacyHash('#section')).toBeNull()
        expect(resolveLegacyHash('#/orders/lookup')).toBeNull()
        expect(resolveLegacyHash('#/')).toBeNull()
    })
    it('does not treat a non-numeric special id as a match', () => {
        expect(resolveLegacyHash('#/specials/abc')).toBeNull()
    })
})
