import type { Page } from '@playwright/test';

/**
 * Extra pause between major steps so headed runs are easy to follow.
 * `PLAYWRIGHT_STEP_PAUSE_MS=0` disables. Default: 350ms locally, 0 on CI/GitHub Actions.
 */
export async function stepPause(page: Page): Promise<void> {
    const raw = process.env.PLAYWRIGHT_STEP_PAUSE_MS?.trim();
    if (raw === '0') return;
    if (raw && /^\d+$/.test(raw)) {
        await page.waitForTimeout(parseInt(raw, 10));
        return;
    }
    if (process.env.CI || process.env.GITHUB_ACTIONS) return;
    await page.waitForTimeout(350);
}
