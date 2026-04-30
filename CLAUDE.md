# frese_order_service-react — Claude / contributor notes

Next.js 15 (App Router) storefront for Frese's Bakery. Replaces the old Angular/Ionic `frese_order_service` repo.

Two sibling Netlify sites build from this same repo, differentiated by env vars:
- **Main bakery** — `freses-bakery.netlify.app` (or whatever the main domain is)
- **Plug Power** — small second storefront for the Plug Power location

Both fetch products/specials/timeslots from the shared `frese_backend` Cloud Run API.

## Deploy workflow (the only sanctioned path)

1. Branch off `main` for whatever you're shipping (or use `release/plug-power-deploy` as the staging branch, which is the convention today).
2. Push the branch.
3. Open a PR to `main`.
4. **Merge to `main` is the deploy.** Netlify auto-builds both sites from `main` and rolls them out.
5. Don't push directly to `main`. Don't deploy via the Netlify CLI / UI. PR-then-merge keeps both sites in lockstep.

Per-site env vars live in **each Netlify site's UI**, not in `netlify.toml` (which has staging defaults). Confirm before launch:

| Var | Main | Plug Power |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | prod backend Cloud Run URL | same |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` | same |
| `NEXT_PUBLIC_ORDER_SITE` | `main` (or unset) | `plugpower` |
| `NEXT_PUBLIC_SITE_TITLE` | "Frese's Bakery" | something Plug-Power-specific |

`scripts/netlify-build.cjs` can also infer storefront mode from the Netlify site name (anything containing `plugpower` / `plug-power` / `plug_power` → Plug Power), so env-var override is optional but explicit is safer.

## Local dev

- `npm run dev` → http://localhost:8100 (custom port; matches old Ionic `ionic serve` port)
- `.env.local` (gitignored) must point `NEXT_PUBLIC_API_URL` at a backend you control. Defaults in [`netlify.toml`](netlify.toml) point at staging — **staging shares the prod DB**, do not mutate state there during testing.
- For full-stack work, run `frese_backend` locally with `NODE_ENV=test` (skips email/SMS/print) and point the React `.env.local` at `http://localhost:3000/api`. See `frese_backend/CLAUDE.md`.

## Tests (Playwright)

- `npm run test:e2e` — full headless suite (~2 min)
- `npm run test:e2e:headed` — with browser visible
- `npm run test:e2e:ui` — Playwright UI mode (best for debugging)
- `PLAYWRIGHT_SLOWMO=400 npx playwright test --workers=1 --headed` — serial, slowed-down (good for demos / watch-it-go)

Suite layout:
- `tests/cart.spec.ts`, `tests/product-modal.spec.ts`, `tests/mode-lock.spec.ts`, `tests/add-ons.spec.ts`, `tests/checkout-failure.spec.ts`, `tests/timeslots-and-quantities.spec.ts` — **mocked-API** (use `installCatalogAndTimeslotMocks` from `tests/helpers/api-route-mocks.ts`). Fast, no backend writes, run in parallel.
- `tests/order-processing.spec.ts`, `tests/checkout-real-backend.spec.ts`, `tests/specials-cart.spec.ts` — **real backend + Stripe test charges**. Need the local backend running with seed data. The specials-cart suite is `mode: 'serial'` because its `beforeAll`/`afterAll` create+delete test specials in the shared DB.

Useful helpers in `tests/helpers/checkout.ts`:
- `addProductToCart(page)` — simple add of the first product
- `addProductWithOptionsToCart(page, name, {size, selections, addOns})` — clicks through the modal
- `addProductFromSpecialToCart(page, specialId, name, options)` — same but on a special page; auto-handles conflict dialog
- `fillModalDefaults(modal)` — picks first option of every required radio / select; **call this before submitting any product modal whose required fields you don't explicitly set**, otherwise validation toasts will silently keep the modal open
- `fillStripePaymentForm(page, TEST_CARDS.SUCCESS)`, `fillCustomerInfo`, `submitPayment`, `verifyOrderConfirmation`

### Common test setup pitfalls

- **Sold-out products break tests that click the first Add-to-Cart button.** Reset with `mysql -h 127.0.0.1 -u root frese_test -e "UPDATE products SET quantity=-1 WHERE quantity=0;"`.
- **Backend `POST /api/specials` is slow** (~10–20 s — auto-generates 4 timeslots/hour for the date range). The default `setupTestSpecials` uses a 1-day range to keep this under 30s. The `beforeAll` hook calls `test.setTimeout(120_000)` to be safe.
- **`getProductAndAttributes` now preserves caller order** (backend change). Tests that depended on undefined ordering may need updating.

## Architecture quick-ref

- App Router under `app/`. Each folder is a route.
- Cart state in [`contexts/CartContext.tsx`](contexts/CartContext.tsx), persisted to `localStorage`. Tracks a `cartMode` of `{type:'regular'}` or `{type:'special', specialId, specialName}` — the cart is locked to one mode at a time.
- Product modal in [`components/ProductModal.tsx`](components/ProductModal.tsx). **Important convention:** `cartItem.price` is the BASE unit price only (size cost is a delta added in here). The cart's `getItemCost` adds selections + add-on costs on top. Don't change this without also updating the cart line / checkout summary code, or you'll re-introduce the double-counting bug fixed in 2026-04.
- Mode-lock UI on `/menu` and `/order` disables the wrong-mode entry points so the conflict toast can't even fire (it's still wired up as a fallback).

## Recently fixed bugs to keep in mind

- **ProductModal double-counted add-ons.** `cartItem.price` used to include selections + add-ons baked in, AND cart computed them again from `add_ons`. Customers would have been overcharged. Fix: `price` is base only.
- **Size cost interpreted as absolute price instead of delta.** A "Small" pizza with `cost=0` was rendering as $0 total. Fix: `basePrice += size.cost` (and size buttons display `product.price + size.cost`).
- **Cart-mode lock didn't exist on `/menu`.** Adding a regular item while in special-mode threw a confusing toast. Fix: banner + disabled Add buttons on `/menu` (and disabled cards on `/order`).
- **Order notes were missing entirely.** Old Angular app had them; new React didn't. Fix: textarea on the payment step, persists end-to-end through `processOrderAndPay`.

## Don't

- Don't point local dev or staging at the prod DB and mutate it. Staging Cloud Run currently shares prod DB; treat it as read-only for testing.
- Don't bypass the PR → main flow for deploys.
- Don't change cart price math without re-running the `add-ons.spec.ts` and `product-modal.spec.ts` tests — the math is genuinely tricky and a regression here means real money.
- Don't bake env-specific URLs/keys into committed code; use Netlify per-site env or `.env.local`.
