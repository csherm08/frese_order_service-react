"use client"

import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentIntent, processOrderAndPay } from '@/lib/api';
import { toast } from 'sonner';
import TimeslotSelector from '@/components/TimeslotSelector';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
    console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set!');
}

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function CheckoutForm({
    clientSecret,
    paymentIntentId,
    orderData,
    customerName,
    customerEmail,
    customerPhone,
    total,
    onSuccess
}: {
    clientSecret: string;
    paymentIntentId: string;
    orderData: any;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    total: number;
    onSuccess: () => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const { clearCart } = useCart();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate contact info
        if (!customerName || !customerEmail || !customerPhone) {
            toast.error('Please fill in all contact information');
            return;
        }

        if (!stripe || !elements || !orderData) {
            console.error('Stripe not ready:', { stripe: !!stripe, elements: !!elements, orderData: !!orderData });
            toast.error('Payment system not ready. Please try again.');
            return;
        }

        setLoading(true);

        try {
            const { error: submitError } = await elements.submit();
            if (submitError) {
                toast.error(submitError.message || 'Payment failed');
                setLoading(false);
                return;
            }

            // Create payment method with billing details
            // For both card and wallet payments (Apple Pay, Google Pay), we create the payment method
            // Wallet payments are handled by PaymentElement but we still need to create the payment method
            if (!stripe.createPaymentMethod) {
                throw new Error('Stripe instance is not properly initialized. Please check your Stripe publishable key.');
            }

            const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
                elements,
                params: {
                    billing_details: {
                        name: customerName,
                        email: customerEmail,
                        phone: customerPhone || undefined,
                    },
                },
            });

            if (pmError || !paymentMethod) {
                toast.error(pmError?.message || 'Failed to create payment method');
                setLoading(false);
                return;
            }

            console.log('Payment method created:', {
                id: paymentMethod.id,
                type: paymentMethod.type,
                card: paymentMethod.card,
            });

            // Build paymentIntentInfo matching the existing Angular service format exactly
            const paymentIntentInfo = {
                amount: Math.round(total * 100), // Convert to cents
                currency: 'usd',
                orderId: orderData.id || null, // May be null if order not created yet
                email: customerEmail,
                phone: customerPhone,
                name: customerName,
                paymentInfo: {
                    intent: paymentIntentId,
                    payment_method: paymentMethod.id,
                },
            };

            console.log('Sending paymentIntentInfo:', paymentIntentInfo);

            // Backend handles everything: creates order, confirms payment intent with payment method
            await processOrderAndPay(orderData, paymentIntentInfo);

            // Show confirmation FIRST - this sets step to 'confirmation' which prevents redirect
            onSuccess();

            // Clear cart after confirmation page has rendered (longer delay to ensure step is set)
            setTimeout(() => {
                clearCart();
            }, 500);

            toast.success('Order placed successfully!');
        } catch (error: any) {
            console.error('Payment error:', error);
            toast.error(error.message || 'Failed to process payment');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement
                options={{
                    wallets: {
                        applePay: 'auto',
                        googlePay: 'auto'
                    },
                    fields: {
                        billingDetails: {
                            name: 'never', // We collect this in our form
                            email: 'never', // We collect this in our form
                            phone: 'never', // We collect this in our form
                        }
                    }
                }}
                onReady={(e) => {
                    console.log('PaymentElement ready:', e);
                    // Log available payment methods
                    if (e && 'availablePaymentMethods' in e) {
                        console.log('Available payment methods:', e.availablePaymentMethods);
                    }
                }}
            />

            <Button
                type="submit"
                disabled={!stripe || loading}
                className="w-full"
                size="lg"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    `Pay ${formatCurrency(total)}`
                )}
            </Button>
        </form>
    );
}

export default function CheckoutPage() {
    const { items, total, subtotal, tax, isLoaded } = useCart();
    const router = useRouter();
    const [step, setStep] = useState<'time' | 'payment' | 'confirmation'>('time');
    const [clientSecret, setClientSecret] = useState<string>('');
    const [paymentIntentId, setPaymentIntentId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Customer Info
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Selected Timeslot
    const [selectedTimeslot, setSelectedTimeslot] = useState<any>(null);

    // Order confirmation data
    const [orderConfirmation, setOrderConfirmation] = useState<any>(null);

    // Don't redirect - let users stay on confirmation page even after cart is cleared

    // Show loading while cart is being loaded from localStorage
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Allow confirmation step to render even if cart is empty (cart is cleared after order)
    if (items.length === 0 && step !== 'confirmation') {
        return null;
    }

    // Build order data - only available when we have all required info
    // Match the structure expected by backend createOrderOnline: { email, name, phone, items, pickupTime, notes, status, total }
    const orderData = selectedTimeslot && customerName && customerEmail && customerPhone ? {
        email: customerEmail,
        name: customerName,
        phone: customerPhone,
        items: items.map(item => ({
            productId: item.productId, // Backend expects productId, not product_id
            quantity: item.quantity,
            price: item.price,
            product_size_id: item.product_size_id,
            selections: item.selections,
            add_ons: item.add_ons,
        })),
        total: total, // Backend expects total in dollars, not cents
        pickupTime: selectedTimeslot?.timestamp,
        notes: '',
        status: 'pending', // Will be set by backend, but include for consistency
    } : null;

    const handleTimeslotSelect = async (timeslot: any) => {
        setSelectedTimeslot(timeslot);
        setLoading(true);

        try {
            const response = await createPaymentIntent(Math.round(total * 100));
            console.log('Payment intent response:', response);
            const clientSecret = response.clientSecret || response.client_secret;
            const paymentIntentId = response.id;
            if (!clientSecret) {
                throw new Error('No client secret in response');
            }
            if (!paymentIntentId) {
                throw new Error('No payment intent ID in response');
            }
            setClientSecret(clientSecret);
            setPaymentIntentId(paymentIntentId);
            setStep('payment');
        } catch (error: any) {
            console.error('Failed to create payment intent:', error);
            toast.error(error.message || 'Failed to initialize payment');
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        setOrderConfirmation({
            customerName,
            customerEmail,
            customerPhone,
            selectedTimeslot,
            items,
            subtotal,
            tax,
            total,
        });
        setStep('confirmation');
    };

    const handleCustomerInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Contact info is collected in payment step, this is just validation
        // Payment will proceed after form submission
    };

    return (
        <div className="container px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-4xl font-bold">Checkout</h1>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                    <div className={`flex-1 text-center ${step === 'time' ? 'text-primary font-semibold' : step === 'payment' || step === 'confirmation' ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'time' ? 'bg-primary text-white' : step === 'payment' || step === 'confirmation' ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                            {step === 'confirmation' ? '✓' : '1'}
                        </div>
                        <span className="text-sm">Pickup Time</span>
                    </div>
                    <div className="flex-1 border-t" />
                    <div className={`flex-1 text-center ${step === 'payment' ? 'text-primary font-semibold' : step === 'confirmation' ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'payment' ? 'bg-primary text-white' : step === 'confirmation' ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                            {step === 'confirmation' ? '✓' : '2'}
                        </div>
                        <span className="text-sm">Payment</span>
                    </div>
                    <div className="flex-1 border-t" />
                    <div className={`flex-1 text-center ${step === 'confirmation' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${step === 'confirmation' ? 'bg-primary text-white' : 'bg-gray-200'}`}>
                            3
                        </div>
                        <span className="text-sm">Confirmation</span>
                    </div>
                </div>

                {/* Step 1: Timeslot Selection */}
                {step === 'time' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Pickup Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TimeslotSelector
                                items={items}
                                onSelect={handleTimeslotSelect}
                                loading={loading}
                            />
                            <Button
                                variant="outline"
                                onClick={() => router.push('/cart')}
                                className="w-full mt-4"
                            >
                                Back to Cart
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Payment with Contact Info */}
                {step === 'payment' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment & Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Contact Information Form */}
                            <form onSubmit={handleCustomerInfoSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                        id="name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        required
                                    />
                                </div>
                            </form>

                            {/* Stripe Payment Element */}
                            <div className="border-t pt-6">
                                <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                                {!stripePublishableKey ? (
                                    <div className="text-center py-8 text-destructive">
                                        <p>Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.</p>
                                    </div>
                                ) : clientSecret && stripePromise ? (
                                    <Elements
                                        stripe={stripePromise}
                                        options={{
                                            clientSecret,
                                            // Allow automatic payment method creation for wallet payments (Apple Pay, Google Pay)
                                            // while still supporting manual creation for card payments
                                            paymentMethodCreation: 'manual' as any,
                                            appearance: {
                                                theme: 'flat',
                                                variables: {
                                                    colorPrimary: '#ffb038'
                                                }
                                            }
                                        } as any}
                                    >
                                        <CheckoutForm
                                            clientSecret={clientSecret}
                                            paymentIntentId={paymentIntentId}
                                            orderData={orderData || {}}
                                            customerName={customerName}
                                            customerEmail={customerEmail}
                                            customerPhone={customerPhone}
                                            total={total}
                                            onSuccess={handlePaymentSuccess}
                                        />
                                    </Elements>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                        <p>Loading payment form...</p>
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => setStep('time')}
                                className="w-full"
                            >
                                Back
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Confirmation */}
                {step === 'confirmation' && orderConfirmation && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Confirmed!</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Thank you for your order!</h2>
                                <p className="text-muted-foreground">
                                    Your order has been placed successfully.
                                </p>
                            </div>

                            <div className="border-t pt-4 space-y-3">
                                <div>
                                    <h3 className="font-semibold mb-2">Pickup Details</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {orderConfirmation.selectedTimeslot?.timestamp
                                            ? formatDateTime(orderConfirmation.selectedTimeslot.timestamp)
                                            : 'Time selected'}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Contact Information</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {orderConfirmation.customerName}<br />
                                        {orderConfirmation.customerEmail}<br />
                                        {orderConfirmation.customerPhone}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Order Total</h3>
                                    <p className="text-lg font-bold">
                                        {formatCurrency(orderConfirmation.total)}
                                    </p>
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => router.push('/')}
                            >
                                Return to Home
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Order Summary - Only show if not on confirmation step */}
                {step !== 'confirmation' && items.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                    <span>
                                        {item.quantity}x {item.product_name}
                                    </span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}

                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Order Summary in Confirmation - Show order details from confirmation data */}
                {step === 'confirmation' && orderConfirmation && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {orderConfirmation.items && orderConfirmation.items.map((item: any, index: number) => (
                                <div key={index} className="flex justify-between text-sm">
                                    <span>
                                        {item.quantity}x {item.product_name || 'Item'}
                                    </span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}

                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(orderConfirmation.subtotal || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>{formatCurrency(orderConfirmation.tax || 0)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>{formatCurrency(orderConfirmation.total)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}



