const express = require("express");
const verifyToken = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return require("stripe")(secretKey);
};

const getBaseUrl = (req) => {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;

  const origin = req.headers.origin;
  if (origin) return origin;

  const referer = req.headers.referer;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (error) {
      // ignore
    }
  }

  return `${req.protocol}://${req.get("host")}`;
};

const upsertSubscriptionDetails = async ({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  currentPeriodEnd,
}) => {
  const update = {
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus: status || null,
    subscriptionCurrentPeriodEnd: currentPeriodEnd || null,
    hasPaid: ["active", "trialing"].includes(status),
  };

  await User.findByIdAndUpdate(userId, update, { new: true });
};

router.post("/create-checkout-session", verifyToken, async (req, res) => {
  try {
    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ message: "STRIPE_PRICE_ID is not configured" });
    }

    const stripe = getStripe();
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/profile?checkout=success`,
      cancel_url: `${baseUrl}/profile?checkout=cancel`,
      allow_promotion_codes: true,
      client_reference_id: user._id.toString(),
      subscription_data: {
        metadata: { userId: user._id.toString() },
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error.message);
    return res.status(500).json({ message: "Failed to create checkout session" });
  }
});

router.post("/create-portal-session", verifyToken, async (req, res) => {
  try {
    const stripe = getStripe();
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: "No Stripe customer found" });
    }

    const baseUrl = getBaseUrl(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/profile`,
    });

    return res.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe portal error:", error.message);
    return res.status(500).json({ message: "Failed to create portal session" });
  }
});

const handleWebhook = async (req, res) => {
  let event;
  try {
    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ message: "STRIPE_WEBHOOK_SECRET is not configured" });
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;

        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;
        const userId = session.client_reference_id || session.metadata?.userId;
        const stripeApi = getStripe();
        const subscription = await stripeApi.subscriptions.retrieve(stripeSubscriptionId);

        const currentPeriodEnd = subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        if (userId) {
          await upsertSubscriptionDetails({
            userId,
            stripeCustomerId,
            stripeSubscriptionId,
            status: subscription.status,
            currentPeriodEnd,
          });
        } else if (stripeCustomerId) {
          const user = await User.findOne({ stripeCustomerId });
          if (user) {
            await upsertSubscriptionDetails({
              userId: user._id,
              stripeCustomerId,
              stripeSubscriptionId,
              status: subscription.status,
              currentPeriodEnd,
            });
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;
        const stripeSubscriptionId = subscription.id;
        const currentPeriodEnd = subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        const user = await User.findOne({
          $or: [
            { stripeCustomerId },
            { stripeSubscriptionId },
          ],
        });

        if (user) {
          await upsertSubscriptionDetails({
            userId: user._id,
            stripeCustomerId,
            stripeSubscriptionId,
            status: subscription.status,
            currentPeriodEnd,
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripeCustomerId = invoice.customer;
        const user = await User.findOne({ stripeCustomerId });
        if (user) {
          user.subscriptionStatus = invoice.status || "past_due";
          user.hasPaid = false;
          await user.save();
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

module.exports = { router, handleWebhook };
