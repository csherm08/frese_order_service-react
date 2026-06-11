import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        // Unit tests only — Playwright e2e specs live in tests/*.spec.ts and are
        // run separately via `npm run test:e2e`.
        include: ['tests/unit/**/*.test.ts'],
        environment: 'node',
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, '.') },
    },
})
