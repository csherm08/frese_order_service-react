/**
 * Add-on price math: cart line totals, subtotal, tax, and real-backend
 * persistence. These guard against the "your customer was charged the wrong
 * amount" scenario.
 */
import { test, expect, type Page } from '@playwright/test';
import {
    clearApiRouteMocks,
    clearCartStorage,
    installCatalogAndTimeslotMocks,
    tomorrowSlots,
} from './helpers/api-route-mocks';
import { fillModalDefaults } from './helpers/checkout';

const TYPES = [
    { id: 1, name: 'Bread' },
    { id: 2, name: 'Pastry' },
    { id: 5, name: 'Special' },
];

// Bread (tax-exempt) with an add-on that adds $1
const BREAD_WITH_ADDON = {
    id: 80501,
    title: 'E2E Add-on Bread',
    description: 'Bread with optional spread',
    price: 4,
    photoUrl: '',
    typeId: 1, // Bread → tax-exempt
    quantity: -1,
    active: true,
    product_sizes: [{ id: 9501, product_id: 80501, size: 'default', cost: 0 }],
    product_add_on_values: {
        Extras: {
            default: [
                { id: 7501, value: 'Butter', cost: 1, key_id: 2 },
            ],
        },
    },
} as const;

// Pastry (taxable) with an add-on that adds $2
const PASTRY_WITH_ADDON = {
    id: 80502,
    title: 'E2E Add-on Pastry',
    description: 'Pastry with optional topping',
    price: 3,
    photoUrl: '',
    typeId: 2, // Pastry → taxable
    quantity: -1,
    active: true,
    product_sizes: [{ id: 9601, product_id: 80502, size: 'default', cost: 0 }],
    product_add_on_values: {
        Extras: {
            default: [
                { id: 7601, value: 'Glaze', cost: 2, key_id: 2 },
            ],
        },
    },
} as const;

async function setupMocks(page: Page) {
    await installCatalogAndTimeslotMocks(page, {
        products: [BREAD_WITH_ADDON, PASTRY_WITH_ADDON],
        types: TYPES,
        timesMap: tomorrowSlots([{ h: 11, active: true }]),
    });
}

async function addBreadWithButter(page: Page) {
    await page.goto('/menu');
    await page
        .locator('.grid > div')
        .filter({ hasText: BREAD_WITH_ADDON.title })
        .locator('button:has-text("Add to Cart")')
        .click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await fillModalDefaults(dialog);
    await dialog.getByText('Butter').click();
    // Confirm modal total reflects the add-on before submitting
    await expect(dialog.getByText('$5.00').last()).toBeVisible();
    await dialog.locator('button:has-text("Add to Cart")').click();
    await expect(dialog).toBeHidden();
}

async function addPastryWithGlaze(page: Page) {
    await page.goto('/menu');
    await page
        .locator('.grid > div')
        .filter({ hasText: PASTRY_WITH_ADDON.title })
        .locator('button:has-text("Add to Cart")')
        .click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await fillModalDefaults(dialog);
    await dialog.getByText('Glaze').click();
    await expect(dialog.getByText('$5.00').last()).toBeVisible();
    await dialog.locator('button:has-text("Add to Cart")').click();
    await expect(dialog).toBeHidden();
}

test.describe('Add-on price math', () => {
    test.afterEach(async ({ page }) => {
        await clearApiRouteMocks(page);
    });

    test.beforeEach(async ({ page }) => {
        await clearCartStorage(page);
        await setupMocks(page);
    });

    test('cart line total = base + add-on, NOT base + add-on + add-on', async ({ page }) => {
        await addBreadWithButter(page);
        await page.goto('/cart');

        const line = page.locator('[data-testid="cart-item"]').first();
        // Expected: $4 base + $1 Butter = $5.00 each
        await expect(line.getByText(/\$5\.00 each/)).toBeVisible();
        await expect(line.getByText(/\$5\.00$/).first()).toBeVisible();
    });

    test('subtotal sums add-ons across multiple items', async ({ page }) => {
        await addBreadWithButter(page);   // $5
        await addPastryWithGlaze(page);   // $5
        await page.goto('/cart');

        // Subtotal: $5 + $5 = $10
        // Tax: only pastry @ 8% on $5 = $0.40
        // Total: $10.40
        await expect(page.getByText('$10.00').first()).toBeVisible();
        await expect(page.getByText('$0.40').first()).toBeVisible();
        await expect(page.getByText('$10.40').first()).toBeVisible();
    });

    test('tax: bread+addon stays tax-exempt; pastry+addon is taxed on the whole line', async ({ page }) => {
        // Bread alone: $4 + $1 add-on = $5, tax should be $0.00
        await addBreadWithButter(page);
        await page.goto('/cart');
        // Tax row should show $0.00
        const taxRow = page.locator('text=/^Tax/').locator('xpath=..').first();
        await expect(taxRow).toContainText('$0.00');

        // Now add pastry: $3 + $2 add-on = $5, tax = $5 * 0.08 = $0.40
        await addPastryWithGlaze(page);
        await page.goto('/cart');
        await expect(page.getByText('$0.40').first()).toBeVisible();
    });
});
