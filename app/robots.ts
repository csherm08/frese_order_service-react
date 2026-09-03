import type { MetadataRoute } from "next"

const isMainSite = (process.env.NEXT_PUBLIC_ORDER_SITE || "main").toLowerCase().trim() !== "plugpower"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fresesbakery.com"

export default function robots(): MetadataRoute.Robots {
    // Plug Power is an internal café storefront — keep it out of search entirely.
    if (!isMainSite) {
        return { rules: { userAgent: "*", disallow: "/" } }
    }
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // No value in indexing transactional/tokenized pages.
            disallow: ["/checkout", "/cart", "/feedback/", "/catering/pay-deposit/", "/unsubscribe"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
