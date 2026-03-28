/**
 * Customer site variant. Build the Plug Power storefront with:
 * NEXT_PUBLIC_ORDER_SITE=plugpower
 */
export type OrderSiteMode = 'main' | 'plugpower';

export function getOrderSiteMode(): OrderSiteMode {
  const v = (process.env.NEXT_PUBLIC_ORDER_SITE || 'main').toLowerCase().trim();
  return v === 'plugpower' ? 'plugpower' : 'main';
}

/** Public label in header (optional override for second location). */
export function getPublicSiteTitle(): string {
  return process.env.NEXT_PUBLIC_SITE_TITLE?.trim() || "Frese's Bakery";
}
