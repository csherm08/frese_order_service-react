import type { Product } from '@/types/products';

/**
 * Helpers for the catering quote builder. Catering products live under the
 * "* Catering" product types (hidden from the regular storefront menu); here
 * we deliberately surface them, grouped by menu.
 *
 * Every item uses a quantity stepper (line total = unit price × quantity). The
 * `perPerson` flag only drives the price label ("/ person" vs "each") and a
 * hint that the quantity is the number of guests served — it does NOT change
 * the math. See callers + cateringMenu.test.ts.
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
    perPerson: boolean; // display only: "/ person" label + "qty = guests" hint
    quantity: number; // chosen quantity (for per-person items, the number of guests served)
    lineTotal: number; // dollars
}

/** Per-person menus show a "/ person" price + "qty = guests" hint (label only, not math). */
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

/** Turn the selection map (productId → quantity) into priced line items. */
export function buildLineItems(
    groups: CateringMenuGroup[],
    selections: Record<number, number>,
): CateringLineItem[] {
    const items: CateringLineItem[] = [];
    for (const group of groups) {
        for (const product of group.products) {
            const quantity = selections[product.id] || 0;
            if (quantity <= 0) continue;
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
