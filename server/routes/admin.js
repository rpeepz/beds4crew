const express = require("express");
const User = require("../models/User");
const Property = require("../models/Property");
const Booking = require("../models/Booking");
const verifyToken = require("../middleware/auth");
const router = express.Router();

const ADMIN_ID = "698c112bbc6f9ffd822acf3c";
const ADMIN_EMAIL = "r.papagna@gmail.com";

// Middleware to verify admin access
const verifyAdmin = (req, res, next) => {
  if (req.user.id !== ADMIN_ID || req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: "Unauthorized: Admin access required" });
  }
  next();
};

// Get all users
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select("-password").lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

// Update user
router.put("/users/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { firstName, lastName, role, hasPaid } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { firstName, lastName, role, hasPaid },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
});

// Delete user
router.delete("/users/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Don't allow deleting the admin user
    if (req.params.userId === ADMIN_ID) {
      return res.status(400).json({ message: "Cannot delete admin user" });
    }

    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
});

// Get all properties (admin view)
router.get("/properties", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const properties = await Property.find({})
      .populate("ownerHost", "firstName lastName email hasPaid")
      .lean();
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch properties", error: error.message });
  }
});

// Update property (admin)
router.put("/properties/:propertyId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, pricePerNight, maxGuests, category, isActive } = req.body;
    const property = await Property.findByIdAndUpdate(
      req.params.propertyId,
      { title, description, pricePerNight, maxGuests, category, isActive },
      { new: true }
    ).populate("ownerHost", "firstName lastName email");

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: "Failed to update property", error: error.message });
  }
});

// Delete property (admin)
router.delete("/properties/:propertyId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete property", error: error.message });
  }
});

// Get all bookings (admin view)
router.get("/bookings", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("guest", "firstName lastName email")
      .populate("host", "firstName lastName email")
      .populate("property", "title city country")
      .sort({ createdAt: -1 })
      .lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings", error: error.message });
  }
});

// Update booking status (admin)
router.put("/bookings/:bookingId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status },
      { new: true }
    )
      .populate("guest", "firstName lastName email")
      .populate("host", "firstName lastName email")
      .populate("property", "title city country");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: "Failed to update booking", error: error.message });
  }
});

// Delete booking (admin)
router.delete("/bookings/:bookingId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete booking", error: error.message });
  }
});

module.exports = router;
