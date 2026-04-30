import type { Page } from '@playwright/test';

/** Stable IDs for mocked catalog (no DB writes — routes only). */
export const E2E_PRODUCT_LOW_STOCK = {
    id: 91001,
    title: 'E2E Low Stock Bun',
    description: 'Playwright inventory fixture',
    price: 2.5,
    photoUrl: '',
    typeId: 1,
    quantity: 2,
    active: true,
} as const;

export const E2E_PRODUCT_SOLD_OUT = {
    id: 91002,
    title: 'E2E Sold Out Muffin',
    description: 'Playwright sold-out fixture',
    price: 3,
    photoUrl: '',
    typeId: 1,
    quantity: 0,
    active: true,
} as const;

/** One size so the menu opens ProductModal — used to assert over-quantity toast */
export const E2E_PRODUCT_MODAL_STOCK = {
    id: 91003,
    title: 'E2E Modal Stock Scone',
    description: 'Opens modal for inventory toast test',
    price: 2,
    photoUrl: '',
    typeId: 1,
    quantity: 2,
    active: true,
    product_sizes: [{ id: 101, product_id: 91003, size: 'Single', cost: 2 }],
} as const;

const DEFAULT_TYPES = [
    { id: 1, name: 'Bread' },
    { id: 5, name: 'Special' },
    { id: 7, name: 'Catering' },
    { id: 99, name: 'Plug Power' },
];

function json(data: unknown) {
    return JSON.stringify(data);
}

/** Build ISO timestamps for tomorrow so slots always land in the future. */
export function tomorrowSlots(hours: Array<{ h: number; m?: number; active: boolean }>) {
    const base = new Date();
    base.setDate(base.getDate() + 1);
    const map: Record<string, { amountLeft: number; active: boolean }> = {};
    for (const { h, m = 0, active } of hours) {
        const d = new Date(base);
        d.setHours(h, m, 0, 0);
        map[d.toISOString()] = { amountLeft: 10, active };
    }
    return map;
}

/**
 * Intercept backend JSON calls so tests do not mutate timeslots/products in the real DB.
 * Always call {@link clearApiRouteMocks} in `afterEach` (or `finally`) so routes do not leak.
 */
export async function installCatalogAndTimeslotMocks(
    page: Page,
    options: {
        products: Record<string, unknown>[];
        types?: typeof DEFAULT_TYPES;
        specials?: unknown[];
        timesMap: Record<string, { amountLeft: number; active: boolean }>;
    },
) {
    const types = options.types ?? DEFAULT_TYPES;
    const specials = options.specials ?? [];

    await page.route('**/products/types**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: json(types),
        });
    });

    await page.route('**/activeProductsAndSizesIncludingSpecials**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: json(options.products),
        });
    });

    await page.route('**/activeSpecials**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: json(specials),
        });
    });

    await page.route('**/orders/availableTimes/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: json(options.timesMap),
        });
    });
}

export async function clearApiRouteMocks(page: Page) {
    await page.context().unrouteAll();
}

/** Clear cart + mode in browser storage (fresh cart per test). */
export async function clearCartStorage(page: Page) {
    await page.goto('/menu');
    await page.evaluate(() => {
        localStorage.removeItem('cart');
        localStorage.removeItem('cartMode');
    });
    // CartProvider only reads localStorage on mount — reload so React state matches cleared storage.
    await page.reload({ waitUntil: 'domcontentloaded' });
}
