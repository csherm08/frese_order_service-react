import type { Product } from '@/types/products';

/**
 * Helpers for the catering quote builder. Catering products live under the
 * "* Catering" product types (hidden from the regular storefront menu); here
 * we deliberately surface them, grouped by menu.
 *
 * Full Service and Barbecue menus are priced PER PERSON (line total = unit
 * price × guest count). A La Carte items are priced per item (× a quantity the
 * customer picks). See callers + cateringMenu.test.ts.
 */

export interface CateringMenuGroup {
    typeId: number;
    typeName: string;
    perPerson: boolean;
    products: Product[];
}

export interface CateringLineItem {
    productId: number;
    title: string;
    typeName: string;
    unitPrice: number; // dollars, as listed on the product
    perPerson: boolean;
    quantity: number; // per-person: guest count; per-item: chosen quantity
    lineTotal: number; // dollars
}

/** Per-person menus bill by guest count; everything else uses a quantity stepper. */
export function isPerPersonMenu(typeName: string): boolean {
    const n = typeName.toLowerCase();
    return n.includes('full service') || n.includes('barbecue');
}

/** Group catering products (types whose name contains "catering") by menu, dropping empty menus. */
export function groupCateringProducts(
    products: Product[],
    types: { id: number; name: string }[],
): CateringMenuGroup[] {
    return types
        .filter((t) => t.name.toLowerCase().includes('catering'))
        .map((t) => ({
            typeId: t.id,
            typeName: t.name,
            perPerson: isPerPersonMenu(t.name),
            products: products.filter((p) => p.typeId === t.id),
        }))
        .filter((g) => g.products.length > 0);
}

/**
 * Turn the selection map (productId → chosen quantity) into priced line items.
 * For per-person menus the multiplier is the guest count, not the map value
 * (the map just records that the item is selected, as 1).
 */
export function buildLineItems(
    groups: CateringMenuGroup[],
    selections: Record<number, number>,
    guestCount: number,
): CateringLineItem[] {
    const items: CateringLineItem[] = [];
    for (const group of groups) {
        for (const product of group.products) {
            const selected = selections[product.id] || 0;
            if (selected <= 0) continue;
            const quantity = group.perPerson ? Math.max(0, guestCount) : selected;
            items.push({
                productId: product.id,
                title: product.title,
                typeName: group.typeName,
                unitPrice: product.price,
                perPerson: group.perPerson,
                quantity,
                lineTotal: product.price * quantity,
            });
        }
    }
    return items;
}

export function estimateTotal(items: CateringLineItem[]): number {
    return items.reduce((sum, item) => sum + item.lineTotal, 0);
}
