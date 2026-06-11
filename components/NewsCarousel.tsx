"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { fetchNews, fetchSpecials } from "@/lib/api"
import type { Special } from "@/types/special"

type Slide = {
    key: string
    title: string
    description?: string
    image?: string
    highlight?: boolean
    href?: string // present → clickable (e.g. order this special)
}

export default function NewsCarousel() {
    const [slides, setSlides] = useState<Slide[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        let cancelled = false
        // Active specials are pulled automatically; manual news items are appended.
        Promise.all([
            fetchNews(),
            (fetchSpecials() as Promise<Special[]>).catch(() => [] as Special[]),
        ]).then(([news, specials]) => {
            if (cancelled) return
            const specialSlides: Slide[] = (specials || []).map((s) => ({
                key: `special-${s.id}`,
                title: s.name,
                description: s.description,
                image: s.photoUrl,
                highlight: true,
                href: `/order/special/${s.id}`,
            }))
            const newsSlides: Slide[] = (news || []).map((n) => ({
                key: `news-${n.id}`,
                title: n.title,
                description: n.description,
                image: n.image,
                highlight: n.highlight,
            }))
            setSlides([...specialSlides, ...newsSlides])
        })
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (slides.length <= 1) return
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [slides.length])

    if (slides.length === 0) return null

    const safeIndex = currentIndex % slides.length
    const slide = slides[safeIndex]

    const goToPrevious = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
    const goToNext = () => setCurrentIndex((prev) => (prev + 1) % slides.length)

    const inner = (
        <Card className={`bg-white shadow-lg max-w-3xl w-full overflow-hidden ${slide.highlight ? "border-2 border-[#f5991c]" : "border-none"} ${slide.href ? "cursor-pointer transition-shadow hover:shadow-xl" : ""}`}>
            <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-center">
                    {slide.image && (
                        <div className="relative w-full sm:w-48 h-40 sm:h-32 shrink-0">
                            <Image src={slide.image} alt={slide.title} fill className="object-cover" />
                        </div>
                    )}
                    <div className="p-6 text-center sm:text-left flex-1">
                        <h3 className="text-xl font-bold mb-2 text-gray-900">{slide.title}</h3>
                        {slide.description && <p className="text-gray-600">{slide.description}</p>}
                        {slide.href && (
                            <span className="inline-flex items-center gap-1 mt-3 font-medium text-[#d9850f]">
                                Order now <ArrowRight className="h-4 w-4" />
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <section className="py-8 bg-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-center gap-4">
                    {slides.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={goToPrevious} className="text-gray-700 hover:bg-gray-400 shrink-0">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}

                    {slide.href ? (
                        <Link href={slide.href} className="max-w-3xl w-full">{inner}</Link>
                    ) : (
                        inner
                    )}

                    {slides.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={goToNext} className="text-gray-700 hover:bg-gray-200 shrink-0">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    )}
                </div>

                {slides.length > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        {slides.map((s, index) => (
                            <button
                                key={s.key}
                                onClick={() => setCurrentIndex(index)}
                                aria-label={`Go to slide ${index + 1}`}
                                className={`w-2 h-2 rounded-full transition-colors ${index === safeIndex ? "bg-gray-700" : "bg-gray-400"}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
