import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import StartupLogger from "@/components/StartupLogger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Log environment on server startup
const nodeEnv = process.env.NODE_ENV || "development";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://frese-bakery-backend-app-504689514656.us-east1.run.app/api";
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "not set";
const stripeEnv = stripeKey.startsWith("pk_live_") ? "PRODUCTION" : stripeKey.startsWith("pk_test_") ? "TEST" : "UNKNOWN";

console.log("🚀 ========== FRESE ORDER SERVICE STARTUP ==========");
console.log(`📍 NODE_ENV: ${nodeEnv}`);
console.log(`🔗 Backend URL: ${apiUrl}`);
console.log(`💳 Stripe Environment: ${stripeEnv} (Key: ${stripeKey.substring(0, 12)}...)`);
console.log("===================================================");

export const metadata: Metadata = {
  title: "Frese's Bakery - Fresh Baked Goods Daily",
  description: "Order fresh baked goods, fried chicken, and more from Frese's Bakery in Ravena, NY",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StartupLogger />
        <CartProvider>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster richColors position="top-center" />
        </CartProvider>
      </body>
    </html>
  );
}
