"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, MapPin, Clock, Quote, Loader2 } from "lucide-react"
import NewsCarousel from "@/components/NewsCarousel"
import { fetchProducts, fetchProductTypes } from "@/lib/api"
import { filterProductsForOrderSite } from "@/lib/catalogFilter"
import { getOrderSiteMode } from "@/lib/siteConfig"
import { Product } from "@/types/products"

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        const types = await fetchProductTypes()
        const data = await fetchProducts()
        const siteMode = getOrderSiteMode()
        const regularProducts = filterProductsForOrderSite(data, types, siteMode)

        // Try to get products with photos first, fallback to products without photos
        let featuredProducts = regularProducts.filter((p: Product) => p.photoUrl).slice(0, 4)
        if (featuredProducts.length === 0) {
          featuredProducts = regularProducts.slice(0, 4)
        }

        console.log('Total products fetched:', data.length)
        console.log('Regular products (after type filtering):', regularProducts.length)
        console.log('Featured products:', featuredProducts.length, featuredProducts)
        setProducts(featuredProducts)
      } catch (error) {
        console.error("Failed to load products:", error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const formatPrice = (product: Product) => {
    if (product.product_sizes && product.product_sizes.length > 0) {
      const minPrice = Math.min(...product.product_sizes.map((s) => s.cost))
      return `From $${minPrice.toFixed(2)}`
    }
    return `$${product.price.toFixed(2)}`
  }
  return (
    <div className="flex flex-col">
      {/* Hero Section - Added background image and improved tagline */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/freses_front.jpg"
            alt="Frese's Bakery"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
              Fresh Baked Goods
              <span className="block text-[#f5991c]">Since 1920</span>
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Four generations of baking tradition. From our ovens to your table — fresh bread, legendary fried chicken,
              and homemade pastries made with recipes passed down since 1920.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="text-lg bg-[#f5991c] hover:bg-[#d9850f] text-white">
                <Link href="/order">Order Now</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg bg-white/10 border-white text-white hover:bg-white hover:text-[#d9850f]"
              >
                <Link href="/catering">Catering</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News & Events Carousel */}
      <NewsCarousel />

      {/* Popular Items - Added real images, descriptions, and prices */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Customer Favorites</h2>
            <p className="text-lg text-muted-foreground">Try our most popular items loved by generations</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#f5991c]" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} href="/order">
                  <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-white cursor-pointer">
                    <div className="aspect-square relative overflow-hidden">
                      <Image
                        src={product.photoUrl || "/freses_front.jpg"}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={product.photoUrl?.includes("storage.googleapis.com")}
                      />
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">{product.title}</h3>
                        <span className="text-[#f5991c] font-medium text-sm">{formatPrice(product)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description || "Delicious bakery item"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Button asChild size="lg" className="bg-[#f5991c] hover:bg-[#d9850f] text-white">
              <Link href="/order">View Full Menu</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">What Our Customers Say</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-[#f5991c] mb-4" />
                  <p className="text-muted-foreground mb-4">
                    "Best fried chicken in the Capital Region, hands down. My family has been coming here for three
                    generations!"
                  </p>
                  <p className="font-semibold">— Maria S., Ravena</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-[#f5991c] mb-4" />
                  <p className="text-muted-foreground mb-4">
                    "Their bread is incredible — you can smell it baking from the parking lot. Nothing else compares."
                  </p>
                  <p className="font-semibold">— John D., Coeymans</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact/Hours - Added store hours and improved layout */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">Visit Us Today</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              {/* Location */}
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#f5991c] flex items-center justify-center mx-auto">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">Location</h3>
                <p className="text-gray-300">
                  11 Clifford Street
                  <br />
                  Ravena, NY 12143
                </p>
                <Button asChild variant="link" className="text-[#f5991c] hover:text-[#fdb84d] p-0">
                  <a
                    href="https://maps.google.com/?q=11+Clifford+Street+Ravena+NY+12143"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get Directions
                  </a>
                </Button>
              </div>

              {/* Hours */}
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#f5991c] flex items-center justify-center mx-auto">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">Hours</h3>
                <div className="text-gray-300 space-y-1">
                  <p>Tue – Fri: 7am – 5pm</p>
                  <p>Saturday: 7am – 3pm</p>
                  <p>Sun – Mon: Closed</p>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#f5991c] flex items-center justify-center mx-auto">
                  <Phone className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">Call Us</h3>
                <p className="text-2xl font-bold text-[#f5991c]">(518) 756-1000</p>
                <Button
                  asChild
                  variant="outline"
                  className="border-[#f5991c] text-[#f5991c] hover:bg-[#f5991c] hover:text-white bg-transparent"
                >
                  <a href="tel:5187561000">Call to Order</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
