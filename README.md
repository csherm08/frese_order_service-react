# Frese's Bakery - Customer Frontend

Modern customer-facing frontend for Frese's Bakery built with Next.js 15, React 19, and TypeScript.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI + shadcn/ui style
- **State Management**: React Context + TanStack Query
- **Forms**: React Hook Form
- **Payments**: Stripe Elements
- **Notifications**: Sonner
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Features

- 🛒 **Shopping Cart** - Add items, manage quantities, persist across sessions
- 📅 **Time Slot Selection** - Pick pickup time with available slots
- 💳 **Stripe Payments** - Secure payment processing
- 🎨 **Modern UI** - Beautiful, responsive design
- 📱 **Mobile-First** - Optimized for all screen sizes
- ⚡ **Fast** - Server-side rendering with Next.js
- ♿ **Accessible** - Built with Radix UI primitives

## Pages

- `/` - Home/Landing page
- `/menu` - Browse products and add to cart
- `/cart` - Review and manage cart items
- `/checkout` - Customer info, time selection, and payment
- `/order-success` - Order confirmation
- `/specials` - View weekly specials
- `/catering` - Catering information
- `/unsubscribe` - Email unsubscribe

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Update .env.local with your Stripe key
```

### Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_API_URL=https://frese-bakery-backend-app-504689514656.us-east1.run.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

**Plug Power (second location) — same app, different catalog**

Products use the **`Plug Power`** type in the API (`types.name`). The main site build **hides** that type; a second deploy uses the same endpoints but filters to **only** Plug Power:

| Variable | Main bakery | Plug Power staging |
|----------|-------------|--------------------|
| `NEXT_PUBLIC_ORDER_SITE` | unset or `main` | `plugpower` |
| `NEXT_PUBLIC_SITE_TITLE` | optional (default `Frese's Bakery`) | e.g. `Frese's — Plug Power` |

**Netlify — two sites, one repo**  
Add a second Netlify site with the same repo/branch. Shared vars live in `netlify.toml` (`NEXT_PUBLIC_API_URL`, Stripe, etc.); override per site in the UI only if needed.

**Storefront mode** (how the build picks main vs Plug Power):

1. **Automatic:** If `NEXT_PUBLIC_ORDER_SITE` is **not** set in the UI/toml, `scripts/netlify-build.cjs` uses `NETLIFY_SITE_NAME`: names containing `plugpower`, `plug-power`, or `plug_power` → Plug Power + default title; otherwise main bakery + default title.
2. **Manual:** Set `NEXT_PUBLIC_ORDER_SITE` and optional `NEXT_PUBLIC_SITE_TITLE` in **Site configuration → Environment variables** (overrides inference).

Deploy and open `/menu`: Plug Power builds show **only** products of type **Plug Power**.

**Adding Plug Power products**  
The migration does **not** create catalog items—only the type row.

- **Admin:** create or edit a product and set its **type** to **Plug Power** (exact name; it must match `types.name` in the API).
- **Sample data (optional):** from `frese_backend`, against **test** DB: `npm run test:seed:plug-power`. For **production**, run only with Cloud SQL proxy to the prod DB and `NODE_ENV=production` (see `knexfile.js` + `scripts/seed-plug-power-products.js`); delete or replace sample titles in admin afterward.

Backend: run migration `20260327120000_add_plug_power_type` before products can use the type.

### Deploy

Production deploys are triggered by merging pull requests into `main` (Netlify).

### Development

```bash
# Run development server (port 8100)
npm run dev
```

Open [http://localhost:8100](http://localhost:8100)

### Build

```bash
# Build for production
npm run build

# Run production server
npm run start
```

### Deploy

```bash
# Deploy to Netlify
npm run deploy
```

## Project Structure

```
frese_order_service-react/
├── app/                    # Next.js app router pages
│   ├── cart/              # Shopping cart page
│   ├── checkout/          # Checkout flow
│   ├── menu/              # Product listing
│   ├── order-success/     # Order confirmation
│   ├── specials/          # Weekly specials
│   ├── catering/          # Catering info
│   ├── unsubscribe/       # Email unsubscribe
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # UI primitives (button, card, etc.)
│   ├── Header.tsx        # Main navigation
│   ├── ProductModal.tsx  # Product details & add to cart
│   └── TimeslotSelector.tsx # Pickup time selection
├── contexts/             # React contexts
│   └── CartContext.tsx   # Shopping cart state
├── lib/                  # Utilities
│   ├── api.ts           # API client
│   ├── catalogFilter.ts # Main vs Plug Power product filtering
│   ├── siteConfig.ts    # NEXT_PUBLIC_ORDER_SITE / site title
│   └── utils.ts         # Helper functions
├── types/               # TypeScript types
│   ├── products.ts
│   └── special.ts
└── package.json
```

## API Integration

This frontend connects to the Frese Bakery backend API:

### Endpoints Used

- `GET /api/activeProductsAndSizesIncludingSpecials` - Fetch products
- `GET /api/activeSpecials` - Fetch specials
- `POST /api/stripe/intent` - Create payment intent
- `POST /api/processOrderAndPay` - Process order and payment
- `POST /api/orders/timeslots` - Get available pickup times
- `POST /api/unsubscribe` - Unsubscribe from emails

## License

Private - Frese's Bakery
