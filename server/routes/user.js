const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { deleteUserCascade } = require("../utils/deleteUser");
const {
  clearAuthCookies,
  generateTokens,
  setAuthCookies,
  generateCsrfToken,
  setCsrfCookie,
  isAppAuthModeRequest,
} = require("../utils/tokenHelpers");
const User = require("../models/User");
const Property = require("../models/Property");
const Review = require("../models/Review");
const RefreshToken = require("../models/RefreshToken");
const emailService = require("../utils/emailService");
const verifyToken = require("../middleware/auth");
const cache = require("../utils/cache");
const router = express.Router();

const REACTIVATION_HOLD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const ACCOUNT_DELETION_TOKEN_TTL_MS = 30 * 60 * 1000;
const ACCOUNT_DELETION_REQUEST_COOLDOWN_MS = 60 * 1000;

const createAccountDeletionToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
};

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

// Get lightweight wishlist summary for list rendering
router.get("/wishlist/summary", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: "wishList",
        select: "title city country category type images pricePerNight rooms rating ownerHost createdAt",
        populate: {
          path: "ownerHost",
          select: "firstName lastName profileImagePath hasPaid",
        },
      })
      .lean();

    return res.json(user?.wishList || []);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch wishlist summary" });
  }
});

// Add to wishlist (canonical)
router.post("/wishlist/:propertyId", verifyToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { wishList: propertyId } });
    cache.delete(`property:${propertyId}`);
    return res.json({ message: "Added to wishlist" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add to wishlist" });
  }
});

// Remove from wishlist (canonical)
router.delete("/wishlist/:propertyId", verifyToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $pull: { wishList: propertyId } });
    cache.delete(`property:${propertyId}`);
    return res.json({ message: "Removed from wishlist" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove from wishlist" });
  }
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

// Public review stats for a user profile (approved/published reviews only)
router.get("/:userId/review-stats", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("firstName lastName ownerHostReviews guestReviews")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const approvedReviews = await Review.find({
      reviewee: req.params.userId,
      status: "approved",
    })
      .populate("reviewer", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    const reviewCount = approvedReviews.length;
    const averageRating = reviewCount > 0
      ? Number((approvedReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviewCount).toFixed(2))
      : null;

    return res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      reviewCount,
      averageRating,
      publishedBreakdown: {
        ownerHostReviews: user.ownerHostReviews?.length || 0,
        guestReviews: user.guestReviews?.length || 0,
      },
      recentApprovedReviews: approvedReviews.slice(0, 10).map((review) => ({
        id: review._id,
        booking: review.booking,
        property: review.property,
        rating: review.rating,
        comment: review.comment,
        anonymous: review.anonymous,
        reviewerName: review.anonymous
          ? "Anonymous"
          : `${review.reviewer?.firstName || ""} ${review.reviewer?.lastName || ""}`.trim() || "User",
        createdAt: review.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch review stats", error: error.message });
  }
});


router.post("/me/request-delete", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required" });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: "Incorrect password" });

    const now = Date.now();
    const lastRequestedAt = user.accountDeletionTokenRequestedAt
      ? new Date(user.accountDeletionTokenRequestedAt).getTime()
      : 0;

    if (lastRequestedAt && now - lastRequestedAt < ACCOUNT_DELETION_REQUEST_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((ACCOUNT_DELETION_REQUEST_COOLDOWN_MS - (now - lastRequestedAt)) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before requesting another deletion email.` });
    }

    const { rawToken, hashedToken } = createAccountDeletionToken();
    user.accountDeletionToken = hashedToken;
    user.accountDeletionTokenExpiresAt = new Date(now + ACCOUNT_DELETION_TOKEN_TTL_MS);
    user.accountDeletionTokenRequestedAt = new Date(now);
    await user.save();

    await emailService.sendAccountDeletionEmail(user.email, user.firstName, rawToken);

    return res.status(200).json({ message: "Deletion confirmation email sent. The link expires in 30 minutes." });
  } catch (error) {
    console.error("[User] Request delete account error:", error.message);
    return res.status(500).json({ message: "Failed to start account deletion" });
  }
});

router.post("/confirm-delete", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ message: "Deletion token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      accountDeletionToken: hashedToken,
      accountDeletionTokenExpiresAt: { $gt: new Date() },
    }).select("_id");

    if (!user) {
      return res.status(400).json({ message: "This deletion link is invalid or has expired." });
    }

    await deleteUserCascade(user._id);
    clearAuthCookies(res);
    return res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("[User] Confirm delete account error:", error.message);
    return res.status(500).json({ message: "Failed to delete account" });
  }
});

router.post("/me/deactivate", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const now = new Date();
    user.isActive = false;
    user.accountDisabledAt = now;
    user.reactivationEligibleAt = new Date(now.getTime() + REACTIVATION_HOLD_WINDOW_MS);
    user.reactivationToken = null;
    user.reactivationTokenExpiresAt = null;
    user.reactivationTokenRequestedAt = null;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user);
    await RefreshToken.deleteMany({ userId: user._id });
    await new RefreshToken({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).save();

    setAuthCookies(res, accessToken, refreshToken);
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    const isAppAuthRequest = isAppAuthModeRequest(req);

    return res.json({
      message: "Account disabled. You can request reactivation after 30 days.",
      csrfToken,
      ...(isAppAuthRequest ? { accessToken, refreshToken } : {}),
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImagePath: user.profileImagePath,
        hasPaid: user.hasPaid,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
        isActive: false,
        accountDisabledAt: user.accountDisabledAt,
        reactivationEligibleAt: user.reactivationEligibleAt,
      },
    });
  } catch (error) {
    console.error("[User] Deactivate account error:", error.message);
    return res.status(500).json({ message: "Failed to deactivate account" });
  }
});
module.exports = router;
