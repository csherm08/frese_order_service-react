/**
 * Timeslots + inventory behavior with mocked API responses (no DB writes).
 * Teardown: `afterEach` runs `clearApiRouteMocks` → `context.unrouteAll()` so routes never leak.
 * `playwright.config` reuses an existing dev server on port 8100 unless `PLAYWRIGHT_NO_REUSE_SERVER=1`.
 *
 * Watching the browser:
 * - `npm run test:e2e:timeslots:headed` — visible Chromium
 * - `npm run test:e2e:timeslots:ui` — Playwright UI mode (step through / time travel)
 *
 * Pace (this file only):
 * - **slowMo** defaults to **900ms** between Playwright actions locally (0 on CI / GitHub Actions).
 *   Set `PLAYWRIGHT_SLOWMO=0` to disable, or `PLAYWRIGHT_SLOWMO=1500` for slower.
 * - **stepPause** adds ~350ms after major steps locally (`PLAYWRIGHT_STEP_PAUSE_MS=0` to disable).
 *
 * Inventory / quantity: assertions use visible UI (`[data-testid="product-stock-hint"]`, cart line hints,
 * disabled controls, and Sonner toast when modal requests more than stock).
 */
import { test, expect, devices } from '@playwright/test';
import {
    clearApiRouteMocks,
    clearCartStorage,
    installCatalogAndTimeslotMocks,
    tomorrowSlots,
    E2E_PRODUCT_LOW_STOCK,
    E2E_PRODUCT_MODAL_STOCK,
    E2E_PRODUCT_SOLD_OUT,
} from './helpers/api-route-mocks';
import { stepPause } from './helpers/pace';

/** ms between Playwright actions; merged into Chrome launchOptions so channel is preserved */
function slowMoForThisFile(): number {
    const raw = process.env.PLAYWRIGHT_SLOWMO?.trim();
    if (raw === '0') return 0;
    if (raw && /^\d+$/.test(raw)) {
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? n : 0;
    }
    if (process.env.CI || process.env.GITHUB_ACTIONS) return 0;
    return 900;
}

const _slowMo = slowMoForThisFile();
// DeviceDescriptor types omit launchOptions; runtime includes it for Chromium channel.
const _chrome = devices['Desktop Chrome'] as Parameters<typeof test.use>[0];
if (_slowMo > 0) {
    test.use({
        ..._chrome,
        launchOptions: {
            ...(('launchOptions' in _chrome && _chrome.launchOptions) || {}),
            slowMo: _slowMo,
        },
    });
}

/** One browser at a time — better when using `--headed` */
test.describe.configure({ mode: 'serial' });

function addToCartOnCard(page: import('@playwright/test').Page, productTitle: string) {
    return page
        .locator('.grid')
        .locator('> div')
        .filter({ hasText: productTitle })
        .locator('button:has-text("Add to Cart")')
        .first();
}

function productCard(page: import('@playwright/test').Page, productTitle: string) {
    return page.locator('.grid').locator('> div').filter({ hasText: productTitle }).first();
}

test.describe('Timeslots (mocked API, no DB cleanup required)', () => {
    test.afterEach(async ({ page }) => {
        await clearApiRouteMocks(page);
    });

    test.beforeEach(async ({ page }) => {
        await clearCartStorage(page);
    });

    test('inactive slots are not offered; active slot can be chosen', async ({ page }) => {
        const timesMap = tomorrowSlots([
            { h: 10, m: 0, active: true },
            { h: 22, m: 0, active: false },
        ]);

        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_LOW_STOCK, quantity: -1 }],
            timesMap,
        });
        await stepPause(page);

        await page.goto('/menu');
        await expect(page.getByText(E2E_PRODUCT_LOW_STOCK.title, { exact: true })).toBeVisible({
            timeout: 15000,
        });
        await stepPause(page);
        await addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title).click();
        await stepPause(page);

        await page.goto('/cart');
        await stepPause(page);
        await page.getByRole('button', { name: /Checkout/i }).click();
        await page.waitForURL('/checkout', { timeout: 15000 });
        await stepPause(page);

        await expect(page.getByText('Select Pickup Time', { exact: true })).toBeVisible({ timeout: 20000 });
        await expect(page.getByRole('heading', { name: 'Pickup Date' })).toBeVisible();

        const timeSection = page.locator('h3', { hasText: 'Pickup Time' }).locator('..');
        // Two slots in the mock map; after pruneInactiveTimeSlots only the active one remains
        await expect(timeSection.getByRole('button', { name: /\d{1,2}:\d{2}\s*(AM|PM)/i })).toHaveCount(1);

        await page.getByRole('button', { name: /10:00 AM/i }).first().click();
        await expect(page.getByRole('button', { name: /at\s+10:00\s*AM/i })).toBeVisible({ timeout: 10000 });
    });

    test('when every slot is inactive, shows empty pickup copy', async ({ page }) => {
        const timesMap = tomorrowSlots([{ h: 15, m: 0, active: false }]);

        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_LOW_STOCK, quantity: -1 }],
            timesMap,
        });
        await stepPause(page);

        await page.goto('/menu');
        await stepPause(page);
        await addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title).click();
        await stepPause(page);
        await page.goto('/cart');
        await stepPause(page);
        await page.getByRole('button', { name: /Checkout/i }).click();
        await page.waitForURL('/checkout', { timeout: 15000 });
        await stepPause(page);

        await expect(page.getByText('No available pickup times. Please try again later.')).toBeVisible({
            timeout: 20000,
        });
    });
});

test.describe('Quantities (mocked API)', () => {
    test.afterEach(async ({ page }) => {
        await clearApiRouteMocks(page);
    });

    test.beforeEach(async ({ page }) => {
        await clearCartStorage(page);
    });

    test('menu shows stock hint, then blocks third add when inventory is 2', async ({ page }) => {
        const timesMap = tomorrowSlots([{ h: 11, m: 0, active: true }]);
        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_LOW_STOCK, quantity: 2 }],
            timesMap,
        });
        await stepPause(page);

        await test.step('Open menu — card shows how many can still be added', async () => {
            await page.goto('/menu');
            await stepPause(page);
            const card = productCard(page, E2E_PRODUCT_LOW_STOCK.title);
            await expect(card.getByTestId('product-stock-hint')).toHaveText('2 Left');
        });

        await test.step('Add twice — hint updates to “all in cart” and Add is disabled', async () => {
            const card = productCard(page, E2E_PRODUCT_LOW_STOCK.title);
            const btn = card.locator('button:has-text("Add to Cart")');
            await expect(btn).toBeEnabled();
            await btn.click();
            await stepPause(page);
            await expect(card.getByTestId('product-stock-hint')).toHaveText('1 Left');
            await expect(btn).toBeEnabled();
            await btn.click();
            await stepPause(page);
            await expect(card.getByTestId('product-stock-hint')).toHaveText('SOLD OUT');
            await expect(btn).toBeDisabled();
        });
    });

    test('cart shows inventory line and disables + at store cap', async ({ page }) => {
        const timesMap = tomorrowSlots([{ h: 11, m: 0, active: true }]);
        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_LOW_STOCK, quantity: 2 }],
            timesMap,
        });
        await stepPause(page);

        await test.step('Fill cart to max from menu', async () => {
            await page.goto('/menu');
            await stepPause(page);
            await addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title).click();
            await stepPause(page);
            await addToCartOnCard(page, E2E_PRODUCT_LOW_STOCK.title).click();
            await stepPause(page);
        });

        await test.step('Cart shows quantity and explicit inventory cap copy', async () => {
            await page.goto('/cart');
            await stepPause(page);
            await expect(page.getByTestId('cart-line-stock-hint')).toContainText(
                /At inventory limit for this line \(2 of 2 allowed; 2 in store\)/,
            );
            const plus = page.getByRole('button', {
                name: 'Cannot add more — store inventory limit for this line',
            });
            await expect(plus).toBeDisabled();
        });
    });

    test('modal: requesting more than stock shows error toast (safeguard)', async ({ page }) => {
        const timesMap = tomorrowSlots([{ h: 11, m: 0, active: true }]);
        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_MODAL_STOCK }],
            timesMap,
        });
        await stepPause(page);

        await test.step('Open configurable product — stock hint visible in modal', async () => {
            await page.goto('/menu');
            await stepPause(page);
            await addToCartOnCard(page, E2E_PRODUCT_MODAL_STOCK.title).click();
            await stepPause(page);
            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();
            await expect(dialog.getByTestId('product-stock-hint')).toHaveText('2 Left');
        });

        await test.step('Set quantity to 3 (> stock 2) and add — toast blocks over-order', async () => {
            const dialog = page.getByRole('dialog');
            await dialog.locator('input[type="number"]').fill('3');
            await dialog.getByRole('button', { name: 'Add to Cart' }).click();
            await expect(page.locator('[data-sonner-toast]').filter({ hasText: /Only 2 left/i })).toBeVisible({
                timeout: 8000,
            });
        });
    });

    test('sold out product shows badge and cannot add', async ({ page }) => {
        const timesMap = tomorrowSlots([{ h: 11, m: 0, active: true }]);
        await installCatalogAndTimeslotMocks(page, {
            products: [{ ...E2E_PRODUCT_SOLD_OUT }],
            timesMap,
        });
        await stepPause(page);

        await page.goto('/menu');
        await stepPause(page);
        await expect(productCard(page, E2E_PRODUCT_SOLD_OUT.title).getByTestId('product-stock-hint')).toHaveText(
            'SOLD OUT',
        );
        await expect(addToCartOnCard(page, E2E_PRODUCT_SOLD_OUT.title)).toBeDisabled();
    });
});
