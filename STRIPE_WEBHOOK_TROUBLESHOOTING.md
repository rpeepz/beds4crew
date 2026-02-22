# Stripe Webhook Troubleshooting Guide

## Problem: Database Not Syncing with Stripe

If you've paid on Stripe but your database isn't reflecting the subscription status, here's how to diagnose and fix it.

## Quick Fix: Manual Sync

1. Log into your test account
2. Go to Profile page → Host Status tab
3. Click **"Sync Subscription"** button
4. This will fetch your subscription directly from Stripe and update the database

## Common Issues & Solutions

### 1. Webhooks Not Being Received

**Symptoms:**
- Payment successful in Stripe
- Database not updated
- No webhook logs in server console

**Causes:**
- Webhook endpoint not configured in Stripe dashboard
- Webhook secret mismatch
- Local development not exposed to internet

**Solutions:**

#### A. Check Webhook Configuration in Stripe

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Check if endpoint is configured: `https://your-domain.com/api/billing/webhook`
3. Verify these events are selected:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

#### B. Verify Webhook Secret

1. In Stripe Dashboard → Webhooks → Click your endpoint
2. Click "Reveal" next to "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```
5. Restart your server

#### C. Local Development (Using Stripe CLI)

For local testing, webhooks won't work unless you use Stripe CLI:

```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3001/api/billing/webhook

# Copy the webhook signing secret shown and add to .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

The CLI will show webhook events in real-time.

### 2. Wrong Webhook Secret

**Symptoms:**
- Server logs show: "Webhook Error: No signatures found matching the expected signature"

**Solution:**
1. Get the correct secret from Stripe Dashboard
2. Update `.env` file
3. Restart server
4. Test with a new subscription

### 3. Webhook Endpoint Not Reachable

**Symptoms:**
- Stripe dashboard shows failed webhook deliveries
- 404 or 500 errors in Stripe webhook logs

**Solution:**
- Verify endpoint is correct: `/api/billing/webhook`
- Check server is running
- For production, verify domain SSL certificate is valid

### 4. Missing Environment Variables

**Symptoms:**
- Error: "STRIPE_WEBHOOK_SECRET is not configured"
- Error: "STRIPE_SECRET_KEY is not configured"

**Solution:**
Add to `server/.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PRICE_ID=price_your_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Checking Webhook Logs

### Server Console

With the new logging, you should see:
```
📥 Stripe webhook received: checkout.session.completed
💳 Processing subscription: sub_xxxxx for user: 507f1f77bcf86cd799439011
✅ Updating user 507f1f77bcf86cd799439011 with subscription data
✅ Webhook checkout.session.completed processed successfully
```

If you see errors, they'll be logged with ❌.

### Stripe Dashboard

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click on your endpoint
3. View "Webhook attempts" - this shows all events sent
4. Click on any event to see:
   - Request body (what Stripe sent)
   - Response (what your server returned)
   - Any errors

## Testing the Full Flow

### Test Subscription Creation

1. **Start server with logs visible**
2. **Create test subscription:**
   - Log in to your app
   - Click "Start subscription"
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date, any CVC
3. **Watch server logs for:**
   ```
   📥 Stripe webhook received: checkout.session.completed
   💳 Processing subscription: sub_xxxxx
   ✅ Updating user xxxxx with subscription data
   ```
4. **Verify in database:**
   - User role should be "host"
   - `stripeSubscriptionId` should be set
   - `subscriptionStatus` should be "active"
   - `subscriptionCurrentPeriodEnd` should be set

### Test Manual Sync

1. Click "Sync Subscription" button in Profile
2. Watch for success message
3. Page should update with correct subscription status

## Manual Database Check

If you want to verify the data directly:

```javascript
// In MongoDB shell or Compass
db.users.findOne({ email: "test@example.com" }, {
  email: 1,
  role: 1,
  stripeCustomerId: 1,
  stripeSubscriptionId: 1,
  subscriptionStatus: 1,
  subscriptionCurrentPeriodEnd: 1,
  hasPaid: 1
})
```

## Expected Values After Successful Subscription

```javascript
{
  email: "test@example.com",
  role: "host",                           // ✅ Should be "host"
  stripeCustomerId: "cus_xxxxx",         // ✅ Should be set
  stripeSubscriptionId: "sub_xxxxx",     // ✅ Should be set
  subscriptionStatus: "active",          // ✅ Should be "active"
  subscriptionCurrentPeriodEnd: ISODate("2026-03-21T..."), // ✅ Should be ~1 month ahead
  hasPaid: true                          // ✅ Should be true
}
```

## Production Deployment Checklist

- [ ] Webhook endpoint added in Stripe Dashboard (production mode)
- [ ] Production webhook secret added to environment variables
- [ ] Production Stripe secret key configured
- [ ] Server endpoint is HTTPS (required by Stripe)
- [ ] Webhook events tested with real payment
- [ ] Server logs monitored for webhook errors

## Stripe CLI Commands (for Development)

```bash
# Listen for webhooks
stripe listen --forward-to http://localhost:3001/api/billing/webhook

# Trigger test webhook
stripe trigger checkout.session.completed

# View webhook logs
stripe logs tail

# Test specific events
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## API Endpoints for Testing

### Check Current User Data
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/auth/me
```

### Get Subscription Status
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/user/subscription-status
```

### Manual Sync
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/billing/sync-subscription
```

## Still Not Working?

1. **Check server logs** - Look for ❌ error messages
2. **Check Stripe Dashboard** - View webhook delivery attempts
3. **Use manual sync** - Click "Sync Subscription" button
4. **Verify environment variables** - All three Stripe variables must be set
5. **Restart server** - After any .env changes
6. **Use Stripe CLI** - For local development testing

## Support

If webhooks still aren't working:
1. Share server logs (look for webhook-related messages)
2. Share Stripe webhook delivery logs from dashboard
3. Verify all environment variables are set correctly
4. Try the manual sync button as a workaround
