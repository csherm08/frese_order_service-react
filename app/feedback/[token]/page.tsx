"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Heart } from "lucide-react"
import { fetchReviewRequest, submitReviewFeedback } from "@/lib/api"
import { toast } from "sonner"

interface ReviewRequestInfo {
    name?: string | null
    rating?: number | null
    hasFeedback: boolean
}

export default function FeedbackPage() {
    const params = useParams<{ token: string }>()
    const token = params.token
    const [info, setInfo] = useState<ReviewRequestInfo | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [comment, setComment] = useState("")
    const [sending, setSending] = useState(false)
    const [done, setDone] = useState(false)

    useEffect(() => {
        if (!token) return
        fetchReviewRequest(token)
            .then((data) => {
                setInfo(data)
                if (data.hasFeedback) setDone(true)
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
    }, [token])

    const submit = async () => {
        const text = comment.trim()
        if (!text) {
            toast.error("Please tell us a little about what happened.")
            return
        }
        setSending(true)
        try {
            await submitReviewFeedback(token, text)
            setDone(true)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send feedback")
            setSending(false)
        }
    }

    const firstName = info?.name ? info.name.split(/\s+/)[0] : null

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-lg mx-auto">
                <Card>
                    {error ? (
                        <CardContent className="py-10 text-center space-y-3">
                            <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
                            <p className="text-gray-700">{error}</p>
                            <Link href="/" className="text-[#f5991c] font-medium">Back to Frese&apos;s Bakery</Link>
                        </CardContent>
                    ) : !info ? (
                        <CardContent className="py-16 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-[#f5991c]" />
                        </CardContent>
                    ) : done ? (
                        <CardContent className="py-10 text-center space-y-3">
                            <Heart className="h-10 w-10 mx-auto text-[#f5991c]" />
                            <h2 className="text-xl font-semibold">Thank you{firstName ? `, ${firstName}` : ""}</h2>
                            <p className="text-gray-600">
                                We read every message, and we&apos;ll use yours to do better. If you&apos;d like to talk
                                it through, call us at <a href="tel:+15187561000" className="text-[#f5991c] font-medium">(518) 756-1000</a>.
                            </p>
                            <Link href="/" className="inline-block text-[#f5991c] font-medium pt-1">Back to Frese&apos;s Bakery</Link>
                        </CardContent>
                    ) : (
                        <>
                            <CardHeader>
                                <CardTitle>We&apos;re sorry we missed the mark{firstName ? `, ${firstName}` : ""}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-gray-600">
                                    Thanks for being honest with us. Tell us what went wrong — your message goes
                                    straight to the bakery so we can make it right.
                                </p>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={5}
                                    placeholder="What happened with your order?"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5991c]"
                                />
                                <Button
                                    onClick={submit}
                                    disabled={sending || !comment.trim()}
                                    className="w-full bg-[#f5991c] hover:bg-[#e08a10] text-white"
                                >
                                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Send feedback
                                </Button>
                                <p className="text-xs text-gray-400 text-center">
                                    Prefer to talk? Call us at (518) 756-1000.
                                </p>
                            </CardContent>
                        </>
                    )}
                </Card>
            </div>
        </div>
    )
}
