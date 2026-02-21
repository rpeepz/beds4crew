const express = require("express");
const User = require("../models/User");
const Property = require("../models/Property");
const verifyToken = require("../middleware/auth");
const router = express.Router();

// Toggle user role between guest and host
router.put("/toggle-role", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Prevent manual role changes if user has an active subscription
    if (user.stripeSubscriptionId && ["active", "trialing"].includes(user.subscriptionStatus)) {
      return res.status(400).json({ 
        message: "Cannot manually change role while subscription is active. Please manage your subscription through billing.",
        hasActiveSubscription: true
      });
    }
    
    // Toggle between guest and host
    user.role = user.role === "guest" ? "host" : "guest";
    await user.save();
    
    // Update localStorage user data
    const updatedUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImagePath: user.profileImagePath,
      hasPaid: user.hasPaid
    };
    
    res.json({ message: `Role changed to ${user.role}`, user: updatedUser });
  } catch (error) {
    console.error("[User] Toggle role error:", error.message);
    res.status(500).json({ 
      message: "Failed to toggle role",
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Toggle hasPaid status (Development only - for testing)
router.put("/toggle-payment", verifyToken, async (req, res) => {
  try {
    // Restrict to development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        message: "This endpoint is disabled in production. Use subscription management instead." 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Toggle hasPaid
    user.hasPaid = !user.hasPaid;
    await user.save();
    
    // Update localStorage user data
    const updatedUser = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImagePath: user.profileImagePath,
      hasPaid: user.hasPaid
    };
    
    res.json({ message: `Payment status: ${user.hasPaid ? "Paid" : "Not Paid"}`, user: updatedUser });
  } catch (error) {
    console.error("[User] Toggle payment error:", error.message);
    res.status(500).json({ 
      message: "Failed to toggle payment status",
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Toggle wishlist property
router.post("/wishlist/:propertyId", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  const { propertyId } = req.params;

  const idx = user.wishList.indexOf(propertyId);
  if (idx === -1) user.wishList.push(propertyId);
  else user.wishList.splice(idx, 1);

  await user.save();
  res.json(user.wishList);
});

// Get wishlist
router.get("/wishlist", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id).populate("wishList");
  res.json(user.wishList);
});

// Get subscription status
router.get("/subscription-status", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      hasActiveSubscription: user.stripeSubscriptionId && ["active", "trialing"].includes(user.subscriptionStatus),
      subscriptionStatus: user.subscriptionStatus || null,
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
      stripeSubscriptionId: user.stripeSubscriptionId || null,
      role: user.role,
      hasPaid: user.hasPaid
    });
  } catch (error) {
    console.error("[User] Get subscription status error:", error.message);
    res.status(500).json({ 
      message: "Failed to get subscription status",
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

module.exports = router;
