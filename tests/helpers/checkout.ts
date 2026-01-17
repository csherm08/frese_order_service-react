import { Page, expect } from '@playwright/test';

/**
 * Test data constants
 */
export const TEST_CUSTOMER = {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '5185551234',
};

/**
 * Stripe test card numbers
 * See: https://stripe.com/docs/testing
 */
export const TEST_CARDS = {
    SUCCESS: '4242424242424242',
    DECLINED: '4000000000000002',
    INSUFFICIENT_FUNDS: '4000000000009995',
    EXPIRED_CARD: '4000000000000069',
    INVALID_CVC: '4000000000000127',
};

/**
 * Navigate to menu and add a product to cart
 */
export async function addProductToCart(page: Page) {
    await page.goto('/menu');
    await expect(page).toHaveTitle(/Frese/);

    // Wait for products to load
    await page.waitForSelector('text=Add to Cart', { timeout: 10000 });

    // Find and click the first "Add to Cart" button
    const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Wait for cart to update
    await page.waitForTimeout(1000);

    // Navigate directly to cart page
    await page.goto('/cart');
    await page.waitForURL('/cart');
}

/**
 * Navigate to menu and add a product with options (size, selections, add-ons) to cart
 * @param productName - Name of the product to find and add
 * @param options - Configuration for product options
 */
export async function addProductWithOptionsToCart(
    page: Page,
    productName: string,
    options: {
        size?: string;
        selections?: Record<string, string>; // e.g., { "Styles": "Thick Crust" }
        addOns?: Record<string, string[]>; // e.g., { "Toppings": ["Extra Cheese", "Mushrooms"] }
    } = {}
) {
    await page.goto('/menu');
    await expect(page).toHaveTitle(/Frese/);

    // Wait for products to load
    await page.waitForSelector('text=Add to Cart', { timeout: 10000 });

    // Find the product by name and click "Add to Cart"
    // The product card should contain the product name
    const productCard = page.locator(`text=${productName}`).locator('..').locator('..');
    const addToCartButton = productCard.locator('button:has-text("Add to Cart")').first();

    // If product not found, try finding by title more broadly
    if ((await addToCartButton.count()) === 0) {
        // Try to find any button near the product name
        const productTitle = page.locator(`text=${productName}`).first();
        await expect(productTitle).toBeVisible({ timeout: 10000 });

        // Find the Add to Cart button that's a sibling or nearby
        const nearbyButton = page.locator('button:has-text("Add to Cart")').filter({
            has: page.locator(`text=${productName}`).locator('..')
        }).first();

        if ((await nearbyButton.count()) > 0) {
            await nearbyButton.click();
        } else {
            // Fallback: click the first Add to Cart button and hope it's the right product
            await page.locator('button:has-text("Add to Cart")').first().click();
        }
    } else {
        await addToCartButton.click();
    }

    // Wait for modal to open (product modal opens if product has options)
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {
        // Modal might not open if product has no options
        console.log('No modal opened, product might be simple');
    });

    // Check if modal is open
    const modal = page.locator('[role="dialog"]').first();
    const isModalOpen = await modal.count() > 0 && await modal.isVisible().catch(() => false);

    if (isModalOpen) {
        console.log(`Configuring product: ${productName}`);

        // Select size if provided
        if (options.size) {
            console.log(`  Selecting size: ${options.size}`);
            // Find the size option by text
            const sizeOption = modal.locator(`text=${options.size}`).locator('..').locator('..');
            const sizeRadio = sizeOption.locator('[type="radio"]').first();
            if (await sizeRadio.count() > 0) {
                await sizeRadio.click();
                await page.waitForTimeout(500); // Wait for size change to update options
            } else {
                // Try clicking the size label/container directly
                await sizeOption.click();
                await page.waitForTimeout(500);
            }
        }

        // Make selections if provided
        if (options.selections) {
            for (const [key, value] of Object.entries(options.selections)) {
                console.log(`  Making selection: ${key} = ${value}`);
                // Find the select for this selection key
                const selectTrigger = modal.locator(`text=${key}`).locator('..').locator('..').locator('[role="combobox"]').first();
                if (await selectTrigger.count() > 0) {
                    await selectTrigger.click();
                    await page.waitForTimeout(300);

                    // Find and click the option value
                    const option = page.locator(`text=${value}`).first();
                    await option.click();
                    await page.waitForTimeout(300);
                }
            }
        }

        // Add add-ons if provided
        if (options.addOns) {
            for (const [key, values] of Object.entries(options.addOns)) {
                for (const value of values) {
                    console.log(`  Adding add-on: ${key} = ${value}`);
                    // Find the checkbox for this add-on
                    // The checkbox is near the add-on value text
                    const addOnContainer = modal.locator(`text=${value}`).locator('..').locator('..');
                    const checkbox = addOnContainer.locator('[type="checkbox"]').first();

                    if (await checkbox.count() > 0) {
                        const isChecked = await checkbox.isChecked().catch(() => false);
                        if (!isChecked) {
                            await checkbox.click();
                            await page.waitForTimeout(200);
                        }
                    } else {
                        // Try clicking the container itself
                        await addOnContainer.click();
                        await page.waitForTimeout(200);
                    }
                }
            }
        }

        // Click "Add to Cart" button in modal
        const addToCartInModal = modal.locator('button:has-text("Add to Cart")').first();
        await expect(addToCartInModal).toBeVisible({ timeout: 5000 });
        await addToCartInModal.click();

        // Wait for modal to close and toast to appear
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => { });
        await page.waitForTimeout(1000);
    }

    // Navigate to cart page
    await page.goto('/cart');
    await page.waitForURL('/cart');
}

/**
 * Add a product from a special to the cart
 */
export async function addProductFromSpecialToCart(
    page: Page,
    specialId: number,
    productName: string,
    options: {
        size?: string;
        selections?: Record<string, string>;
        addOns?: Record<string, string[]>;
    } = {}
) {
    // Navigate to special page
    await page.goto(`/order/special/${specialId}`);
    await page.waitForURL(`/order/special/${specialId}`, { timeout: 10000 });

    // Wait for products to load
    await page.waitForSelector('text=Add to Cart', { timeout: 10000 });

    // Find and click the product
    const productCard = page.locator(`text=${productName}`).locator('..').locator('..');
    const addToCartButton = productCard.locator('button:has-text("Add to Cart")').first();

    if ((await addToCartButton.count()) === 0) {
        // Fallback: find button near product name
        const productTitle = page.locator(`text=${productName}`).first();
        await expect(productTitle).toBeVisible({ timeout: 10000 });
        const nearbyButton = page.locator('button:has-text("Add to Cart")').first();
        await nearbyButton.click();
    } else {
        await addToCartButton.click();
    }

    // Check if modal opened
    const modal = page.locator('[role="dialog"]').first();
    const isModalOpen = await modal.count() > 0 && await modal.isVisible().catch(() => false);

    if (isModalOpen) {
        console.log(`Configuring special product: ${productName}`);

        // Handle size, selections, and add-ons (same logic as regular products)
        if (options.size) {
            const sizeOption = modal.locator(`text=${options.size}`).locator('..').locator('..');
            const sizeRadio = sizeOption.locator('[type="radio"]').first();
            if (await sizeRadio.count() > 0) {
                await sizeRadio.click();
                await page.waitForTimeout(500);
            } else {
                await sizeOption.click();
                await page.waitForTimeout(500);
            }
        }

        if (options.selections) {
            for (const [key, value] of Object.entries(options.selections)) {
                const selectTrigger = modal.locator(`text=${key}`).locator('..').locator('..').locator('[role="combobox"]').first();
                if (await selectTrigger.count() > 0) {
                    await selectTrigger.click();
                    await page.waitForTimeout(300);
                    const option = page.locator(`text=${value}`).first();
                    await option.click();
                    await page.waitForTimeout(300);
                }
            }
        }

        if (options.addOns) {
            for (const [key, values] of Object.entries(options.addOns)) {
                for (const value of values) {
                    const addOnContainer = modal.locator(`text=${value}`).locator('..').locator('..');
                    const checkbox = addOnContainer.locator('[type="checkbox"]').first();
                    if (await checkbox.count() > 0) {
                        const isChecked = await checkbox.isChecked().catch(() => false);
                        if (!isChecked) {
                            await checkbox.click();
                            await page.waitForTimeout(200);
                        }
                    } else {
                        await addOnContainer.click();
                        await page.waitForTimeout(200);
                    }
                }
            }
        }

        // Check for conflict dialog first
        const conflictDialog = page.locator('[role="alertdialog"]').first();
        const hasConflict = await conflictDialog.count() > 0 && await conflictDialog.isVisible().catch(() => false);

        if (hasConflict) {
            // Confirm the conflict dialog to clear cart and add item
            const confirmButton = conflictDialog.locator('button:has-text("Confirm"), button:has-text("Clear Cart")').first();
            await confirmButton.click();
            await page.waitForTimeout(1000);
        } else {
            // No conflict, just add to cart
            const addToCartInModal = modal.locator('button:has-text("Add to Cart")').first();
            await expect(addToCartInModal).toBeVisible({ timeout: 5000 });
            await addToCartInModal.click();
            await page.waitForTimeout(1000);
        }
    } else {
        // Simple product, might have conflict dialog
        await page.waitForTimeout(1000);
        const conflictDialog = page.locator('[role="alertdialog"]').first();
        const hasConflict = await conflictDialog.count() > 0 && await conflictDialog.isVisible().catch(() => false);

        if (hasConflict) {
            const confirmButton = conflictDialog.locator('button:has-text("Confirm"), button:has-text("Clear Cart")').first();
            await confirmButton.click();
            await page.waitForTimeout(1000);
        }
    }
}

/**
 * Navigate to specials page and get list of available specials
 */
export async function getAvailableSpecials(page: Page): Promise<Array<{ id: number; name: string }>> {
    await page.goto('/specials');
    await page.waitForURL('/specials', { timeout: 10000 });

    // Wait for specials to load and check for "no specials" message
    await page.waitForTimeout(3000); // Give time for API call

    // Check if there are no active specials
    const noSpecialsMessage = page.locator('text=/No active specials|Check back soon/i');
    const hasNoSpecials = (await noSpecialsMessage.count()) > 0;

    if (hasNoSpecials) {
        console.log('No active specials found on page');
        return [];
    }

    // Try multiple selectors to find special links
    let specialLinks = page.locator('a[href*="/order/special/"]');
    let count = await specialLinks.count();

    // If no links found, try buttons or cards with links
    if (count === 0) {
        // Try finding by href attribute more broadly
        specialLinks = page.locator('[href*="/order/special/"]');
        count = await specialLinks.count();
    }

    // If still nothing, try finding cards that might contain special info
    if (count === 0) {
        // Look for any clickable element that might lead to a special
        const allLinks = page.locator('a, button');
        const allCount = await allLinks.count();

        for (let i = 0; i < Math.min(allCount, 20); i++) {
            const link = allLinks.nth(i);
            const href = await link.getAttribute('href') || '';
            if (href.includes('/order/special/')) {
                specialLinks = page.locator(`a[href="${href}"]`);
                count = 1;
                break;
            }
        }
    }

    const specials: Array<{ id: number; name: string }> = [];

    for (let i = 0; i < count; i++) {
        const link = specialLinks.nth(i);
        const href = await link.getAttribute('href') || '';
        const match = href.match(/\/order\/special\/(\d+)/);

        if (match) {
            const id = parseInt(match[1]);
            // Try to get name from nearby text or parent element
            let name: string = await link.textContent() || '';
            if (!name || name.trim() === '') {
                // Try parent element or nearby heading
                const parent = link.locator('..').locator('..');
                const headingText = await parent.locator('h2, h3, .title, [class*="title"]').first().textContent().catch(() => null);
                name = headingText || '';
                if (!name) {
                    const parentText = await parent.textContent().catch(() => null);
                    name = parentText || `Special ${id}`;
                }
            }
            // Clean up name - take first line and remove extra whitespace
            const cleanedName = name.trim().split('\n')[0].trim();
            if (cleanedName && !specials.find(s => s.id === id)) {
                specials.push({ id, name: cleanedName });
            }
        }
    }

    // Remove duplicates
    const uniqueSpecials = specials.filter((special, index, self) =>
        index === self.findIndex(s => s.id === special.id)
    );

    return uniqueSpecials;
}

/**
 * Navigate to checkout page from cart
 */
export async function navigateToCheckout(page: Page) {
    const checkoutButton = page.locator('button:has-text("Checkout")').first();
    await expect(checkoutButton).toBeVisible({ timeout: 5000 });
    await checkoutButton.click();

    await page.waitForURL('/checkout', { timeout: 10000 });
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();
}

/**
 * Select a pickup timeslot
 */
export async function selectPickupTimeslot(page: Page) {
    // Wait for timeslot selector section to appear
    await page.waitForSelector('text=Select Pickup Date', { timeout: 15000 });

    // Wait for loading to complete
    try {
        const spinner = page.locator('svg.animate-spin');
        if (await spinner.count() > 0) {
            await spinner.first().waitFor({ state: 'hidden', timeout: 30000 });
        }
    } catch (e) {
        // Spinner might not exist, that's fine
    }

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for time buttons
    let timeButtons = page.locator('button').filter({ hasText: /AM|PM/ });

    // If no time buttons found, try selecting a date first
    if (await timeButtons.count() === 0) {
        const dateButtons = page.locator('h3:has-text("Select Pickup Date")').locator('..').locator('button');
        const dateButtonCount = await dateButtons.count();

        if (dateButtonCount > 0) {
            await dateButtons.first().click();
            await page.waitForTimeout(1500);

            // Now look for time buttons again
            timeButtons = page.locator('button').filter({ hasText: /AM|PM/ });
        }
    }

    // Wait for time buttons to be visible
    if (await timeButtons.count() === 0) {
        await page.screenshot({ path: 'test-results/timeslot-selector-debug.png', fullPage: true });
        throw new Error('No time slot buttons found. Check screenshot: test-results/timeslot-selector-debug.png');
    }

    await timeButtons.first().waitFor({ state: 'visible', timeout: 10000 });
    await timeButtons.first().click();

    // Wait for confirm button to appear
    const confirmButton = page.locator('button:has-text("Confirm Pickup")');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();

    // Wait for payment step to appear
    await page.waitForSelector('text=Payment & Contact Information', { timeout: 15000 });
}

/**
 * Fill in customer information
 */
export async function fillCustomerInfo(page: Page, customer = TEST_CUSTOMER) {
    // Fill in name
    const nameInput = page.locator('input[id="name"], input[placeholder*="Name" i]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(customer.name);

    // Fill in email
    const emailInput = page.locator('input[id="email"], input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(customer.email);

    // Fill in phone
    const phoneInput = page.locator('input[id="phone"], input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill(customer.phone);

    // Wait a bit for form to register changes
    await page.waitForTimeout(500);
}

/**
 * Fill Stripe payment form with a test card
 */
export async function fillStripePaymentForm(
    page: Page,
    cardNumber: string = TEST_CARDS.SUCCESS,
    expiry: string = '12/34',
    cvc: string = '123',
    zip: string = '12345'
) {
    // Wait for Payment Details section to appear
    await page.waitForSelector('text=Payment Details', { timeout: 10000 });

    // Wait for Stripe iframe to appear
    console.log('Waiting for Stripe iframe to load...');
    await page.waitForSelector('iframe', { timeout: 30000 });
    await page.waitForTimeout(3000); // Additional wait for Stripe to fully initialize

    const iframe = page.locator('iframe').first();
    await expect(iframe).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000); // Extra time for Stripe Elements to render

    const stripeFrame = page.frameLocator('iframe').first();

    try {
        console.log('Waiting for Stripe payment inputs...');

        // Wait for ANY input to appear first to confirm iframe is loaded
        await stripeFrame.locator('input').first().waitFor({ state: 'attached', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Fill card number
        console.log('Looking for card number field...');
        let cardInput;
        try {
            cardInput = stripeFrame.getByRole('textbox', { name: 'Card number' });
            await cardInput.waitFor({ state: 'attached', timeout: 10000 });
        } catch (e) {
            cardInput = stripeFrame.locator('[placeholder="Card number"]');
            await cardInput.waitFor({ state: 'attached', timeout: 10000 });
        }
        await cardInput.click();
        await page.waitForTimeout(500);
        await cardInput.fill(cardNumber);
        await page.waitForTimeout(500);
        console.log('✓ Filled card number');

        // Fill expiration date
        console.log('Looking for expiration field...');
        let expiryInput;
        try {
            expiryInput = stripeFrame.getByRole('textbox', { name: 'Expiration date MM / YY' });
            await expiryInput.waitFor({ state: 'attached', timeout: 10000 });
        } catch (e) {
            expiryInput = stripeFrame.locator('[placeholder="MM / YY"]');
            await expiryInput.waitFor({ state: 'attached', timeout: 10000 });
        }
        await expiryInput.click();
        await page.waitForTimeout(500);
        await expiryInput.fill(expiry);
        await page.waitForTimeout(500);
        console.log('✓ Filled expiration date');

        // Fill CVC
        console.log('Looking for CVC field...');
        let cvcInput;
        try {
            cvcInput = stripeFrame.getByRole('textbox', { name: 'Security code' });
            await cvcInput.waitFor({ state: 'attached', timeout: 10000 });
        } catch (e) {
            cvcInput = stripeFrame.locator('[placeholder="CVC"]');
            await cvcInput.waitFor({ state: 'attached', timeout: 10000 });
        }
        await cvcInput.click();
        await page.waitForTimeout(500);
        await cvcInput.fill(cvc);
        await page.waitForTimeout(500);
        console.log('✓ Filled CVC');

        // Fill ZIP code if present
        console.log('Looking for ZIP code field...');
        try {
            let zipInput = stripeFrame.getByRole('textbox', { name: 'ZIP code' });
            await zipInput.waitFor({ state: 'attached', timeout: 10000 });
            await zipInput.click();
            await zipInput.fill(zip);
            await page.waitForTimeout(500);
            console.log('✓ Filled ZIP code');
        } catch (e) {
            // Fallback to placeholder selector
            try {
                const zipInput = stripeFrame.locator('[placeholder*="ZIP"], [placeholder*="Postal"]');
                const zipExists = await zipInput.count();
                if (zipExists > 0) {
                    await zipInput.first().waitFor({ state: 'attached', timeout: 10000 });
                    await zipInput.first().click();
                    await zipInput.first().fill(zip);
                    await page.waitForTimeout(500);
                    console.log('✓ Filled ZIP code');
                } else {
                    console.log('⚠ ZIP code field not found (may not be required)');
                }
            } catch (e2) {
                console.log('⚠ ZIP code field not found (may not be required)');
            }
        }

        console.log('✅ Payment form filling completed');
    } catch (error) {
        console.error('Error filling Stripe form:', error);
        await page.screenshot({ path: 'test-results/stripe-form-error.png', fullPage: true });
        throw error;
    }
}

/**
 * Submit the payment form
 */
export async function submitPayment(page: Page) {
    // Wait a bit for Stripe to validate the form
    await page.waitForTimeout(2000);

    const submitButton = page.getByRole('button', { name: /^Pay/ }).first();
    await expect(submitButton).toBeVisible({ timeout: 10000 });

    // Scroll button into view
    await submitButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Check if button is disabled
    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
        console.warn('⚠ Submit button is disabled - payment form may not be complete');
        await page.screenshot({ path: 'test-results/submit-button-disabled.png', fullPage: true });

        await page.waitForTimeout(3000);

        const stillDisabled = await submitButton.isDisabled();
        if (stillDisabled) {
            const errors = await page.locator('text=/error|invalid|required/i').count();
            if (errors > 0) {
                const errorText = await page.locator('text=/error|invalid|required/i').first().textContent();
                console.error('Form validation errors:', errorText);
            }
            throw new Error('Submit button remains disabled - payment form may not be properly filled');
        }
    }

    console.log('Clicking Pay button...');
    await submitButton.click();
    console.log('✓ Pay button clicked');

    await page.waitForTimeout(1000);
}

/**
 * Wait for payment processing to complete
 */
export async function waitForPaymentProcessing(page: Page, timeout: number = 30000) {
    console.log('Waiting for payment processing to complete...');

    try {
        await Promise.race([
            page.getByRole('button', { name: /Processing/i }).waitFor({ state: 'hidden', timeout }),
            page.waitForSelector('text=Order placed successfully', { timeout }),
            page.waitForSelector('text=Return to Home', { timeout }),
            page.waitForSelector('text=Order Confirmed!', { timeout }),
        ]);
        console.log('✓ Processing completed or confirmation appeared');
    } catch (e) {
        console.log('Wait timed out, checking for confirmation anyway...');
    }
}

/**
 * Verify order confirmation appears
 */
export async function verifyOrderConfirmation(page: Page): Promise<boolean> {
    // Wait a bit for UI to update
    await page.waitForTimeout(2000);

    const successIndicators = [
        page.getByRole('button', { name: /Return to Home/i }),
        page.locator('text=Return to Home'),
        page.locator('text=Order placed successfully!'),
        page.locator('text=Order placed successfully'),
        page.locator('text=Order Confirmed!'),
        page.locator('h2:has-text("Thank you for your order!")'),
        page.locator('text=Thank you for your order!'),
    ];

    for (const indicator of successIndicators) {
        try {
            const count = await indicator.count();
            if (count > 0) {
                const isVisible = await indicator.first().isVisible({ timeout: 2000 }).catch(() => false);
                if (isVisible) {
                    const text = await indicator.first().textContent().catch(() => '');
                    console.log('✓ Found success indicator:', text);
                    return true;
                }
            }
        } catch (e) {
            // Continue checking other indicators
        }
    }

    // Fallback: Check page content for success keywords
    try {
        const bodyText = await page.textContent('body');
        if (bodyText) {
            if (
                bodyText.includes('Order placed successfully') ||
                bodyText.includes('Order Confirmed') ||
                bodyText.includes('Thank you for your order') ||
                bodyText.includes('Return to Home')
            ) {
                console.log('✓ Found success keywords in page content');
                return true;
            }
        }
    } catch (e) {
        // Continue
    }

    return false;
}

/**
 * Update the Stripe payment form with a new card
 * This is useful for retrying payment after a failure
 * Note: Stripe Elements automatically replace values when you fill them, so we don't need to clear first
 */
export async function updateStripePaymentForm(
    page: Page,
    cardNumber: string = TEST_CARDS.SUCCESS,
    expiry: string = '12/34',
    cvc: string = '123',
    zip: string = '12345'
) {
    // Wait a bit for any error state to clear and form to be ready
    await page.waitForTimeout(3000);

    // Get the Stripe iframe
    const stripeFrame = page.frameLocator('iframe').first();

    try {
        console.log('Updating Stripe payment form with new card...');

        // Update card number - clicking and filling should replace the old value
        let cardInput;
        try {
            cardInput = stripeFrame.getByRole('textbox', { name: 'Card number' });
            await cardInput.waitFor({ state: 'attached', timeout: 10000 });
        } catch (e) {
            cardInput = stripeFrame.locator('[placeholder="Card number"]');
            await cardInput.waitFor({ state: 'attached', timeout: 10000 });
        }

        // Click to focus, select all, then fill with new card
        await cardInput.click({ clickCount: 3 }); // Triple click to select all
        await page.waitForTimeout(300);
        await cardInput.fill(cardNumber);
        await page.waitForTimeout(500);
        console.log('✓ Updated card number');

        // Update expiration
        let expiryInput;
        try {
            expiryInput = stripeFrame.getByRole('textbox', { name: 'Expiration date MM / YY' });
            await expiryInput.waitFor({ state: 'attached', timeout: 10000 });
        } catch (e) {
            expiryInput = stripeFrame.locator('[placeholder="MM / YY"]');
            await expiryInput.waitFor({ state: 'attached', timeout: 10000 });
        }
        await expiryInput.click({ clickCount: 3 }); // Triple click to select all
        await page.waitForTimeout(300);
        await expiryInput.fill(expiry);
        await page.waitForTimeout(500);
        console.log('✓ Updated expiration date');

        // Update CVC
        let cvcInput;
        try {
            cvcInput = stripeFrame.getByRole('textbox', { name: 'Security code' });
            await cvcInput.waitFor({ state: 'attached', timeout: 10000 });
        } catch (e) {
            cvcInput = stripeFrame.locator('[placeholder="CVC"]');
            await cvcInput.waitFor({ state: 'attached', timeout: 10000 });
        }
        await cvcInput.click({ clickCount: 3 }); // Triple click to select all
        await page.waitForTimeout(300);
        await cvcInput.fill(cvc);
        await page.waitForTimeout(500);
        console.log('✓ Updated CVC');

        // Update ZIP if present
        try {
            let zipInput = stripeFrame.getByRole('textbox', { name: 'ZIP code' });
            await zipInput.waitFor({ state: 'attached', timeout: 10000 });
            await zipInput.click({ clickCount: 3 }); // Triple click to select all
            await page.waitForTimeout(300);
            await zipInput.fill(zip);
            await page.waitForTimeout(500);
            console.log('✓ Updated ZIP code');
        } catch (e) {
            // Try fallback ZIP selector
            try {
                const zipInput = stripeFrame.locator('[placeholder*="ZIP"], [placeholder*="Postal"]');
                const zipExists = await zipInput.count();
                if (zipExists > 0) {
                    await zipInput.first().waitFor({ state: 'attached', timeout: 10000 });
                    await zipInput.first().click({ clickCount: 3 }); // Triple click to select all
                    await page.waitForTimeout(300);
                    await zipInput.first().fill(zip);
                    await page.waitForTimeout(500);
                    console.log('✓ Updated ZIP code');
                } else {
                    console.log('⚠ ZIP code field not found (may not be required)');
                }
            } catch (e2) {
                console.log('⚠ ZIP code field not found (may not be required)');
            }
        }

        // Wait for Stripe to validate the new card info
        await page.waitForTimeout(2000);
        console.log('✅ Payment form updated successfully');
    } catch (error) {
        console.error('Error updating Stripe form:', error);
        await page.screenshot({ path: 'test-results/stripe-update-error.png', fullPage: true });
        throw error;
    }
}

/**
 * Verify payment error appears
 */
export async function verifyPaymentError(page: Page, expectedErrorText?: string): Promise<boolean> {
    // Wait a bit for error to appear
    await page.waitForTimeout(2000);

    // Look for error indicators
    const errorSelectors = [
        page.locator('[role="alert"]'),
        page.locator('text=/error/i'),
        page.locator('text=/failed/i'),
        page.locator('text=/declined/i'),
        page.locator('text=/card/i'),
        page.locator('.text-red-600, .text-destructive'),
    ];

    for (const selector of errorSelectors) {
        try {
            const count = await selector.count();
            if (count > 0) {
                for (let i = 0; i < Math.min(count, 3); i++) {
                    const text = await selector.nth(i).textContent();
                    if (text && text.toLowerCase().includes('error')) {
                        console.log('✓ Found error indicator:', text);

                        // If expected error text is provided, check if it matches
                        if (expectedErrorText) {
                            if (text.toLowerCase().includes(expectedErrorText.toLowerCase())) {
                                return true;
                            }
                        } else {
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            // Continue
        }
    }

    // Also check if processing button is gone and no success message
    const hasSuccess = await verifyOrderConfirmation(page);
    if (hasSuccess) {
        return false; // Success found, so no error
    }

    // Check if we're still on checkout page (payment failed, didn't navigate away)
    const currentUrl = page.url();
    if (currentUrl.includes('/checkout')) {
        // Check if processing button is gone (payment attempt completed)
        const processingButton = page.getByRole('button', { name: /Processing/i });
        const isProcessing = await processingButton.count() > 0;
        if (!isProcessing) {
            console.log('✓ Payment failed - stayed on checkout page, processing stopped');
            return true;
        }
    }

    return false;
}
