const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    phone:     { type: String },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    profileImagePath: { type: String, default: "" },

    // Lists for guest and host features
    tripList:       { type: [mongoose.Schema.Types.ObjectId], ref: "Booking", default: [] },
    wishList:       { type: [mongoose.Schema.Types.ObjectId], ref: "Property", default: [] },
    propertyList:   { type: [mongoose.Schema.Types.ObjectId], ref: "Property", default: [] },
    reservationList:{ type: [mongoose.Schema.Types.ObjectId], ref: "Booking", default: [] },
    // wishList:       [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],

    
    role: { type: String, enum: ["guest", "host"], default: "guest" },
    hasPaid: { type: Boolean, default: false }, // Flag for hosts who have paid
    
    // Email notification preferences
    emailPreferences: {
      bookingConfirmation: { type: Boolean, default: true },
      bookingCancellation: { type: Boolean, default: true },
      newBookingRequest: { type: Boolean, default: true },
      newMessage: { type: Boolean, default: true },
      welcomeEmail: { type: Boolean, default: true }
      // Note: Password reset and email verification are always sent
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
