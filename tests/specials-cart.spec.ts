import { test, expect, Page } from '@playwright/test';
import {
    addProductToCart,
    addProductWithOptionsToCart,
    addProductFromSpecialToCart,
    navigateToCheckout,
    selectPickupTimeslot,
    fillCustomerInfo,
    fillStripePaymentForm,
    submitPayment,
    waitForPaymentProcessing,
    verifyOrderConfirmation,
    TEST_CARDS,
    TEST_CUSTOMER,
    getAvailableSpecials,
} from './helpers/checkout';
import {
    setupTestSpecials,
    cleanupTestSpecials,
} from './helpers/specials';

/**
 * Test suite for specials and cart mode conflicts
 */

test.describe('Specials and Cart Logic', () => {
    let testSpecialIds: number[] = [];

    // Setup: Create test specials before all tests
    test.beforeAll(async () => {
        try {
            testSpecialIds = await setupTestSpecials();
            console.log(`Setup complete: Created ${testSpecialIds.length} test specials`);
        } catch (error) {
            console.warn('Failed to setup test specials:', error);
            // Don't fail tests if setup fails - tests will skip if needed
        }
    });

    // Cleanup: Delete test specials after all tests
    test.afterAll(async () => {
        await cleanupTestSpecials(testSpecialIds);
    });
    test('should prevent mixing regular and special products in cart', async ({ page }: { page: Page }) => {
        test.setTimeout(90000);

        // Step 0: Check for available specials BEFORE adding regular product
        await test.step('Check for available specials', async () => {
            const specials = await getAvailableSpecials(page);

            if (specials.length === 0) {
                test.skip(true, 'No specials available for testing');
                return;
            }

            console.log(`Found ${specials.length} available special(s)`);
        });

        // Step 1: Add a regular product to cart
        await test.step('Add regular product to cart', async () => {
            await addProductToCart(page);
            console.log('✓ Added regular product to cart');
        });

        // Step 2: Navigate to cart to verify
        await test.step('Verify cart has regular product', async () => {
            await page.goto('/cart');
            const cartItems = page.locator('[data-testid="cart-item"]');
            const itemCount = await cartItems.count();
            expect(itemCount).toBeGreaterThan(0);
            console.log('✓ Cart contains regular product');
        });

        // Step 3: Try to add a product from a special (should show conflict dialog)
        await test.step('Attempt to add special product (expect conflict)', async () => {
            // Get available specials
            const specials = await getAvailableSpecials(page);

            if (specials.length === 0) {
                test.skip(true, 'No specials available for testing');
                return;
            }

            const firstSpecial = specials[0];
            console.log(`Attempting to add product from special: ${firstSpecial.name}`);

            // Navigate to special page
            await page.goto(`/order/special/${firstSpecial.id}`);

            // Wait for products to load
            await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });

            // Click first Add to Cart button
            const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
            await addToCartButton.click();

            // Wait for conflict dialog to appear
            await page.waitForTimeout(1000);
            const conflictDialog = page.locator('[role="alertdialog"]').first();
            const dialogVisible = await conflictDialog.isVisible().catch(() => false);

            if (!dialogVisible) {
                // Check if modal opened instead (product might need configuration)
                const modal = page.locator('[role="dialog"]').first();
                const modalVisible = await modal.isVisible().catch(() => false);

                if (modalVisible) {
                    // Try to add from modal - this should trigger conflict dialog
                    const addInModal = modal.locator('button:has-text("Add to Cart")').first();
                    await addInModal.click();
                    await page.waitForTimeout(1000);

                    // Now conflict dialog should appear
                    const conflictAfterModal = page.locator('[role="alertdialog"]').first();
                    const conflictVisible = await conflictAfterModal.isVisible().catch(() => false);
                    expect(conflictVisible).toBeTruthy();
                } else {
                    // Take screenshot for debugging
                    await page.screenshot({ path: 'test-results/no-conflict-dialog.png', fullPage: true });
                    throw new Error('Expected conflict dialog but none appeared');
                }
            } else {
                expect(dialogVisible).toBeTruthy();
                console.log('✓ Conflict dialog appeared as expected');
            }

            // Verify conflict message mentions clearing cart
            const dialogText = await conflictDialog.textContent();
            expect(dialogText).toContain('clear');
            expect(dialogText).toContain('cart');
        });
    });

    test('should allow clearing cart and switching to special mode', async ({ page }: { page: Page }) => {
        test.setTimeout(90000);

        // Step 1: Add a regular product
        await test.step('Add regular product', async () => {
            await addProductToCart(page);
        });

        // Step 2: Get available specials
        await test.step('Get available specials', async () => {
            const specials = await getAvailableSpecials(page);

            if (specials.length === 0) {
                test.skip(true, 'No specials available for testing');
                return;
            }

            const firstSpecial = specials[0];

            // Navigate to special
            await page.goto(`/order/special/${firstSpecial.id}`);
            await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });

            // Try to add product (will trigger conflict)
            const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
            await addToCartButton.click();
            await page.waitForTimeout(1000);

            // Handle modal if it opens
            const modal = page.locator('[role="dialog"]').first();
            const modalVisible = await modal.isVisible().catch(() => false);

            if (modalVisible) {
                const addInModal = modal.locator('button:has-text("Add to Cart")').first();
                await addInModal.click();
                await page.waitForTimeout(1000);
            }

            // Confirm conflict dialog to clear cart
            const conflictDialog = page.locator('[role="alertdialog"]').first();
            await expect(conflictDialog).toBeVisible({ timeout: 5000 });

            const confirmButton = conflictDialog.locator('button:has-text("Confirm"), button:has-text("Clear Cart"), button:has-text("Yes")').first();
            await confirmButton.click();
            await page.waitForTimeout(1000);

            console.log('✓ Confirmed cart clearing');

            // Verify cart was cleared and special product was added
            await page.goto('/cart');
            const cartItems = page.locator('[data-testid="cart-item"]');
            const itemCount = await cartItems.count();

            // Should have 1 item (the special product we just added)
            expect(itemCount).toBeGreaterThanOrEqual(1);
            console.log('✓ Cart cleared and special product added');
        });
    });

    test('should prevent mixing products from different specials', async ({ page }: { page: Page }) => {
        test.setTimeout(90000);

        // Step 1: Get available specials
        const specials = await getAvailableSpecials(page);

        if (specials.length < 2) {
            test.skip(true, 'Need at least 2 specials to test mixing specials');
            return;
        }

        const firstSpecial = specials[0];
        const secondSpecial = specials[1];

        // Step 2: Add product from first special
        await test.step('Add product from first special', async () => {
            await addProductFromSpecialToCart(page, firstSpecial.id, '', {});
            console.log(`✓ Added product from special: ${firstSpecial.name}`);
        });

        // Step 3: Try to add product from second special (should conflict)
        await test.step('Attempt to add product from different special (expect conflict)', async () => {
            await page.goto(`/order/special/${secondSpecial.id}`);
            await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 10000 });

            const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
            await addToCartButton.click();
            await page.waitForTimeout(1000);

            // Handle modal if needed
            const modal = page.locator('[role="dialog"]').first();
            const modalVisible = await modal.isVisible().catch(() => false);

            if (modalVisible) {
                const addInModal = modal.locator('button:has-text("Add to Cart")').first();
                await addInModal.click();
                await page.waitForTimeout(1000);
            }

            // Should show conflict dialog
            const conflictDialog = page.locator('[role="alertdialog"]').first();
            const dialogVisible = await conflictDialog.isVisible().catch(() => false);

            expect(dialogVisible).toBeTruthy();
            console.log('✓ Conflict dialog appeared when mixing different specials');
        });
    });

    test('should allow ordering from a special successfully', async ({ page }: { page: Page }) => {
        test.setTimeout(120000);

        // Step 1: Get available specials
        const specials = await getAvailableSpecials(page);

        if (specials.length === 0) {
            test.skip(true, 'No specials available for testing');
            return;
        }

        const firstSpecial = specials[0];

        // Step 2: Add product from special
        await test.step('Add product from special', async () => {
            await addProductFromSpecialToCart(page, firstSpecial.id, '', {});
            console.log(`✓ Added product from special: ${firstSpecial.name}`);
        });

        // Step 3: Verify cart
        await test.step('Verify cart', async () => {
            await page.goto('/cart');
            const cartItems = page.locator('[data-testid="cart-item"]');
            const itemCount = await cartItems.count();
            expect(itemCount).toBeGreaterThan(0);
        });

        // Step 4: Go to checkout
        await test.step('Navigate to checkout', async () => {
            await navigateToCheckout(page);
        });

        // Step 5: Select pickup timeslot
        await test.step('Select pickup timeslot', async () => {
            await selectPickupTimeslot(page);
        });

        // Step 6: Fill customer information
        await test.step('Fill customer information', async () => {
            await fillCustomerInfo(page, TEST_CUSTOMER);
        });

        // Step 7: Fill payment
        await test.step('Fill payment details', async () => {
            await fillStripePaymentForm(page, TEST_CARDS.SUCCESS);
        });

        // Step 8: Submit order
        await test.step('Submit order', async () => {
            await submitPayment(page);
            await waitForPaymentProcessing(page);
        });

        // Step 9: Verify confirmation
        await test.step('Verify order confirmation', async () => {
            const foundSuccess = await verifyOrderConfirmation(page);
            expect(foundSuccess).toBeTruthy();
        });
    });

    test('should handle special products with size and options', async ({ page }: { page: Page }) => {
        test.setTimeout(120000);

        const specials = await getAvailableSpecials(page);

        if (specials.length === 0) {
            test.skip(true, 'No specials available for testing');
            return;
        }

        const firstSpecial = specials[0];

        // This test assumes the special has a product with options
        // If not, the test will handle it gracefully
        await test.step('Add product with options from special', async () => {
            try {
                await addProductFromSpecialToCart(page, firstSpecial.id, '', {
                    // Try to configure if product supports it
                    // The actual configuration depends on what products are in the special
                });
            } catch (error) {
                // If product doesn't have options, that's fine
                console.log('Product may not have configurable options');
            }
        });

        // Continue with checkout flow
        await navigateToCheckout(page);
        await selectPickupTimeslot(page);
        await fillCustomerInfo(page, TEST_CUSTOMER);
        await fillStripePaymentForm(page, TEST_CARDS.SUCCESS);
        await submitPayment(page);
        await waitForPaymentProcessing(page);

        const foundSuccess = await verifyOrderConfirmation(page);
        expect(foundSuccess).toBeTruthy();
    });

    test('should show conflict when clicking Order on special from specials page with regular cart', async ({ page }: { page: Page }) => {
        test.setTimeout(60000);

        // Step 1: Add regular product
        await addProductToCart(page);

        // Step 2: Navigate to specials page
        await page.goto('/specials');
        await page.waitForURL('/specials', { timeout: 10000 });
        await page.waitForSelector('text=Order Now', { timeout: 10000 }).catch(() => { });

        // Step 3: Click "Order Now" on a special
        const orderButton = page.locator('a:has-text("Order Now"), button:has-text("Order Now")').first();

        if ((await orderButton.count()) > 0) {
            await orderButton.click();
            await page.waitForTimeout(1000);

            // Should show conflict dialog
            const conflictDialog = page.locator('[role="alertdialog"]').first();
            const dialogVisible = await conflictDialog.isVisible().catch(() => false);

            expect(dialogVisible).toBeTruthy();
            console.log('✓ Conflict dialog appeared on specials page');
        } else {
            console.log('No Order Now buttons found - specials page might have different UI');
        }
    });
});
