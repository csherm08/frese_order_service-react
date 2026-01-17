'use client';

import { useEffect } from 'react';

export default function StartupLogger() {
    useEffect(() => {
        const nodeEnv = process.env.NODE_ENV || "development";
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://frese-bakery-backend-app-504689514656.us-east1.run.app/api";
        const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "not set";
        const stripeEnv = stripeKey.startsWith("pk_live_") ? "PRODUCTION" : stripeKey.startsWith("pk_test_") ? "TEST" : "UNKNOWN";

        console.log("🚀 ========== FRESE ORDER SERVICE STARTUP (CLIENT) ==========");
        console.log(`📍 NODE_ENV: ${nodeEnv}`);
        console.log(`🔗 Backend URL: ${apiUrl}`);
        console.log(`💳 Stripe Environment: ${stripeEnv} (Key: ${stripeKey.substring(0, 12)}...)`);
        console.log("=============================================================");
    }, []);

    return null;
}

