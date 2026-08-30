/**
 * Remember the customer's contact details on this device after a successful
 * order so the next checkout is prefilled. localStorage only — nothing leaves
 * the browser, and there are no customer accounts to tie it to. Every access
 * is wrapped so private mode / blocked storage just means "nothing saved".
 */
const KEY = "freses.savedContact.v1"

export interface SavedContact {
    name: string
    email: string
    phone: string
}

export function loadSavedContact(): SavedContact | null {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== "object") return null
        const name = String(parsed.name || "").trim()
        const email = String(parsed.email || "").trim()
        const phone = String(parsed.phone || "").trim()
        return name || email || phone ? { name, email, phone } : null
    } catch {
        return null
    }
}

export function saveContact(contact: SavedContact): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(contact))
    } catch {
        // Storage unavailable — prefill is a convenience, never an error.
    }
}

export function clearSavedContact(): void {
    try {
        localStorage.removeItem(KEY)
    } catch {
        // ignore
    }
}
