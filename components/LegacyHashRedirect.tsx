"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolveLegacyHash } from '@/lib/legacyHash'

/**
 * Forwards legacy Angular hash routes (e.g. `/#/specials/42`) from old emails
 * to their new React paths. Hash fragments never reach the server, so this
 * client-side shim is the only way to keep already-sent links working after
 * the `fresesbakery.com` cutover. See lib/legacyHash for the mapping + tests.
 */
export default function LegacyHashRedirect() {
    const router = useRouter()

    useEffect(() => {
        const target = resolveLegacyHash(window.location.hash)
        if (target) router.replace(target)
    }, [router])

    return null
}
