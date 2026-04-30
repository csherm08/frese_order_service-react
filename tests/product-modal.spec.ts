/**
 * ProductModal behavior with mocked products.
 *
 * Validates: opens for products with options, required selection blocks submit,
 * total reflects size/add-on changes, cancel doesn't add, modal quantity selector.
 */
import { test, expect } from '@playwright/test';
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

// Sizes only — first size auto-selects, no required selections, modal can submit.
// Size cost is a DELTA over product.price (the existing seed convention).
const SIZED_BREAD = {
    id: 80101,
    title: 'E2E Sized Bread',
    description: 'Pick a size',
    price: 5,
    photoUrl: '',
    typeId: 1,
    quantity: -1,
    active: true,
    product_sizes: [
        { id: 9001, product_id: 80101, size: 'Small', cost: 0 },   // → $5
        { id: 9002, product_id: 80101, size: 'Large', cost: 5 },   // → $10
    ],
} as const;

// Required selection (no default), modal MUST block submit until selected
const REQUIRED_SELECTION = {
    id: 80102,
    title: 'E2E Selection Bread',
    description: 'Pick a flavor',
    price: 6,
    photoUrl: '',
    typeId: 1,
    quantity: -1,
    active: true,
    product_sizes: [{ id: 9101, product_id: 80102, size: 'default', cost: 0 }],
    product_selection_values: {
        Flavor: {
            default: [
                { id: 7001, value: 'Plain', cost: 0, key_id: 1 },
                { id: 7002, value: 'Sesame', cost: 1, key_id: 1 },
            ],
        },
    },
} as const;

// Add-ons that change total
const ADDON_PRODUCT = {
    id: 80103,
    title: 'E2E Add-on Bread',
    description: 'Optional extras',
    price: 4,
    photoUrl: '',
    typeId: 1,
    quantity: -1,
    active: true,
    product_sizes: [{ id: 9201, product_id: 80103, size: 'default', cost: 0 }],
    product_add_on_values: {
        Extras: {
            default: [
                { id: 7101, value: 'Butter', cost: 1, key_id: 2 },
                { id: 7201, value: 'Jam', cost: 2, key_id: 2 },
            ],
        },
    },
} as const;

async function setupMocks(page: import('@playwright/test').Page) {
    await installCatalogAndTimeslotMocks(page, {
        products: [SIZED_BREAD, REQUIRED_SELECTION, ADDON_PRODUCT],
        types: TYPES,
        timesMap: tomorrowSlots([{ h: 10, active: true }]),
    });
}

function openProduct(page: import('@playwright/test').Page, title: string) {
    return page.locator('.grid > div').filter({ hasText: title }).locator('button:has-text("Add to Cart")').click();
}

test.describe('Product modal', () => {
    test.afterEach(async ({ page }) => {
        await clearApiRouteMocks(page);
    });

    test.beforeEach(async ({ page }) => {
        await clearCartStorage(page);
        await setupMocks(page);
    });

    test('opens for products with options', async ({ page }) => {
        await page.goto('/menu');
        await openProduct(page, SIZED_BREAD.title);

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(SIZED_BREAD.title);
    });

    test('Cancel closes the modal without adding to cart', async ({ page }) => {
        await page.goto('/menu');
        await openProduct(page, SIZED_BREAD.title);

        const dialog = page.locator('[role="dialog"]').first();
        await dialog.locator('button:has-text("Cancel")').click();
        await expect(dialog).toBeHidden();

        await page.goto('/cart');
        await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(0);
    });

    test('changing size updates the displayed total', async ({ page }) => {
        await page.goto('/menu');
        await openProduct(page, SIZED_BREAD.title);

        const dialog = page.locator('[role="dialog"]').first();
        // First size auto-selected: $5
        await expect(dialog.getByText('$5.00').last()).toBeVisible();

        // Pick Large
        await dialog.getByText('Large').click();
        await expect(dialog.getByText('$10.00').last()).toBeVisible();
    });

    test('add-on toggles update the total', async ({ page }) => {
        await page.goto('/menu');
        await openProduct(page, ADDON_PRODUCT.title);

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog.getByText('$4.00').last()).toBeVisible();

        // Toggle Butter (+$1) → 5
        await dialog.getByText('Butter').click();
        await expect(dialog.getByText('$5.00').last()).toBeVisible();

        // Add Jam (+$2) → 7
        await dialog.getByText('Jam').click();
        await expect(dialog.getByText('$7.00').last()).toBeVisible();
    });

    test('required selection blocks Add to Cart with a toast', async ({ page }) => {
        await page.goto('/menu');
        await openProduct(page, REQUIRED_SELECTION.title);

        const dialog = page.locator('[role="dialog"]').first();
        await dialog.locator('button:has-text("Add to Cart")').click();

        // Sonner toast container shows the validation message
        await expect(page.getByText(/Please select a Flavor/)).toBeVisible();

        // Modal should still be visible
        await expect(dialog).toBeVisible();
    });

    test('selecting required field then submitting adds to cart and closes', async ({ page }) => {
        await page.goto('/menu');
        await openProduct(page, REQUIRED_SELECTION.title);

        const dialog = page.locator('[role="dialog"]').first();

        // Open the Flavor select and choose Sesame (+$1) → total 7
        const select = dialog.locator('[role="combobox"]').first();
        await select.click();
        await page.getByRole('option', { name: 'Sesame' }).click();
        await expect(dialog.getByText('$7.00').last()).toBeVisible();

        await dialog.locator('button:has-text("Add to Cart")').click();
        await expect(dialog).toBeHidden();

        await page.goto('/cart');
        await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    });

    test('size button shows absolute price, not raw delta (Small=base+0, Medium=base+delta)', async ({ page }) => {
        // Pizza-shaped product: $16.99 base + size deltas (Small=0, Medium=3, Large=6)
        const PIZZA = {
            id: 80104,
            title: 'E2E Pizza Sizes',
            description: 'Sizes are deltas',
            price: 16.99,
            photoUrl: '',
            typeId: 1,
            quantity: -1,
            active: true,
            product_sizes: [
                { id: 9301, product_id: 80104, size: 'Small', cost: 0 },
                { id: 9302, product_id: 80104, size: 'Medium', cost: 3 },
                { id: 9303, product_id: 80104, size: 'Large', cost: 6 },
            ],
        };
        await clearApiRouteMocks(page);
        await installCatalogAndTimeslotMocks(page, {
            products: [PIZZA],
            types: TYPES,
            timesMap: tomorrowSlots([{ h: 10, active: true }]),
        });
        await page.goto('/menu');
        await openProduct(page, PIZZA.title);

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Locate each size row by id (the radio ids are size-{id}). Walk up to
        // the row container which contains the size label AND the price span.
        const smallRow = dialog.locator(`#size-${PIZZA.product_sizes[0].id}`).locator('xpath=ancestor::div[2]');
        await expect(smallRow).toContainText('$16.99');
        const mediumRow = dialog.locator(`#size-${PIZZA.product_sizes[1].id}`).locator('xpath=ancestor::div[2]');
        await expect(mediumRow).toContainText('$19.99');
        const largeRow = dialog.locator(`#size-${PIZZA.product_sizes[2].id}`).locator('xpath=ancestor::div[2]');
        await expect(largeRow).toContainText('$22.99');

        // Modal Total reflects the selected size: Small auto-selected first
        const totalLabel = dialog.locator('text=Total').first();
        const totalRow = totalLabel.locator('xpath=..');
        await expect(totalRow).toContainText('$16.99');

        // Pick Large → Total reflects $22.99
        await dialog.getByText('Large', { exact: true }).click();
        await expect(totalRow).toContainText('$22.99');
    });

    test('modal quantity stepper increments price proportionally', async ({ page }) => {
        await page.goto('/menu');
        await openProduct(page, SIZED_BREAD.title);

        const dialog = page.locator('[role="dialog"]').first();
        // Hit the + inside the modal twice → quantity 3, total = 5 * 3 = 15
        const plusButtons = dialog.locator('button:has(svg.lucide-plus)');
        await plusButtons.first().click();
        await plusButtons.first().click();

        await expect(dialog.getByText('$15.00').last()).toBeVisible();
    });
});
