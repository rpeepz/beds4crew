# Subscription Management Guide

## Overview

The subscription system automatically manages user roles and tracks subscription status through Stripe webhooks. When a user subscribes successfully, they are automatically upgraded to a "host" role.

## Key Features

### ✅ Automatic Role Management
- **Active/Trialing Subscription** → User role is set to "host"
- **Canceled/Failed Subscription** → User role reverts to "guest"
- Manual role changes are **blocked** when subscription is active

### ✅ Duplicate Prevention
- Users cannot create a new subscription if they already have an active one
- Returns helpful error message with `hasActiveSubscription: true`

### ✅ Tracked Fields

The following fields are automatically updated in the User model:

```javascript
{
  stripeCustomerId: "cus_xxxxx",              // Stripe customer ID
  stripeSubscriptionId: "sub_xxxxx",          // Stripe subscription ID
  subscriptionStatus: "active",               // Current status
  subscriptionCurrentPeriodEnd: Date,         // When current period ends
  hasPaid: true,                              // Boolean flag for quick checks
  role: "host"                                // Automatically managed
}
```

### Subscription Status Values
- `active` - Subscription is active and paid
- `trialing` - In trial period (treated as active)
- `canceled` - Subscription canceled (grace period may apply)
- `incomplete` - Payment incomplete
- `incomplete_expired` - Payment incomplete and expired
- `past_due` - Payment failed, awaiting retry
- `unpaid` - Payment failed, no longer retrying

## API Endpoints

### 1. Create Checkout Session
**POST** `/api/billing/create-checkout-session`

Starts the subscription checkout process.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Error (if already subscribed):**
```json
{
  "message": "You already have an active subscription",
  "hasActiveSubscription": true
}
```

### 2. Create Portal Session
**POST** `/api/billing/create-portal-session`

Opens Stripe billing portal for managing subscriptions (cancel, update payment method, etc.).

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### 3. Get Subscription Status
**GET** `/api/user/subscription-status`

Gets current subscription information.

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "hasActiveSubscription": true,
  "subscriptionStatus": "active",
  "subscriptionCurrentPeriodEnd": "2026-03-21T00:00:00.000Z",
  "stripeSubscriptionId": "sub_xxxxx",
  "role": "host",
  "hasPaid": true
}
```

### 4. Toggle Role (Manual)
**PUT** `/api/user/toggle-role`

Manually toggle between guest and host (blocked if subscription is active).

**Headers:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "message": "Role changed to host",
  "user": { ... }
}
```

**Error (if subscription active):**
```json
{
  "message": "Cannot manually change role while subscription is active. Please manage your subscription through billing.",
  "hasActiveSubscription": true
}
```

## Webhook Events

The system handles the following Stripe webhook events:

### checkout.session.completed
- Triggered when subscription checkout completes
- Updates user with subscription details
- Sets role to "host"

### customer.subscription.updated
- Triggered when subscription status changes
- Updates subscription status and role accordingly
- Example: subscription canceled → role reverts to "guest"

### customer.subscription.deleted
- Triggered when subscription is completely removed
- Sets role to "guest" and clears subscription data

### invoice.payment_failed
- Triggered when subscription payment fails
- Sets status to "past_due"
- Reverts role to "guest"
- Sets `hasPaid` to false

## Implementation Flow

### Subscription Purchase Flow

```
1. User clicks "Become a Host" / "Subscribe"
2. Frontend calls POST /api/billing/create-checkout-session
3. If no active subscription exists:
   - Create/retrieve Stripe customer
   - Create checkout session
   - Redirect user to Stripe Checkout
4. User completes payment on Stripe
5. Stripe sends webhook: checkout.session.completed
6. Backend updates user:
   - stripeSubscriptionId = "sub_xxxxx"
   - subscriptionStatus = "active"
   - subscriptionCurrentPeriodEnd = Date
   - role = "host"
   - hasPaid = true
7. User is redirected to /profile?checkout=success
8. Frontend can now show host features
```

### Subscription Cancellation Flow

```
1. User clicks "Manage Subscription"
2. Frontend calls POST /api/billing/create-portal-session
3. User is redirected to Stripe billing portal
4. User cancels subscription
5. Stripe sends webhook: customer.subscription.updated
6. Backend updates user:
   - subscriptionStatus = "canceled"
   - role = "guest"
   - hasPaid = false
7. User loses access to host features at period end
```

## Frontend Integration

### Check Subscription Status

```javascript
// When component mounts or user data updates
const checkSubscriptionStatus = async () => {
  try {
    const response = await fetch('/api/user/subscription-status', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    
    if (data.hasActiveSubscription) {
      // Show host features
      console.log('User is a host until:', data.subscriptionCurrentPeriodEnd);
    }
  } catch (error) {
    console.error('Failed to check subscription:', error);
  }
};
```

### Start Subscription

```javascript
const startSubscription = async () => {
  try {
    const response = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.hasActiveSubscription) {
      alert('You already have an active subscription!');
      return;
    }
    
    // Redirect to Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error('Failed to start subscription:', error);
  }
};
```

### Manage Subscription

```javascript
const manageSubscription = async () => {
  try {
    const response = await fetch('/api/billing/create-portal-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    // Redirect to Stripe billing portal
    window.location.href = data.url;
  } catch (error) {
    console.error('Failed to open billing portal:', error);
  }
};
```

## Environment Variables Required

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Client URL for redirects
CLIENT_URL=http://localhost:5173
```

## Testing

### Test Subscription Flow

1. Start the development server
2. Create a test user account
3. Click subscribe/become host button
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify user role changed to "host"
7. Check subscription status endpoint

### Test Cancellation

1. Have an active subscription
2. Click "Manage Subscription"
3. Cancel subscription in Stripe portal
4. Verify webhook updates user role to "guest"

### Test Duplicate Prevention

1. Have an active subscription
2. Try to create another checkout session
3. Should receive error about existing subscription

## Security Notes

- All subscription endpoints require authentication via JWT
- Webhook signatures are verified using STRIPE_WEBHOOK_SECRET
- User cannot manually change role when subscription is active
- Subscription status is sourced from Stripe webhooks (single source of truth)

## Future Enhancements (Not Yet Implemented)

- Subscription management UI in frontend
- Email notifications for subscription events
- Grace period handling for past_due status
- Multiple subscription tiers
- Proration for plan changes
