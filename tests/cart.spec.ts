/**
 * Cart page behavior with mocked API responses.
 *
 * Validates: add → verify, +/- quantity, remove last item, persist across reload,
 * subtotal/tax math, mode badge, empty-cart redirect.
 */
import { test, expect } from '@playwright/test';
import {
    clearApiRouteMocks,
    clearCartStorage,
    installCatalogAndTimeslotMocks,
    tomorrowSlots,
} from './helpers/api-route-mocks';

const SIMPLE_BREAD = {
    id: 80001,
    title: 'E2E Italian Bread',
    description: 'Plain bread loaf',
    price: 4,
    photoUrl: '',
    typeId: 1,
    quantity: -1,
    active: true,
} as const;

const SIMPLE_PASTRY = {
    id: 80002,
    title: 'E2E Croissant',
    description: 'Buttery pastry',
    price: 3,
    photoUrl: '',
    typeId: 2,
    quantity: -1,
    active: true,
} as const;

const TYPES = [
    { id: 1, name: 'Bread' },
    { id: 2, name: 'Pastry' },
    { id: 5, name: 'Special' },
];

async function setupMocks(page: import('@playwright/test').Page) {
    await installCatalogAndTimeslotMocks(page, {
        products: [SIMPLE_BREAD, SIMPLE_PASTRY],
        types: TYPES,
        timesMap: tomorrowSlots([{ h: 10, active: true }]),
    });
}

function cartLines(page: import('@playwright/test').Page) {
    return page.locator('[data-testid="cart-item"]');
}

test.describe('Cart page', () => {
    test.afterEach(async ({ page }) => {
        await clearApiRouteMocks(page);
    });

    test.beforeEach(async ({ page }) => {
        await clearCartStorage(page);
        await setupMocks(page);
    });

    test('adds a product and shows it on the cart with the right total', async ({ page }) => {
        await page.goto('/menu');
        await page.locator('.grid > div').filter({ hasText: SIMPLE_BREAD.title }).locator('button:has-text("Add to Cart")').click();
        await page.goto('/cart');

        const lines = cartLines(page);
        await expect(lines).toHaveCount(1);
        await expect(lines.first()).toContainText(SIMPLE_BREAD.title);
        // Bread is tax-exempt, so total = price
        await expect(page.getByText(/\$4\.00/).first()).toBeVisible();
    });

    test('+ and - buttons mutate quantity, removing last item clears the cart', async ({ page }) => {
        await page.goto('/menu');
        await page.locator('.grid > div').filter({ hasText: SIMPLE_BREAD.title }).locator('button:has-text("Add to Cart")').click();
        await page.goto('/cart');

        const line = cartLines(page).first();
        const qty = line.locator('[data-testid="cart-line-quantity"]');
        const inc = line.locator('[data-testid="cart-line-increment"]');
        const dec = line.locator('[data-testid="cart-line-decrement"]');

        await inc.click();
        await expect(qty).toHaveText('2');
        await inc.click();
        await expect(qty).toHaveText('3');

        await dec.click();
        await expect(qty).toHaveText('2');

        // Decrement to zero removes the line
        await dec.click();
        await dec.click();
        await expect(cartLines(page)).toHaveCount(0);
    });

    test('cart contents persist across a page reload (localStorage)', async ({ page }) => {
        await page.goto('/menu');
        await page.locator('.grid > div').filter({ hasText: SIMPLE_BREAD.title }).locator('button:has-text("Add to Cart")').click();
        await page.locator('.grid > div').filter({ hasText: SIMPLE_PASTRY.title }).locator('button:has-text("Add to Cart")').click();
        await page.goto('/cart');
        await expect(cartLines(page)).toHaveCount(2);

        await page.reload();
        await expect(cartLines(page)).toHaveCount(2);
        await expect(page.getByText(SIMPLE_BREAD.title)).toBeVisible();
        await expect(page.getByText(SIMPLE_PASTRY.title)).toBeVisible();
    });

    test('totals: bread is tax-exempt, pastry is taxed, subtotal/tax/total displayed', async ({ page }) => {
        await page.goto('/menu');
        await page.locator('.grid > div').filter({ hasText: SIMPLE_BREAD.title }).locator('button:has-text("Add to Cart")').click();
        await page.locator('.grid > div').filter({ hasText: SIMPLE_PASTRY.title }).locator('button:has-text("Add to Cart")').click();
        await page.goto('/cart');

        // Subtotal: 4 (bread) + 3 (pastry) = 7
        // Tax: only pastry @ 8% = 0.24
        // Total: 7.24
        await expect(page.getByText('$7.00').first()).toBeVisible();
        await expect(page.getByText('$0.24').first()).toBeVisible();
        await expect(page.getByText('$7.24').first()).toBeVisible();
    });

    test('header cart badge reflects total quantity', async ({ page }) => {
        await page.goto('/menu');
        const badge = page.locator('header').locator('text=/^\\d+$/').first();

        await page.locator('.grid > div').filter({ hasText: SIMPLE_BREAD.title }).locator('button:has-text("Add to Cart")').click();
        await expect(badge).toHaveText('1');

        await page.locator('.grid > div').filter({ hasText: SIMPLE_PASTRY.title }).locator('button:has-text("Add to Cart")').click();
        await expect(badge).toHaveText('2');
    });

    test('empty cart redirects from /checkout back to /cart', async ({ page }) => {
        await page.goto('/checkout');
        await expect(page).toHaveURL('/cart', { timeout: 5000 });
    });
});
