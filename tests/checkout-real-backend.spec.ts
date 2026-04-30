/**
 * Tests that exercise the real local backend + Stripe Elements.
 * These cannot be mocked — they verify behavior that depends on a real
 * Stripe-backed clientSecret being valid (e.g. the payment step rendering
 * the contact form, notes textarea, confirmation card).
 *
 * Uses real Stripe test cards; the local backend skips emails/SMS/printing
 * because NODE_ENV=test.
 */
import { test, expect } from '@playwright/test';
import {
    addProductToCart,
    addProductWithOptionsToCart,
    navigateToCheckout,
    selectPickupTimeslot,
    fillCustomerInfo,
    fillStripePaymentForm,
    submitPayment,
    waitForPaymentProcessing,
    verifyOrderConfirmation,
    TEST_CARDS,
    TEST_CUSTOMER,
} from './helpers/checkout';

test.describe('Checkout (real backend)', () => {
    test('order notes textarea is editable on the payment step', async ({ page }) => {
        test.setTimeout(60000);
        await addProductToCart(page);
        await navigateToCheckout(page);
        await selectPickupTimeslot(page);

        const notes = page.locator('#notes');
        await expect(notes).toBeVisible({ timeout: 10000 });
        await notes.fill('Slice the bread, please!');
        await expect(notes).toHaveValue('Slice the bread, please!');
    });

    test('contact info inputs are HTML5-required (block empty submit)', async ({ page }) => {
        test.setTimeout(60000);
        await addProductToCart(page);
        await navigateToCheckout(page);
        await selectPickupTimeslot(page);

        for (const id of ['name', 'email', 'phone']) {
            const input = page.locator(`#${id}`);
            await expect(input).toBeVisible({ timeout: 10000 });
            await expect(input).toHaveAttribute('required', '');
        }
    });

    test('selected pickup time appears on the payment step', async ({ page }) => {
        test.setTimeout(60000);
        await addProductToCart(page);
        await navigateToCheckout(page);
        await selectPickupTimeslot(page);

        // The "Pickup Selected" confirmation block in the order summary card
        await expect(page.getByText(/Pickup Selected/i)).toBeVisible({ timeout: 10000 });
    });

    test('order notes persist on the order returned by the backend', async ({ page }) => {
        test.setTimeout(120000);

        const NOTE_TEXT = `E2E note ${Date.now()}`;
        let capturedOrderNotes: string | null = null;

        // Capture the processOrderAndPay response and read the order's notes
        page.on('response', async (response) => {
            if (response.url().includes('/processOrderAndPay') && response.status() < 400) {
                try {
                    const body = await response.json();
                    if (body && body.order && typeof body.order.notes === 'string') {
                        capturedOrderNotes = body.order.notes;
                    }
                } catch {
                    /* swallow non-JSON */
                }
            }
        });

        await addProductToCart(page);
        await navigateToCheckout(page);
        await selectPickupTimeslot(page);
        await fillCustomerInfo(page, TEST_CUSTOMER);

        // Fill notes before payment
        const notes = page.locator('#notes');
        await expect(notes).toBeVisible();
        await notes.fill(NOTE_TEXT);

        await fillStripePaymentForm(page, TEST_CARDS.SUCCESS);
        await submitPayment(page);
        await waitForPaymentProcessing(page);

        const foundSuccess = await verifyOrderConfirmation(page);
        expect(foundSuccess).toBeTruthy();

        // Backend response carried our notes
        expect(capturedOrderNotes).toBe(NOTE_TEXT);
    });

    test('add-ons are sent to backend with their cost in the order payload', async ({ page }) => {
        test.setTimeout(120000);

        let sentItems: any[] | null = null;
        let returnedItems: any[] | null = null;

        // Capture both the FE request body and backend response body
        page.on('request', async (req) => {
            if (req.url().includes('/processOrderAndPay') && req.method() === 'POST') {
                try {
                    const body = JSON.parse(req.postData() || '{}');
                    if (body?.order?.items) sentItems = body.order.items;
                } catch { /* swallow */ }
            }
        });
        page.on('response', async (res) => {
            if (res.url().includes('/processOrderAndPay') && res.status() < 400) {
                try {
                    const body = await res.json();
                    if (body?.order?.items) returnedItems = body.order.items;
                } catch { /* swallow */ }
            }
        });

        // Pepperoni Pizza in the seed has sizes (Small/Medium/Large) +
        // Toppings add-ons + a Styles selection (required).
        // Targeting the card directly — the helper's fuzzy product-find can fall back to the wrong card.
        await page.goto('/menu');
        await page.locator('.grid > div').filter({ hasText: 'Pepperoni Pizza' }).locator('button:has-text("Add to Cart")').first().click();
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Pick the Styles selection (required) — first option
        await dialog.locator('[role="combobox"]').first().click();
        await page.getByRole('option').first().click();

        // Toggle Extra Cheese add-on (cost $1.50)
        await dialog.getByText('Extra Cheese', { exact: true }).click();

        await dialog.locator('button:has-text("Add to Cart")').click();
        await expect(dialog).toBeHidden();
        await navigateToCheckout(page);
        await selectPickupTimeslot(page);
        await fillCustomerInfo(page, TEST_CUSTOMER);
        await fillStripePaymentForm(page, TEST_CARDS.SUCCESS);
        await submitPayment(page);
        await waitForPaymentProcessing(page);

        // The FE sent at least one item with add_ons populated, including a positive cost
        expect(sentItems).not.toBeNull();
        expect(sentItems!.length).toBeGreaterThan(0);
        const sent = sentItems![0];
        expect(sent.add_ons).toBeDefined();
        const sentAddOnValues = Object.values(sent.add_ons || {}).flat() as Array<{ value: string; cost: number }>;
        expect(sentAddOnValues.length).toBeGreaterThan(0);
        const sentCheese = sentAddOnValues.find((a) => a.value === 'Extra Cheese');
        expect(sentCheese).toBeDefined();
        expect(sentCheese!.cost).toBeGreaterThan(0);

        // The backend round-tripped the same data on the response (proves persistence)
        expect(returnedItems).not.toBeNull();
        const returned = returnedItems!.find((i: any) => i.productId === sent.productId);
        expect(returned).toBeDefined();
        // Backend stores add_ons as a JSON string keyed by category, e.g.
        //   "{\"Toppings\":[{\"value\":\"Extra Cheese\",\"cost\":1.5}]}"
        const returnedAddOnsRaw =
            typeof returned.add_ons === 'string' ? JSON.parse(returned.add_ons) : returned.add_ons || {};
        const returnedAddOnList: Array<{ value: string; cost: number }> = Object.values(
            returnedAddOnsRaw,
        ).flat() as any;
        const returnedCheese = returnedAddOnList.find((a) => a.value === 'Extra Cheese');
        expect(returnedCheese).toBeDefined();
        expect(returnedCheese!.cost).toBeGreaterThan(0);
    });

    test('order confirmation page shows pickup time, contact info, and total', async ({ page }) => {
        test.setTimeout(120000);
        await addProductToCart(page);
        await navigateToCheckout(page);
        await selectPickupTimeslot(page);
        await fillCustomerInfo(page, TEST_CUSTOMER);
        await fillStripePaymentForm(page, TEST_CARDS.SUCCESS);
        await submitPayment(page);
        await waitForPaymentProcessing(page);

        // We're on the confirmation step now
        await expect(page.getByText(/Thank you for your order/i)).toBeVisible({ timeout: 15000 });

        // Pickup Details section with time
        await expect(page.getByText(/Pickup Details/i)).toBeVisible();

        // Contact Information section showing the test customer
        await expect(page.getByText(/Contact Information/i)).toBeVisible();
        await expect(page.getByText(TEST_CUSTOMER.name)).toBeVisible();
        await expect(page.getByText(TEST_CUSTOMER.email)).toBeVisible();

        // Order Total section with a $ amount
        await expect(page.getByText(/Order Total/i)).toBeVisible();
        await expect(page.locator('text=/\\$\\d+\\.\\d{2}/').first()).toBeVisible();
    });
});
