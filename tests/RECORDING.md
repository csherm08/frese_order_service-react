# Recording Tests with Playwright

Playwright can record your interactions and generate test code automatically!

## How to Record a Test

1. **Make sure your dev server is running:**
   ```bash
   npm run dev
   ```

2. **Start the code generator:**
   ```bash
   npm run test:e2e:record
   ```

   Or to start directly on the checkout page:
   ```bash
   npm run test:e2e:record-checkout
   ```

3. **A browser window will open** - interact with your app normally:
   - Fill in forms
   - Click buttons
   - Navigate pages
   - Playwright watches everything you do!

4. **The code appears in real-time** in the Playwright Inspector panel

5. **Copy the generated code** and paste it into your test file

## Tips for Recording Stripe Forms

1. **Go slowly** - Wait for Stripe Elements to fully load before typing
2. **Click into the payment field first** - This helps Playwright find the right iframe
3. **Type naturally** - Playwright will record the keystrokes
4. **Don't worry about iframes** - Playwright will automatically handle them during recording

## Using the Recorded Code

After recording, you can:
- Copy the generated code into `order-processing.spec.ts`
- Modify selectors if needed
- Add assertions and test logic
- Use it as a reference for manual test writing

This is especially useful for complex interactions like Stripe Elements iframes!

