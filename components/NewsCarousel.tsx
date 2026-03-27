"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

const newsItems = [
    {
        title: "Thursday Dinner Special",
        description: "Join us every Thursday for our famous fried chicken dinner — feeds the whole family!",
        image: "/freses_front.jpg",
        highlight: true,
    },
    {
        title: "Holiday Pre-Orders Open",
        description: "Order your holiday pies, breads, and party platters early to guarantee availability.",
        image: "/freses_front.jpg",
        highlight: false,
    },
    {
        title: "Catering Available",
        description: "Let us cater your next event. From small gatherings to large parties, we've got you covered.",
        image: "/freses_front.jpg",
        highlight: false,
    },
]

export default function NewsCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % newsItems.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length)
    }

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % newsItems.length)
    }

    const currentItem = newsItems[currentIndex]

    return (
        <section className="py-8 bg-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-center gap-4">
                    <Button variant="ghost" size="icon" onClick={goToPrevious} className="text-gray-700 hover:bg-gray-400 shrink-0">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <Card className="bg-white border-none shadow-lg max-w-3xl w-full overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col sm:flex-row items-center">
                                {currentItem.image && (
                                    <div className="relative w-full sm:w-48 h-40 sm:h-32 shrink-0">
                                        <Image
                                            src={currentItem.image || "/placeholder.svg"}
                                            alt={currentItem.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="p-6 text-center sm:text-left flex-1">
                                    <h3 className="text-xl font-bold mb-2 text-gray-900">{currentItem.title}</h3>
                                    <p className="text-gray-600">{currentItem.description}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button variant="ghost" size="icon" onClick={goToNext} className="text-gray-700 hover:bg-gray-200 shrink-0">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex justify-center gap-2 mt-4">
                    {newsItems.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-gray-700" : "bg-gray-400"
                                }`}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
