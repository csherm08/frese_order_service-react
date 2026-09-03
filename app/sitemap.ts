import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fresesbakery.com"

export default function sitemap(): MetadataRoute.Sitemap {
    // The indexable pages. Specials are ephemeral; product pages don't have
    // their own URLs (modal-based), so the menu/order pages carry that weight.
    return [
        { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
        { url: `${SITE_URL}/order`, changeFrequency: "daily", priority: 0.9 },
        { url: `${SITE_URL}/menu`, changeFrequency: "weekly", priority: 0.8 },
        { url: `${SITE_URL}/specials`, changeFrequency: "daily", priority: 0.7 },
        { url: `${SITE_URL}/catering`, changeFrequency: "monthly", priority: 0.8 },
    ]
}
