import type { Product } from '@/types/products';

export type ProductTypeRow = { id: number; name: string };

/** Must match `types.name` in DB (see migration add_plug_power_type). */
export const PLUG_POWER_TYPE_NAME = 'Plug Power';

/** Legacy hard-coded type id for "Superbowl Special" on main menu. */
const SUPERBOWL_TYPE_ID = 10;

/**
 * Filter catalog for the active storefront (same API for all; rules live here).
 * - main: Frese menu — hide Special, Catering, Superbowl, Plug Power
 * - plugpower: only Plug Power products (empty if type missing)
 */
export function filterProductsForOrderSite(
  products: Product[],
  types: ProductTypeRow[],
  mode: 'main' | 'plugpower'
): Product[] {
  const specialId = types.find((t) => t.name === 'Special')?.id;
  const cateringId = types.find((t) => t.name === 'Catering')?.id;
  const plugPowerId = types.find((t) => t.name === PLUG_POWER_TYPE_NAME)?.id;

  if (mode === 'plugpower') {
    if (plugPowerId == null) return [];
    return products.filter((p) => p.typeId === plugPowerId);
  }

  return products.filter((p) => {
    if (specialId != null && p.typeId === specialId) return false;
    if (p.typeId === SUPERBOWL_TYPE_ID) return false;
    if (cateringId != null && p.typeId === cateringId) return false;
    if (plugPowerId != null && p.typeId === plugPowerId) return false;
    return true;
  });
}
