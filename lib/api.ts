import { getOrderSiteMode } from '@/lib/siteConfig';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://frese-bakery-backend-app-504689514656.us-east1.run.app/api";

export type StripePublicConfig = {
    stripeSecretKeyMode: "test" | "live" | "unset" | "unknown";
    clientShouldUsePublishable: "pk_test" | "pk_live" | null;
};

/** Backend Stripe mode (from server secret key prefix). Pair with client pk_test / pk_live. */
export async function fetchStripePublicConfig(): Promise<StripePublicConfig> {
    const response = await fetch(`${API_URL}/stripe/public-config`);
    if (!response.ok) {
        throw new Error(`Stripe public config failed: ${response.status}`);
    }
    return response.json();
}

export async function fetchProducts() {
    // Match existing frontend - no query params, backend defaults to filtering sold out items
    const response = await fetch(`${API_URL}/activeProductsAndSizesIncludingSpecials`);

    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }

    return response.json();
}

export async function fetchProductTypes() {
    const response = await fetch(`${API_URL}/products/types`);

    if (!response.ok) {
        throw new Error('Failed to fetch product types');
    }

    return response.json();
}

export async function fetchSpecials() {
    // Pass the storefront mode so plug power doesn't see main-bakery
    // specials and vice versa. Backend filters by specials.audience.
    const site = getOrderSiteMode();
    const response = await fetch(`${API_URL}/activeSpecials?activeOnly=true&site=${site}`);

    if (!response.ok) {
        throw new Error('Failed to fetch specials');
    }

    return response.json();
}

export async function createPaymentIntent(amount: number) {
    const response = await fetch(`${API_URL}/stripe/intent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create payment intent' }));
        throw new Error(error.error || 'Failed to create payment intent');
    }

    const paymentIntent = await response.json();
    const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (
        publishable &&
        typeof paymentIntent.livemode === 'boolean'
    ) {
        const usingTestPk =
            publishable.startsWith('pk_test_');
        const intentIsLive = paymentIntent.livemode === true;
        // Must pair: test intent (livemode false) + pk_test, OR live intent + pk_live
        if (usingTestPk === intentIsLive) {
            throw new Error(
                `Stripe mode mismatch: the API created a ${
                    intentIsLive ? 'live' : 'test'
                } PaymentIntent, but NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is ${
                    usingTestPk ? 'test (pk_test_…)' : 'live (pk_live_…)'
                }. For local development use sk_test on the server with pk_test in this app.`
            );
        }
    }
    // Stripe returns client_secret, but we need clientSecret for consistency
    return {
        clientSecret: paymentIntent.client_secret || paymentIntent.clientSecret,
        ...paymentIntent
    };
}

export async function processOrderAndPay(order: any, paymentIntentInfo: any) {
    const response = await fetch(`${API_URL}/processOrderAndPay`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order, paymentIntentInfo }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process order');
    }

    return response.json();
}

export async function getRegularTimeslots(daysOut: number = 6) {
    // Pass storefront mode so plugpower's hours (Mon-Wed 11-13) are used
    // instead of main's (Fri-Sat). Backend filters timeslots by site.
    const site = getOrderSiteMode();
    const response = await fetch(`${API_URL}/orders/availableTimes/${daysOut}?site=${site}`);

    if (!response.ok) {
        throw new Error('Failed to fetch regular timeslots');
    }

    return response.json();
}

export async function getSpecialTimeslots(specialId: number) {
    const response = await fetch(
        `${API_URL}/orders/availableSpecialTimes/${specialId}?activeOnly=true`,
    );

    if (!response.ok) {
        throw new Error('Failed to fetch special timeslots');
    }

    return response.json();
}

export async function unsubscribeEmail(email: string) {
    const response = await fetch(`${API_URL}/unsubscribe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        throw new Error('Failed to unsubscribe');
    }

    return response.json();
}

