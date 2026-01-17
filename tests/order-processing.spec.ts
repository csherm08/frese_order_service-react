import { test, expect, Page } from '@playwright/test';
import {
    addProductToCart,
    addProductWithOptionsToCart,
    navigateToCheckout,
    selectPickupTimeslot,
    fillCustomerInfo,
    fillStripePaymentForm,
    updateStripePaymentForm,
    submitPayment,
    waitForPaymentProcessing,
    verifyOrderConfirmation,
    verifyPaymentError,
    TEST_CARDS,
    TEST_CUSTOMER,
} from './helpers/checkout';

/**
 * Test suite for processing an order end-to-end
 */

test.describe('Order Processing', () => {
    test('should process a complete order with payment', async ({ page }: { page: Page }) => {
        // Increase timeout for payment processing which can take time
        test.setTimeout(90000); // 90 seconds

        // Step 1: Navigate to menu and add product to cart
        await test.step('Navigate to menu and add product', async () => {
            await addProductToCart(page);
        });

        // Step 2: Go to checkout
        await test.step('Navigate to checkout', async () => {
            await navigateToCheckout(page);
        });

        // Step 3: Select a pickup timeslot
        await test.step('Select pickup timeslot', async () => {
            await selectPickupTimeslot(page);
        });

        // Step 4: Fill in customer information
        await test.step('Fill customer information', async () => {
            await fillCustomerInfo(page, TEST_CUSTOMER);
        });

        // Step 5: Fill in Stripe payment form with successful card
        await test.step('Fill payment details', async () => {
            await fillStripePaymentForm(page, TEST_CARDS.SUCCESS);
        });

        // Step 6: Submit the order
        await test.step('Submit order', async () => {
            await submitPayment(page);
            await waitForPaymentProcessing(page);
        });

        // Step 7: Verify order confirmation
        await test.step('Verify order confirmation', async () => {
            const foundSuccess = await verifyOrderConfirmation(page);
            expect(foundSuccess).toBeTruthy();
        });
    });

    test('should handle payment errors gracefully when card is declined', async ({ page }: { page: Page }) => {
        // Increase timeout for payment processing
        test.setTimeout(90000);

        // Step 1: Navigate to menu and add product to cart
        await test.step('Navigate to menu and add product', async () => {
            await addProductToCart(page);
        });

        // Step 2: Go to checkout
        await test.step('Navigate to checkout', async () => {
            await navigateToCheckout(page);
        });

        // Step 3: Select a pickup timeslot
        await test.step('Select pickup timeslot', async () => {
            await selectPickupTimeslot(page);
        });

        // Step 4: Fill in customer information
        await test.step('Fill customer information', async () => {
            await fillCustomerInfo(page, TEST_CUSTOMER);
        });

        // Step 5: Fill in Stripe payment form with declined card
        await test.step('Fill payment details with declined card', async () => {
            await fillStripePaymentForm(page, TEST_CARDS.DECLINED);
        });

        // Step 6: Submit the order (should fail)
        await test.step('Submit order (expect failure)', async () => {
            await submitPayment(page);
            await waitForPaymentProcessing(page, 30000);
        });

        // Step 7: Verify payment error appears
        await test.step('Verify payment error', async () => {
            const foundError = await verifyPaymentError(page, 'declined');

            if (!foundError) {
                // Take screenshot for debugging
                await page.screenshot({ path: 'test-results/payment-error-debug.png', fullPage: true });

                // Check if order was actually successful (shouldn't be)
                const foundSuccess = await verifyOrderConfirmation(page);
                if (foundSuccess) {
                    throw new Error('Payment should have failed but order was successful');
                }
            }

            expect(foundError).toBeTruthy();
        });
    });

    test('should handle payment errors with insufficient funds card', async ({ page }: { page: Page }) => {
        // Increase timeout for payment processing
        test.setTimeout(90000);

        // Step 1: Navigate to menu and add product to cart
        await test.step('Navigate to menu and add product', async () => {
            await addProductToCart(page);
        });

        // Step 2: Go to checkout
        await test.step('Navigate to checkout', async () => {
            await navigateToCheckout(page);
        });

        // Step 3: Select a pickup timeslot
        await test.step('Select pickup timeslot', async () => {
            await selectPickupTimeslot(page);
        });

        // Step 4: Fill in customer information
        await test.step('Fill customer information', async () => {
            await fillCustomerInfo(page, TEST_CUSTOMER);
        });

        // Step 5: Fill in Stripe payment form with insufficient funds card
        await test.step('Fill payment details with insufficient funds card', async () => {
            await fillStripePaymentForm(page, TEST_CARDS.INSUFFICIENT_FUNDS);
        });

        // Step 6: Submit the order (should fail)
        await test.step('Submit order (expect failure)', async () => {
            await submitPayment(page);
            await waitForPaymentProcessing(page, 30000);
        });

        // Step 7: Verify payment error appears
        await test.step('Verify payment error', async () => {
            const foundError = await verifyPaymentError(page, 'insufficient');

            if (!foundError) {
                await page.screenshot({ path: 'test-results/insufficient-funds-debug.png', fullPage: true });

                const foundSuccess = await verifyOrderConfirmation(page);
                if (foundSuccess) {
                    throw new Error('Payment should have failed but order was successful');
                }
            }

            expect(foundError).toBeTruthy();
        });
    });

    test('should handle failed payment followed by successful retry', async ({ page }: { page: Page }) => {
        // Increase timeout for payment processing (both attempts)
        test.setTimeout(120000); // 2 minutes

        // Step 1: Navigate to menu and add product to cart
        await test.step('Navigate to menu and add product', async () => {
            await addProductToCart(page);
        });

        // Step 2: Go to checkout
        await test.step('Navigate to checkout', async () => {
            await navigateToCheckout(page);
        });

        // Step 3: Select a pickup timeslot
        await test.step('Select pickup timeslot', async () => {
            await selectPickupTimeslot(page);
        });

        // Step 4: Fill in customer information
        await test.step('Fill customer information', async () => {
            await fillCustomerInfo(page, TEST_CUSTOMER);
        });

        // Step 5: Fill in Stripe payment form with declined card (first attempt)
        await test.step('Fill payment details with declined card (first attempt)', async () => {
            await fillStripePaymentForm(page, TEST_CARDS.DECLINED);
        });

        // Step 6: Submit the order (should fail)
        await test.step('Submit order (first attempt - expect failure)', async () => {
            await submitPayment(page);
            await waitForPaymentProcessing(page, 30000);
        });

        // Step 7: Verify payment error appears
        await test.step('Verify payment error from first attempt', async () => {
            const foundError = await verifyPaymentError(page, 'declined');

            if (!foundError) {
                await page.screenshot({ path: 'test-results/retry-first-error-debug.png', fullPage: true });

                const foundSuccess = await verifyOrderConfirmation(page);
                if (foundSuccess) {
                    throw new Error('First payment should have failed but order was successful');
                }
            }

            expect(foundError).toBeTruthy();
        });

        // Step 8: Update payment form with successful card
        await test.step('Update payment form with successful card', async () => {
            // Wait a bit for error state to clear
            await page.waitForTimeout(2000);

            // Update the Stripe form with a successful card
            await updateStripePaymentForm(page, TEST_CARDS.SUCCESS);

            // Wait for Stripe to validate the new card
            await page.waitForTimeout(2000);
        });

        // Step 9: Retry payment with successful card
        await test.step('Retry payment with successful card', async () => {
            await submitPayment(page);
            await waitForPaymentProcessing(page, 30000);
        });

        // Step 10: Verify order confirmation after retry
        await test.step('Verify order confirmation after successful retry', async () => {
            const foundSuccess = await verifyOrderConfirmation(page);

            if (!foundSuccess) {
                // Check if there's still an error
                const stillHasError = await verifyPaymentError(page);
                if (stillHasError) {
                    await page.screenshot({ path: 'test-results/retry-second-error-debug.png', fullPage: true });
                    throw new Error('Payment retry with successful card failed');
                } else {
                    await page.screenshot({ path: 'test-results/retry-no-confirmation-debug.png', fullPage: true });
                    throw new Error('Order confirmation not found after successful payment retry');
                }
            }

            expect(foundSuccess).toBeTruthy();
        });
    });

    test('should process order with product that has sizes, selections, and add-ons', async ({ page }: { page: Page }) => {
        // Increase timeout for payment processing
        test.setTimeout(90000);

        // Step 1: Navigate to menu and add Pepperoni Pizza with options
        await test.step('Navigate to menu and add product with options', async () => {
            await addProductWithOptionsToCart(page, 'Pepperoni Pizza', {
                size: 'Medium', // Select Medium size
                selections: {
                    'Styles': 'Thick Crust', // Select Thick Crust style
                },
                addOns: {
                    'Toppings': ['Extra Cheese', 'Mushrooms'], // Add Extra Cheese and Mushrooms
                }
            });
        });

        // Step 2: Verify cart contains the configured product
        await test.step('Verify cart contents', async () => {
            // Check that we're on the cart page
            await expect(page).toHaveURL(/\/cart/);

            // Verify the product is in the cart
            const productInCart = page.locator('text=Pepperoni Pizza').first();
            await expect(productInCart).toBeVisible({ timeout: 5000 });

            // Verify size is shown (might be in cart item details)
            // The cart should show the product with its configured options
            console.log('✓ Product with options added to cart');
        });

        // Step 3: Go to checkout
        await test.step('Navigate to checkout', async () => {
            await navigateToCheckout(page);
        });

        // Step 4: Select a pickup timeslot
        await test.step('Select pickup timeslot', async () => {
            await selectPickupTimeslot(page);
        });

        // Step 5: Fill in customer information
        await test.step('Fill customer information', async () => {
            await fillCustomerInfo(page, TEST_CUSTOMER);
        });

        // Step 6: Fill in Stripe payment form with successful card
        await test.step('Fill payment details', async () => {
            await fillStripePaymentForm(page, TEST_CARDS.SUCCESS);
        });

        // Step 7: Submit the order
        await test.step('Submit order', async () => {
            await submitPayment(page);
            await waitForPaymentProcessing(page);
        });

        // Step 8: Verify order confirmation
        await test.step('Verify order confirmation', async () => {
            const foundSuccess = await verifyOrderConfirmation(page);

            if (!foundSuccess) {
                await page.screenshot({ path: 'test-results/product-with-options-error.png', fullPage: true });
            }

            expect(foundSuccess).toBeTruthy();
        });
    });
});

