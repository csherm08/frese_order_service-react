'use client';

import { useEffect } from 'react';
import { fetchStripePublicConfig } from '@/lib/api';

export default function StartupLogger() {
    useEffect(() => {
        void (async () => {
            const nodeEnv = process.env.NODE_ENV || "development";
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://frese-bakery-backend-app-504689514656.us-east1.run.app/api";
            const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "not set";
            const clientStripeEnv = stripeKey.startsWith("pk_live_") ? "PRODUCTION" : stripeKey.startsWith("pk_test_") ? "TEST" : "UNKNOWN";

            console.log("🚀 ========== FRESE ORDER SERVICE STARTUP (CLIENT) ==========");
            console.log(`📍 NODE_ENV: ${nodeEnv}`);
            console.log(`🔗 Backend URL: ${apiUrl}`);
            console.log(`💳 Stripe (client publishable): ${clientStripeEnv} (Key: ${stripeKey === "not set" ? stripeKey : `${stripeKey.substring(0, 12)}...`})`);

            try {
                const cfg = await fetchStripePublicConfig();
                const backendLabel =
                    cfg.stripeSecretKeyMode === "test" ? "TEST" :
                    cfg.stripeSecretKeyMode === "live" ? "PRODUCTION" :
                    cfg.stripeSecretKeyMode.toUpperCase();
                console.log(`🔐 Stripe (API secret / PaymentIntents): ${backendLabel}`);
                const clientIsTest = clientStripeEnv === "TEST";
                const apiIsTest = cfg.stripeSecretKeyMode === "test";
                const clientIsLive = clientStripeEnv === "PRODUCTION";
                const apiIsLive = cfg.stripeSecretKeyMode === "live";
                if (clientIsTest && apiIsTest) {
                    console.log("✓ Client pk_test and API sk_test are aligned.");
                } else if (clientIsLive && apiIsLive) {
                    console.log("✓ Client pk_live and API sk_live are aligned.");
                } else {
                    console.warn(
                        "⚠️ Stripe mode mismatch: use pk_test + sk_test together, or pk_live + sk_live. Check API .env and restart the server."
                    );
                }
            } catch (e) {
                console.warn("Could not load /api/stripe/public-config — is the backend running?", (e as Error).message);
            }

            console.log("=============================================================");
        })();
    }, []);

    return null;
}

