# Apple Pay Domain Verification

This directory will contain the Apple Pay domain verification file.

**Steps:**
1. Go to Stripe Dashboard → Settings → Payment Methods → Apple Pay
2. Add your domain (e.g., `frese-order-service.netlify.app` or `order.fresesbakery.com`)
3. Download the `apple-developer-merchantid-domain-association` file
4. Place it in this directory: `public/.well-known/apple-developer-merchantid-domain-association`
5. Deploy to Netlify
6. Verify the domain in Stripe Dashboard

The file will be accessible at: `https://your-domain/.well-known/apple-developer-merchantid-domain-association`

