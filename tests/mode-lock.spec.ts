/**
 * Cart-mode UI lock: when the cart contains items in one mode (regular vs. a
 * specific special), the opposite path's entry points are visually disabled
 * and gated behind a banner so the conflict toast can't even fire.
 */
import { test, expect, type Page } from '@playwright/test';
import {
    clearApiRouteMocks,
    clearCartStorage,
    installCatalogAndTimeslotMocks,
    tomorrowSlots,
} from './helpers/api-route-mocks';

const TYPES = [
    { id: 1, name: 'Bread' },
    { id: 5, name: 'Special' },
];

const REGULAR_PRODUCT = {
    id: 80201,
    title: 'E2E Regular Bread',
    description: 'Regular menu item',
    price: 4,
    photoUrl: '',
    typeId: 1,
    quantity: -1,
    active: true,
} as const;

const SPECIAL_PRODUCT = {
    id: 80202,
    title: 'E2E Special Roll',
    description: 'Only in the special',
    price: 5,
    photoUrl: '',
    typeId: 5,
    quantity: -1,
    active: true,
} as const;

const SPECIAL = {
    id: 5101,
    name: 'E2E Test Special',
    description: 'Cart-mode lock test special',
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    products: [SPECIAL_PRODUCT],
};

async function setupMocks(page: Page) {
    await installCatalogAndTimeslotMocks(page, {
        products: [REGULAR_PRODUCT, SPECIAL_PRODUCT],
        types: TYPES,
        specials: [SPECIAL],
        timesMap: tomorrowSlots([{ h: 10, active: true }]),
    });
}

/** Seed cart in localStorage as if the user added one regular item. */
async function seedRegularCart(page: Page) {
    await page.goto('/menu');
    await page.locator('.grid > div').filter({ hasText: REGULAR_PRODUCT.title }).locator('button:has-text("Add to Cart")').click();
}

/** Seed cart by clicking through the special detail page. */
async function seedSpecialCart(page: Page) {
    await page.goto(`/order/special/${SPECIAL.id}`);
    await page.locator('button:has-text("Add to Cart")').first().click();
}

test.describe('Cart-mode UI lock', () => {
    test.afterEach(async ({ page }) => {
        await clearApiRouteMocks(page);
    });

    test.beforeEach(async ({ page }) => {
        await clearCartStorage(page);
        await setupMocks(page);
    });

    test('/menu shows lock banner and disables Add buttons when cart is in special mode', async ({ page }) => {
        await seedSpecialCart(page);
        await page.goto('/menu');

        // Banner mentions the active special by name
        await expect(page.getByText(/order in progress for/i)).toBeVisible();
        await expect(page.getByText(SPECIAL.name)).toBeVisible();

        // Every Add to Cart button on the menu is disabled
        const addButtons = page.locator('button:has-text("Add to Cart")');
        const count = await addButtons.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
            await expect(addButtons.nth(i)).toBeDisabled();
        }
    });

    test('/order disables the Regular Menu card when cart is in special mode', async ({ page }) => {
        await seedSpecialCart(page);
        await page.goto('/order');

        // Banner shown
        await expect(page.getByText(/order in progress from/i)).toBeVisible();

        // Regular Menu card is in pointer-events-none state — its inner Link is aria-disabled
        const regularMenuLink = page.locator('a[href="/menu"]').filter({ hasText: 'Browse Menu' }).first();
        await expect(regularMenuLink).toHaveAttribute('aria-disabled', 'true');
    });

    test('/order disables a special card when cart is in regular mode', async ({ page }) => {
        await seedRegularCart(page);
        await page.goto('/order');

        // The locked-out specials grid links to /order/special/{id} should be aria-disabled
        const specialLink = page.locator(`a[href="/order/special/${SPECIAL.id}"]`).first();
        await expect(specialLink).toHaveAttribute('aria-disabled', 'true');
    });
});
