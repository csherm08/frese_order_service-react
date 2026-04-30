import { defineConfig, devices } from '@playwright/test';

const slowMoMs = (() => {
    const raw = process.env.PLAYWRIGHT_SLOWMO?.trim();
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
})();

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * - No UI by default (headless). Run `npm run test:e2e:headed` or `npm run test:e2e:ui` to watch.
 * - Optional: `PLAYWRIGHT_SLOWMO=250 npm run test:e2e:headed` to slow each step (ms).
 */
export default defineConfig({
    testDir: './tests',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8100',
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        ...(slowMoMs > 0 ? { launchOptions: { slowMo: slowMoMs } } : {}),
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },

        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },

        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:8100',
        // Prefer reusing an already-running dev server (port 8100). Set PLAYWRIGHT_NO_REUSE_SERVER=1 to always start fresh.
        reuseExistingServer: process.env.PLAYWRIGHT_NO_REUSE_SERVER !== '1',
        timeout: 120 * 1000,
    },
});

