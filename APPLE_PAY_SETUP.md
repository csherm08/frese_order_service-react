# Apple Pay Setup - Netlify Domain

## Step 1: Get Your Netlify Domain
1. Go to your Netlify Dashboard: https://app.netlify.com
2. Find your site (likely named "frese-order-service" or similar)
3. Your domain will be something like: `frese-order-service.netlify.app`
4. **Write it down** - you'll need it for Stripe

## Step 2: Add Domain in Stripe
1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to: **Settings** → **Payment Methods** → **Apple Pay**
3. Click **Add domain** or **Manage domains**
4. Enter your Netlify domain (e.g., `frese-order-service.netlify.app`)
5. Click **Download domain association file**
6. Save the file as: `apple-developer-merchantid-domain-association`
   - **DO NOT rename it** - it must be exactly this name

## Step 3: Place File in Project
1. Move the downloaded file to: `public/.well-known/apple-developer-merchantid-domain-association`
2. The full path should be:
   ```
   public/.well-known/apple-developer-merchantid-domain-association
   ```

## Step 4: Commit and Deploy
```bash
git add public/.well-known/apple-developer-merchantid-domain-association
git commit -m "Add Apple Pay domain verification file"
git push
```

Netlify will automatically deploy and serve the file at:
`https://your-netlify-domain/.well-known/apple-developer-merchantid-domain-association`

## Step 5: Verify Domain in Stripe
1. Go back to Stripe Dashboard → Apple Pay settings
2. Click **Verify domain** next to your domain
3. Stripe will check for the file and verify the domain
4. Status should change to "Verified" ✅

## Step 6: Test Apple Pay
1. Deploy your site to Netlify (should auto-deploy on git push)
2. Visit your Netlify URL on an iOS device or Safari browser
3. Go to checkout page
4. You should see the Apple Pay button! 🎉

## Troubleshooting
- **File not found**: Make sure the file is exactly named `apple-developer-merchantid-domain-association` (no extension)
- **Verification fails**: Check that the file is accessible at `https://your-domain/.well-known/apple-developer-merchantid-domain-association`
- **Apple Pay not showing**: Make sure you're testing on iOS device or Safari browser (not Chrome/Firefox on desktop)

