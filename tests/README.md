# End-to-End Tests with Playwright

This directory contains end-to-end tests for the order processing flow.

## Setup

First, install Playwright and its dependencies:

```bash
npm install -D @playwright/test
npx playwright install
```

## Running Tests

```bash
# Run all tests headless (in background)
npm run test:e2e

# Run tests with UI (recommended for debugging)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Run tests in debug mode (step through execution)
npm run test:e2e:debug
```

## Test Prerequisites

Before running the tests, make sure:

1. **Backend is running** with test environment:
   ```bash
   cd ../frese_backend
   npm run test:start
   ```

2. **Frontend is running** (or let Playwright start it automatically):
   ```bash
   npm run dev
   ```

3. **Environment variables are set**:
   - `NEXT_PUBLIC_API_URL` should point to your test backend (default: `http://localhost:3000/api`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` should be set to a test key

4. **Test database is set up**:
   ```bash
   cd ../frese_backend
   npm run test:db:setup
   ```

## Test Coverage

- **Order Processing**: Complete end-to-end flow from menu to order confirmation
  - Adding items to cart
  - Selecting pickup timeslot
  - Filling customer information
  - Processing payment with Stripe test card
  - Verifying order confirmation

## Stripe Test Cards

The test uses Stripe's test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`

Use any future expiry date (e.g., 12/34) and any 3-digit CVC (e.g., 123).

## Troubleshooting

### Tests fail to find Stripe Elements

If Stripe Elements iframes aren't loading:
- Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
- Ensure the backend has created a payment intent successfully
- Check browser console for errors

### Tests timeout waiting for elements

- Increase timeouts in `playwright.config.ts`
- Check that the frontend is actually running on port 8100
- Verify the backend API is responding

### Screenshots

Failed tests automatically save screenshots to `test-results/` directory.

