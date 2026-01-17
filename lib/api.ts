const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://frese-bakery-backend-app-504689514656.us-east1.run.app/api";

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
    const response = await fetch(`${API_URL}/activeSpecials?activeOnly=true`);

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
    const response = await fetch(`${API_URL}/orders/availableTimes/${daysOut}`);

    if (!response.ok) {
        throw new Error('Failed to fetch regular timeslots');
    }

    return response.json();
}

export async function getSpecialTimeslots(specialId: number) {
    const response = await fetch(`${API_URL}/orders/availableSpecialTimes/${specialId}`);

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

