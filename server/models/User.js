const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    phone:     { type: String },
    bio:       { type: String, default: "" },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    passwordResetToken: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },
    passwordResetRequestedAt: { type: Date, default: null },
    profileImagePath: { type: String, default: "" },

    // Lists for guest and host features
    tripList:       { type: [mongoose.Schema.Types.ObjectId], ref: "Booking", default: [] },
    wishList:       { type: [mongoose.Schema.Types.ObjectId], ref: "Property", default: [] },
    propertyList:   { type: [mongoose.Schema.Types.ObjectId], ref: "Property", default: [] },
    reservationList:{ type: [mongoose.Schema.Types.ObjectId], ref: "Booking", default: [] },
    ownerHostReviews: {
      type: [
        {
          review: { type: mongoose.Schema.Types.ObjectId, ref: "Review", required: true },
          booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
          reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          rating: { type: Number, min: 1, max: 5, required: true },
          comment: { type: String, default: "" },
          anonymous: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    guestReviews: {
      type: [
        {
          review: { type: mongoose.Schema.Types.ObjectId, ref: "Review", required: true },
          booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
          reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          rating: { type: Number, min: 1, max: 5, required: true },
          comment: { type: String, default: "" },
          anonymous: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    // wishList:       [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],

    
    role: { type: String, enum: ["guest", "host"], default: "guest" },
    hasPaid: { type: Boolean, default: false }, // Flag for hosts who have paid
    isActive: { type: Boolean, default: true }, // User account status
    accountDisabledAt: { type: Date, default: null },
    reactivationEligibleAt: { type: Date, default: null },
    reactivationToken: { type: String, default: null },
    reactivationTokenExpiresAt: { type: Date, default: null },
    reactivationTokenRequestedAt: { type: Date, default: null },
    lastReactivatedAt: { type: Date, default: null },
    accountDeletionToken: { type: String, default: null },
    accountDeletionTokenExpiresAt: { type: Date, default: null },
    accountDeletionTokenRequestedAt: { type: Date, default: null },

    // Stripe subscription details
    stripeCustomerId: { type: String, default: "" },
    stripeSubscriptionId: { type: String, default: "" },
    subscriptionStatus: { type: String, default: "" },
    subscriptionCurrentPeriodEnd: { type: Date, default: null },
    
    // Stripe tier & listing limits
    stripeCurrentTier: { type: Number, enum: [0, 1, 2, 3, 4], default: 0 },
    listingLimit: { type: Number, default: 0 },
    
    // Email notification preferences
    emailPreferences: {
      bookingConfirmation: { type: Boolean, default: true },
      bookingCancellation: { type: Boolean, default: true },
      newBookingRequest: { type: Boolean, default: true },
      newMessage: { type: Boolean, default: true },
      welcomeEmail: { type: Boolean, default: true }
      // Note: Password reset and email verification are always sent
    },

    // App + in-app notification preferences (kept separate from email preferences)
    notificationPreferences: {
      inAppEnabled: { type: Boolean, default: true },
      pushEnabled: { type: Boolean, default: true },
      bookingConfirmation: { type: Boolean, default: true },
      bookingCancellation: { type: Boolean, default: true },
      newBookingRequest: { type: Boolean, default: true },
      newMessage: { type: Boolean, default: true },
      marketingUpdates: { type: Boolean, default: true }
    },

    // App push tokens bound to user devices
    pushTokens: {
      type: [
        {
          token: { type: String, required: true },
          platform: { type: String, enum: ["ios", "android", "web"], required: true },
          provider: { type: String, enum: ["fcm", "apns", "expo", "unknown"], default: "unknown" },
          deviceId: { type: String, default: "" },
          appVersion: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now },
          lastSeenAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
