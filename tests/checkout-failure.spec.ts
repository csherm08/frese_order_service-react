/**
 * Checkout failure paths — payment intent failure, order processing failure,
 * and contact-field validation. All mocked, no backend writes.
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

const PRODUCT = {
    id: 80301,
    title: 'E2E Checkout Bread',
    description: 'Used to populate cart for checkout failure tests',
    price: 5,
    photoUrl: '',
    typeId: 1,
    quantity: -1,
    active: true,
} as const;

async function setupBaseMocks(page: Page) {
    await installCatalogAndTimeslotMocks(page, {
        products: [PRODUCT],
        types: TYPES,
        timesMap: tomorrowSlots([{ h: 11, active: true }]),
    });
}

async function fillCart(page: Page) {
    await page.goto('/menu');
    await page
        .locator('.grid > div')
        .filter({ hasText: PRODUCT.title })
        .locator('button:has-text("Add to Cart")')
        .click();
}

async function advanceToTimeslotStep(page: Page) {
    await page.goto('/checkout');
    // Wait for the date carousel to render (date buttons show the day-of-month number)
    await expect(page.getByText(/Pickup Date/i)).toBeVisible({ timeout: 10000 });
}

/** Pick a date, pick a time, click Confirm — kicks off createPaymentIntent. */
async function selectFirstAvailableSlot(page: Page) {
    // The date carousel is the first row of buttons next to the "Pickup Date" heading.
    // Click the first date to reveal time slots.
    const dateButtons = page.locator('h3:has-text("Pickup Date") + div button');
    await dateButtons.first().waitFor({ state: 'visible', timeout: 5000 });
    await dateButtons.first().click();

    // Time buttons show "h:mm a" format. Click the first one.
    const timeButton = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}\s*(AM|PM)$/i }).first();
    await timeButton.waitFor({ state: 'visible', timeout: 5000 });
    const timeLabel = (await timeButton.textContent())?.trim() ?? '';
    await timeButton.click();

    // Confirm button shows the formatted date + time (e.g. "Wed, May 1 at 11:00 AM").
    // Match by " at " between date and time — unique to this button.
    await page.locator('button').filter({ hasText: / at \d{1,2}:\d{2}\s*(AM|PM)/i }).first().click();
    return timeLabel;
}

test.describe('Checkout failure paths', () => {
    test.afterEach(async ({ page }) => {
        await clearApiRouteMocks(page);
    });

    test.beforeEach(async ({ page }) => {
        await clearCartStorage(page);
        await setupBaseMocks(page);
    });

    test('payment intent creation failure shows an error toast and stays on timeslot step', async ({ page }) => {
        // Mock the payment intent endpoint to fail with a recognizable message
        await page.route('**/stripe/intent', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Mocked intent failure' }),
            });
        });

        await fillCart(page);
        await advanceToTimeslotStep(page);
        await selectFirstAvailableSlot(page);

        // Toast surfaces the API error message (sonner renders inside region[name=Notifications])
        await expect(page.getByText(/Mocked intent failure/i)).toBeVisible({ timeout: 10000 });

        // We should NOT have advanced past the timeslot step — Pay button should not be visible
        await expect(page.locator('button:has-text("Pay $")')).toHaveCount(0);
    });

    // Note: tests that require the payment step to render (contact validation,
    // notes field, pickup time display) live in `order-processing.spec.ts`
    // because Stripe Elements rejects fake mocked clientSecrets.
});
