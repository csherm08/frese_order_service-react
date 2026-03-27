"use client"

import { useState, useEffect } from "react"
import { useCart } from '@/contexts/CartContext'
import { useRouter } from 'next/navigation'
import TimeslotSelector from "@/components/TimeslotSelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShoppingBag, ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { createPaymentIntent, processOrderAndPay } from '@/lib/api'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { toast } from 'sonner'
import type { CartItem } from "@/types/products"

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
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

        if (!customerName || !customerEmail || !customerPhone) {
            toast.error('Please fill in all contact information');
            return;
        }

        if (!stripe || !elements || !orderData) {
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

            if (!stripe.createPaymentMethod) {
                throw new Error('Stripe instance is not properly initialized.');
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

            const paymentIntentInfo = {
                amount: Math.round(total * 100),
                currency: 'usd',
                orderId: orderData.id || null,
                email: customerEmail,
                phone: customerPhone,
                name: customerName,
                paymentInfo: {
                    intent: paymentIntentId,
                    payment_method: paymentMethod.id,
                },
            };

            await processOrderAndPay(orderData, paymentIntentInfo);
            onSuccess();
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
                            name: 'never',
                            email: 'never',
                            phone: 'never',
                        }
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
    const { items, total, subtotal, tax, isLoaded } = useCart()
    const router = useRouter()
    const [step, setStep] = useState<'time' | 'payment' | 'confirmation'>('time')
    const [selectedTimeslot, setSelectedTimeslot] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [clientSecret, setClientSecret] = useState<string>('')
    const [paymentIntentId, setPaymentIntentId] = useState<string>('')
    const [customerName, setCustomerName] = useState('')
    const [customerEmail, setCustomerEmail] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [orderConfirmation, setOrderConfirmation] = useState<any>(null)

    // After a successful order we clear the cart; confirm step must still render with empty items.
    const allowEmptyCart = step === "confirmation" && orderConfirmation != null;

    useEffect(() => {
        if (!isLoaded) return;
        if (items.length === 0 && !allowEmptyCart) {
            router.replace("/cart");
        }
    }, [isLoaded, items.length, allowEmptyCart, router]);

    // Show loading while cart is being loaded from localStorage
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (items.length === 0 && !allowEmptyCart) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
                Redirecting to cart…
            </div>
        );
    }

    const handleTimeslotSelect = async (timeslot: any) => {
        setSelectedTimeslot(timeslot)
        setLoading(true)

        try {
            const response = await createPaymentIntent(Math.round(total * 100))
            const clientSecret = response.clientSecret || response.client_secret
            const paymentIntentId = response.id
            if (!clientSecret || !paymentIntentId) {
                throw new Error('Failed to create payment intent')
            }
            setClientSecret(clientSecret)
            setPaymentIntentId(paymentIntentId)
            setStep('payment')
        } catch (error: any) {
            console.error('Failed to create payment intent:', error)
            toast.error(error.message || 'Failed to initialize payment')
        } finally {
            setLoading(false)
        }
    }

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
        })
        setStep('confirmation')
    }

    const orderData = selectedTimeslot && customerName && customerEmail && customerPhone ? {
        email: customerEmail,
        name: customerName,
        phone: customerPhone,
        items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            product_size_id: item.product_size_id,
            selections: item.selections,
            add_ons: item.add_ons,
        })),
        total: total,
        pickupTime: selectedTimeslot?.timestamp,
        notes: '',
        status: 'pending',
    } : null

    // Calculate item total for display
    const getItemTotal = (item: CartItem) => {
        let itemTotal = item.price * item.quantity
        // Add selections costs
        if (item.selections) {
            Object.values(item.selections).forEach((selection: any) => {
                if (selection.cost) {
                    itemTotal += selection.cost * item.quantity
                }
            })
        }
        // Add add-ons costs
        if (item.add_ons) {
            Object.values(item.add_ons).forEach((addOnArray: any) => {
                if (Array.isArray(addOnArray)) {
                    addOnArray.forEach((addOn: any) => {
                        if (addOn.cost) {
                            itemTotal += addOn.cost * item.quantity
                        }
                    })
                }
            })
        }
        return itemTotal
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                {step === 'time' ? (
                    <button onClick={() => router.back()} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </button>
                ) : (
                    <button onClick={() => setStep('time')} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Time Selection
                    </button>
                )}

                <h1 className="text-3xl font-bold mb-8">Checkout</h1>

                {/* Step 1: Timeslot Selection */}
                {step === 'time' && (
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Order Summary */}
                        <Card className="md:col-span-1 h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" />
                                    Order Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div key={`${item.productId}-${item.product_size_id || 'none'}-${JSON.stringify(item.selections)}-${JSON.stringify(item.add_ons)}`} className="flex justify-between">
                                            <span>{item.product_name}</span>
                                            <span>{formatCurrency(getItemTotal(item))}</span>
                                        </div>
                                    ))}
                                    <hr />
                                    <div className="flex justify-between font-bold">
                                        <span>Total</span>
                                        <span className="text-[#f5991c]">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timeslot Selector */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Select Pickup Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TimeslotSelector items={items} onSelect={handleTimeslotSelect} loading={loading} />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 2: Payment */}
                {step === 'payment' && (
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Order Summary */}
                        <Card className="md:col-span-1 h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" />
                                    Order Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div key={`${item.productId}-${item.product_size_id || 'none'}-${JSON.stringify(item.selections)}-${JSON.stringify(item.add_ons)}`} className="flex justify-between text-sm">
                                            <span>{item.product_name}</span>
                                            <span>{formatCurrency(getItemTotal(item))}</span>
                                        </div>
                                    ))}
                                    <hr />
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Subtotal</span>
                                            <span>{formatCurrency(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tax</span>
                                            <span>{formatCurrency(tax)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-base">
                                            <span>Total</span>
                                            <span className="text-[#f5991c]">{formatCurrency(total)}</span>
                                        </div>
                                    </div>
                                    {selectedTimeslot && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center gap-2 text-green-700">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="font-medium text-sm">Pickup Selected</span>
                                            </div>
                                            <p className="text-sm text-green-600 mt-1">{formatDateTime(selectedTimeslot.timestamp)}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Form */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Payment & Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <form className="space-y-4">
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

                                <div className="border-t pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                                    {!stripePublishableKey ? (
                                        <div className="text-center py-8 text-destructive">
                                            <p>Stripe is not configured.</p>
                                        </div>
                                    ) : clientSecret && stripePromise ? (
                                        <Elements
                                            stripe={stripePromise}
                                            options={{
                                                clientSecret,
                                                paymentMethodCreation: 'manual' as any,
                                                appearance: {
                                                    theme: 'flat',
                                                    variables: {
                                                        colorPrimary: '#f5991c'
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
                                    onClick={() => {
                                        setStep('time')
                                        setClientSecret('')
                                        setPaymentIntentId('')
                                    }}
                                    className="w-full"
                                >
                                    Back to Time Selection
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
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
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Thank you for your order!</h2>
                                <p className="text-muted-foreground">Your order has been placed successfully.</p>
                            </div>
                            <div className="border-t pt-4 space-y-3">
                                <div>
                                    <h3 className="font-semibold mb-2">Pickup Details</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDateTime(orderConfirmation.selectedTimeslot.timestamp)}
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
                                    <p className="text-lg font-bold">{formatCurrency(orderConfirmation.total)}</p>
                                </div>
                            </div>
                            <Button className="w-full" size="lg" onClick={() => router.push('/menu')}>
                                Continue Shopping
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}



