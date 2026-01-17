"use client"

import Link from 'next/link';
import { ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export default function Header() {
    const { items } = useCart();
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="text-2xl font-bold text-primary">
                            Frese's Bakery
                        </div>
                    </Link>

                    <nav className="hidden md:flex gap-6 items-center">
                        <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
                            Home
                        </Link>
                        <Link href="/order">
                            <Button size="sm" className="font-medium">
                                Order Now
                            </Button>
                        </Link>
                        <Link href="/catering" className="text-sm font-medium transition-colors hover:text-primary">
                            Catering
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/cart">
                        <Button variant="outline" size="icon" className="relative">
                            <ShoppingCart className="h-5 w-5" />
                            {itemCount > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                                >
                                    {itemCount}
                                </Badge>
                            )}
                        </Button>
                    </Link>

                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}



