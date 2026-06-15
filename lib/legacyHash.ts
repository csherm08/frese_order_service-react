/**
 * Map a legacy Angular hash route to its new React path.
 *
 * The old Ionic/Angular storefront used hash routing (e.g.
 * `fresesbakery.com/#/specials/42`). Emails already in customers' inboxes —
 * and any sent before the backend templates are migrated — still carry those
 * links. Once `fresesbakery.com` points at this React app, the hash fragment
 * reaches the client (servers never see it, so Netlify redirects can't help),
 * and this shim forwards it to the equivalent clean path.
 *
 * Returns the target path, or null if the hash isn't a known legacy route
 * (in which case we leave the user where they are).
 */
export function resolveLegacyHash(hash: string): string | null {
    if (!hash || !hash.startsWith('#/')) return null;
    // Strip the leading '#', keep the path; drop any querystring on the hash.
    const path = hash.slice(1).split('?')[0];

    const special = path.match(/^\/specials\/(\d+)\/?$/);
    if (special) return `/order/special/${special[1]}`;

    if (/^\/specials\/?$/.test(path)) return '/specials';
    if (/^\/unsubscribe(\/.*)?$/.test(path)) return '/unsubscribe';
    if (/^\/calendar\/?$/.test(path)) return '/'; // calendar page not on the new site yet

    return null;
}
