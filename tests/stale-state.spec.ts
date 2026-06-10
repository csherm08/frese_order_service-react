/**
 * Stale-state behavior: what the storefront does when timeslot availability or product
 * stock changes on the server BETWEEN the customer browsing and reaching checkout.
 * Mocked API only (no DB writes) — staleness is simulated by re-pointing the catalog /
 * timeslot routes mid-flow (most-recently-registered Playwright route wins).
 *
 * Verified here:
 *  - HANDLED — the checkout timeslot step re-fetches on each visit (a slot that fills up
 *    is pruned away), and the menu re-fetches and reconciles reduced stock against items
 *    already in the cart.
 *  - GAP (documented) — once an item is in the cart, neither the cart nor checkout
 *    re-validates that line against fresh stock (stockUtils reads the cart item's
 *    snapshot, and /cart + /checkout do not re-fetch the catalog). So an oversell is
 *    still possible: the menu shows the item SOLD OUT while the cart still checks out.
 *    Flip the final assertions of that test when a cart-line reconciliation guard lands.
 */
import { test, expect, type Page } from '@playwright/test';
import {
    clearApiRouteMocks,
    clearCartStorage,
    installCatalogAndTimeslotMocks,
    tomorrowSlots,
    E2E_PRODUCT_LOW_STOCK,
} from './helpers/api-route-mocks';

function json(data: unknown) {
    return JSON.stringify(data);
}

function addToCartOnCard(page: Page, productTitle: string) {
    return page
        .locator('.grid')
        .locator('> div')
        .filter({ hasText: productTitle })
        .locator('button:has-text("Add to Cart")')
        .first();
}

function productCard(page: Page, productTitle: string) {
    return page.locator('.grid').locator('> div').filter({ hasText: productTitle }).first();
}

/** Re-point the catalog endpoint mid-test to simulate stock changing on the server. */
async function restock(page: Page, products: Record<string, unknown>[]) {
    await page.route('**/activeProductsAndSizesIncludingSpecials**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: json(products) }),
    );
}

/** Re-point the timeslots endpoint mid-test to simulate slots filling up. */
async function setTimes(page: Page, timesMap: Record<string, { amountLeft: number; active: boolean }>) {
    await page.route('**/orders/availableTimes/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: json(timesMap) }),
    );
}

test.describe('Stale state (mocked API)', () => {
    test.afterEach(async ({ page }) => {
        await clearApiRouteMocks(page);
    });

    test.beforeEach(async ({ page }) => {
        await clearCartStorage(page);
    });

    test('stale timeslot: a slot that fills up is no longer offered when checkout re-fetches', async ({ page }) => {
        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_LOW_STOCK, quantity: -1 }],
            timesMap: tomorrowSlots([{ h: 10, m: 0, active: true }]),
        });

        await page.goto('/menu');
        await expect(page.getByText(E2E_PRODUCT_LOW_STOCK.title, { exact: true })).toBeVisible({ timeout: 15000 });
        await addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title).click();

        await page.goto('/cart');
        await page.getByRole('button', { name: /Checkout/i }).click();
        await page.waitForURL('/checkout', { timeout: 15000 });

        // The 10:00 slot is offered on this (first) checkout fetch.
        const timeSection = page.locator('h3', { hasText: 'Pickup Time' }).locator('..');
        await expect(timeSection.getByRole('button', { name: /10:00\s*AM/i })).toHaveCount(1);

        // It fills up on the server while the customer is mid-flow.
        await setTimes(page, tomorrowSlots([{ h: 10, m: 0, active: false }]));

        // Re-entering checkout re-fetches; the now-inactive slot is pruned away.
        await page.goto('/cart');
        await page.getByRole('button', { name: /Checkout/i }).click();
        await page.waitForURL('/checkout', { timeout: 15000 });
        await expect(page.getByText('No available pickup times. Please try again later.')).toBeVisible({
            timeout: 20000,
        });
    });

    test('stale stock: menu re-fetch reconciles reduced server stock against items already in the cart', async ({
        page,
    }) => {
        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_LOW_STOCK, quantity: 5 }],
            timesMap: tomorrowSlots([{ h: 11, m: 0, active: true }]),
        });

        await page.goto('/menu');
        const card = productCard(page, E2E_PRODUCT_LOW_STOCK.title);
        await expect(card.getByTestId('product-stock-hint')).toHaveText('5 Left');
        await addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title).click();
        await expect(card.getByTestId('product-stock-hint')).toHaveText('4 Left');

        // Server stock collapses to 1 (others bought it) — fewer than the cart already implies.
        await restock(page, [{ ...E2E_PRODUCT_LOW_STOCK, quantity: 1 }]);

        // Fresh menu fetch: 1 in stock, 1 already in cart → nothing left to add.
        await page.goto('/menu');
        const reloaded = productCard(page, E2E_PRODUCT_LOW_STOCK.title);
        await expect(reloaded.getByTestId('product-stock-hint')).toHaveText('SOLD OUT');
        await expect(addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title)).toBeDisabled();
    });

    test('GAP (documented): cart line is NOT reconciled to fresh stock — menu shows SOLD OUT but cart still checks out', async ({
        page,
    }) => {
        // Until a cart-line stock-reconciliation guard exists, an item added before a
        // stock drop stays in the cart at its original quantity and checkout stays open
        // (oversell risk). This pins the current behavior; flip the final two assertions
        // when the guard lands.
        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_LOW_STOCK, quantity: 2 }],
            timesMap: tomorrowSlots([{ h: 11, m: 0, active: true }]),
        });

        await page.goto('/menu');
        await addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title).click();
        await addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title).click();

        // Server sells out completely after both units were added to this cart.
        await restock(page, [{ ...E2E_PRODUCT_LOW_STOCK, quantity: 0 }]);

        // Menu (fresh fetch) correctly reflects the sell-out…
        await page.goto('/menu');
        await expect(productCard(page, E2E_PRODUCT_LOW_STOCK.title).getByTestId('product-stock-hint')).toHaveText(
            'SOLD OUT',
        );

        // …but the cart still holds 2 units against the STALE snapshot ("2 in store") and
        // lets the customer proceed to checkout. This is the oversell gap.
        await page.goto('/cart');
        await expect(page.getByTestId('cart-line-stock-hint')).toContainText(/2 in store/);
        await expect(page.getByRole('button', { name: /Checkout/i })).toBeEnabled();
    });
});
