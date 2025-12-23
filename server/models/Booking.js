const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    property:   { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    guest:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    host:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate:  { type: Date, required: true },
    endDate:    { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    status:     { type: String, enum: ["pending", "confirmed", "cancelled", "rejected"], default: "pending" },
    // Track which specific bed(s) are booked
    bookedBeds: [{
      roomIndex: { type: Number, required: true },
      bedIndex: { type: Number, required: true },
      bedLabel: { type: String, required: true }
    }],
    // Messages between guest and host
    messages: [{
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      read: { type: Boolean, default: false }
    }],
    // Track who has unread messages
    unreadByGuest: { type: Boolean, default: false },
    unreadByHost: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
