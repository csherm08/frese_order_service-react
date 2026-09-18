/**
 * Remember the customer's contact details on this device after a successful
 * order so the next checkout is prefilled. localStorage only — nothing leaves
 * the browser, and there are no customer accounts to tie it to. Every access
 * is wrapped so private mode / blocked storage just means "nothing saved".
 */
const KEY = "freses.savedContact.v1"

export interface SavedContact {
    name: string
    firstName: string
    lastName: string
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
        let firstName = String(parsed.firstName || "").trim()
        let lastName = String(parsed.lastName || "").trim()
        // Legacy saved contacts predate the split — derive it from name once.
        if (!firstName && !lastName && name) {
            const i = name.lastIndexOf(" ")
            firstName = i === -1 ? name : name.slice(0, i).trim()
            lastName = i === -1 ? "" : name.slice(i + 1).trim()
        }
        const email = String(parsed.email || "").trim()
        const phone = String(parsed.phone || "").trim()
        return firstName || lastName || name || email || phone
            ? { name: name || [firstName, lastName].filter(Boolean).join(" "), firstName, lastName, email, phone }
            : null
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
