"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, CalendarDays, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { createPaymentIntent, fetchCateringDeposit, payCateringDeposit } from "@/lib/api"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { toast } from "sonner"

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

interface DepositJob {
    id: number
    name: string
    eventType?: string
    guestCount?: number
    serviceType?: string
    date?: string
    depositAmount: number // cents
    depositPaid: boolean
    status: string
}

function formatEventDate(d?: string) {
    if (!d) return "a date we'll confirm with you"
    return new Date(d).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
    })
}

function DepositForm({
    token,
    job,
    paymentIntentId,
    onSuccess,
}: {
    token: string
    job: DepositJob
    paymentIntentId: string
    onSuccess: () => void
}) {
    const stripe = useStripe()
    const elements = useElements()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!stripe || !elements) {
            toast.error("Payment system not ready. Please try again.")
            return
        }
        setLoading(true)
        try {
            const { error: submitError } = await elements.submit()
            if (submitError) {
                toast.error(submitError.message || "Payment failed")
                setLoading(false)
                return
            }
            const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
                elements,
                params: { billing_details: { name: job.name } },
            })
            if (pmError || !paymentMethod) {
                toast.error(pmError?.message || "Failed to create payment method")
                setLoading(false)
                return
            }
            await payCateringDeposit(token, { intent: paymentIntentId, payment_method: paymentMethod.id })
            onSuccess()
            toast.success("Deposit paid — your date is booked!")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to process payment")
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement
                options={{ wallets: { applePay: "auto", googlePay: "auto" } }}
            />
            <Button type="submit" disabled={!stripe || loading} className="w-full bg-[#f5991c] hover:bg-[#d9850f] text-white" size="lg">
                {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                    `Pay ${formatCurrency(job.depositAmount / 100)} deposit`
                )}
            </Button>
        </form>
    )
}

export default function CateringDepositPage() {
    const params = useParams()
    const token = String(params?.token || "")

    const [job, setJob] = useState<DepositJob | null>(null)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [succeeded, setSucceeded] = useState(false)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const data: DepositJob = await fetchCateringDeposit(token)
                if (cancelled) return
                setJob(data)
                if (!data.depositPaid) {
                    const intent = await createPaymentIntent(data.depositAmount)
                    if (cancelled) return
                    setClientSecret(intent.clientSecret)
                    setPaymentIntentId(intent.id)
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        if (token) load()
        return () => { cancelled = true }
    }, [token])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-[#f5991c]" />
            </div>
        )
    }

    if (error || !job) {
        return (
            <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <h1 className="text-2xl font-bold">Link not found</h1>
                <p className="text-muted-foreground">{error || "This deposit link is invalid or has expired."}</p>
                <Button asChild variant="outline"><Link href="/catering">Back to catering</Link></Button>
            </div>
        )
    }

    const booked = succeeded || job.depositPaid

    return (
        <div className="container mx-auto px-4 py-12 max-w-lg">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {booked ? "Your date is booked! 🎉" : "Reserve your catering date"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                        <div className="flex items-center gap-2 font-medium">
                            <CalendarDays className="h-5 w-5 text-[#f5991c]" />
                            {formatEventDate(job.date)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {[job.eventType, job.guestCount ? `${job.guestCount} guests` : null, job.serviceType]
                                .filter(Boolean).join(" · ")}
                        </div>
                    </div>

                    {booked ? (
                        <div className="flex flex-col items-center text-center gap-3 py-4">
                            <CheckCircle className="h-12 w-12 text-[#f5991c]" />
                            <p className="text-muted-foreground">
                                Your {formatCurrency(job.depositAmount / 100)} deposit is paid and your date is reserved.
                                We&apos;ll be in touch with the final details. Thank you!
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">
                                A {formatCurrency(job.depositAmount / 100)} deposit reserves your date. It&apos;s applied
                                toward your final catering total.
                            </p>
                            {clientSecret && stripePromise ? (
                                <Elements
                                    stripe={stripePromise}
                                    options={{
                                        clientSecret,
                                        paymentMethodCreation: 'manual' as any,
                                        appearance: { theme: 'flat', variables: { colorPrimary: '#f5991c' } },
                                    } as any}
                                >
                                    <DepositForm
                                        token={token}
                                        job={job}
                                        paymentIntentId={paymentIntentId as string}
                                        onSuccess={() => setSucceeded(true)}
                                    />
                                </Elements>
                            ) : (
                                <p className="text-sm text-destructive">Payment form unavailable. Please try again later.</p>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
