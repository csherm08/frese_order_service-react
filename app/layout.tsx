import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import StartupLogger from "@/components/StartupLogger";
import LegacyHashRedirect from "@/components/LegacyHashRedirect";

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

// Site-aware SEO. The two Netlify sites build separately, so build-time env
// decides which variant is baked in. The Plug Power storefront is an internal
// café site — it should not compete with (or dilute) the bakery's search
// presence, so it gets noindex.
const isMainSite = (process.env.NEXT_PUBLIC_ORDER_SITE || "main").toLowerCase().trim() !== "plugpower";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fresesbakery.com";

export const metadata: Metadata = isMainSite
  ? {
      metadataBase: new URL(SITE_URL),
      title: "Frese's Bakery | Pizza, Wings & Italian Bakery in Ravena, NY",
      description:
        "Family-owned since 1920. Order pizza, wings, subs, fresh Italian bread and baked goods for pickup in Ravena, NY — serving Coeymans, Selkirk and the Capital Region. Catering available.",
      keywords: [
        "pizza Ravena NY", "pizza near Ravena", "bakery Ravena NY", "wings Ravena",
        "Italian bakery Albany County", "catering Ravena NY", "Frese's Bakery",
      ],
      openGraph: {
        title: "Frese's Bakery | Pizza, Wings & Italian Bakery in Ravena, NY",
        description:
          "Family-owned since 1920. Pizza, wings, subs, fresh Italian bread and baked goods for pickup in Ravena, NY.",
        url: SITE_URL,
        siteName: "Frese's Bakery",
        images: [{ url: "/frese_front_bakery.jpg", width: 1200, height: 800, alt: "Frese's Bakery storefront in Ravena, NY" }],
        locale: "en_US",
        type: "website",
      },
      alternates: { canonical: "/" },
    }
  : {
      title: process.env.NEXT_PUBLIC_SITE_TITLE?.trim() || "Frese's Bakery",
      description: "Order fresh food for pickup.",
      robots: { index: false, follow: false },
    };

// LocalBusiness structured data — how Google connects the site to "pizza in
// Ravena NY" searches. Address/phone must match the Google Business Profile.
const LOCAL_BUSINESS_JSONLD = {
  "@context": "https://schema.org",
  "@type": ["Bakery", "Restaurant"],
  name: "Frese's Bakery",
  alternateName: "Frese's Bakery & Catering",
  servesCuisine: ["Pizza", "Italian", "American"],
  url: SITE_URL,
  telephone: "+15187561000",
  priceRange: "$",
  image: `${SITE_URL}/frese_front_bakery.jpg`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "11 Clifford St",
    addressLocality: "Ravena",
    addressRegion: "NY",
    postalCode: "12143",
    addressCountry: "US",
  },
  hasMenu: `${SITE_URL}/order`,
  sameAs: ["https://www.google.com/maps/place/?q=place_id:ChIJ19YIYHro3YkR5f6TqhwyNSs"],
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
        {isMainSite && (
          <script
            type="application/ld+json"
            // Static, build-time JSON of our own literal above — no user input.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_JSONLD) }}
          />
        )}
        <StartupLogger />
        <LegacyHashRedirect />
        <CartProvider>
          <Header />
          <main className="min-h-svh">
            {children}
          </main>
          <Toaster richColors position="top-center" />
        </CartProvider>
      </body>
    </html>
  );
}
