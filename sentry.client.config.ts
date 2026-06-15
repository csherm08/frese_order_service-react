// Sentry browser init. No-ops unless NEXT_PUBLIC_SENTRY_DSN is set (per Netlify
// site env), so this is safe to ship before a DSN exists. Error tracking only —
// no session replay, to keep the client bundle lean.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
    dsn,
    enabled: !!dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_ORDER_SITE === "plugpower" ? "plugpower" : "main",
});
