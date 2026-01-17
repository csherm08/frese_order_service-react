import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import NewsCarousel from '@/components/NewsCarousel';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-orange-50 to-white py-20">
        <div className="container px-4">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Fresh Baked Goods
              <span className="block text-orange-600">Since 1920</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Family-owned bakery serving the Capital Region with fresh bread, pastries, fried chicken, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="text-lg">
                <Link href="/order">Order Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg">
                <Link href="/catering">Catering</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News & Events Carousel */}
      <NewsCarousel />

      {/* Popular Items */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Customer Favorites</h2>
            <p className="text-lg text-muted-foreground">Try our most popular items</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Fresh Bread', image: '/placeholder-bread.jpg' },
              { name: 'Fried Chicken', image: '/placeholder-chicken.jpg' },
              { name: 'Pastries', image: '/placeholder-pastries.jpg' },
              { name: 'Cakes', image: '/placeholder-cakes.jpg' },
            ].map((item) => (
              <Card key={item.name} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-200" />
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button asChild size="lg">
              <Link href="/order">Start Ordering</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact/Hours */}
      <section className="py-16 bg-white">
        <div className="container px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Phone className="h-12 w-12 text-orange-600 mx-auto" />
            <h2 className="text-3xl font-bold">Visit Us Today</h2>
            <div className="space-y-2 text-muted-foreground">
              <p className="text-lg">11 Clifford Street, Ravena, NY 12143</p>
              <p className="text-lg font-semibold text-foreground">(518) 756-1000</p>
            </div>
            <Button asChild variant="outline" size="lg">
              <a href="tel:5187561000">Call to Order</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
