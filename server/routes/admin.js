const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Property = require("../models/Property");
const Booking = require("../models/Booking");
const Ticket = require("../models/Ticket");
const Review = require("../models/Review");
const cache = require("../utils/cache");
const verifyToken = require("../middleware/auth");
const { verifyAdmin } = require("../middleware/auth");
const { deleteUserCascade } = require("../utils/deleteUser");
const router = express.Router();

const publishApprovedReviewToUser = async (reviewDoc) => {
  const booking = await Booking.findById(reviewDoc.booking).select("host guest").lean();
  if (!booking) return;

  const revieweeId = reviewDoc.reviewee?.toString();
  const isHostReviewee = revieweeId === booking.host?.toString();

  const userReviewPayload = {
    review: reviewDoc._id,
    booking: reviewDoc.booking,
    reviewer: reviewDoc.reviewer,
    rating: reviewDoc.rating,
    comment: reviewDoc.comment || "",
    anonymous: Boolean(reviewDoc.anonymous),
    createdAt: reviewDoc.createdAt,
  };

  if (isHostReviewee) {
    await User.updateOne(
      { _id: reviewDoc.reviewee, "ownerHostReviews.review": { $ne: reviewDoc._id } },
      { $push: { ownerHostReviews: userReviewPayload } }
    );
    return;
  }

  await User.updateOne(
    { _id: reviewDoc.reviewee, "guestReviews.review": { $ne: reviewDoc._id } },
    { $push: { guestReviews: userReviewPayload } }
  );
};

const unpublishApprovedReviewFromUser = async (reviewDoc) => {
  await User.updateOne(
    { _id: reviewDoc.reviewee },
    {
      $pull: {
        ownerHostReviews: { review: reviewDoc._id },
        guestReviews: { review: reviewDoc._id },
      },
    }
  );
};

const refreshPropertyReviewMetrics = async (propertyId) => {
  if (!propertyId) return;

  const normalizedPropertyId = typeof propertyId === "string"
    ? (mongoose.Types.ObjectId.isValid(propertyId) ? new mongoose.Types.ObjectId(propertyId) : null)
    : propertyId;

  if (!normalizedPropertyId) return;

  const [stats] = await Review.aggregate([
    {
      $match: {
        property: normalizedPropertyId,
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$property",
        reviewCount: { $sum: 1 },
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  const reviewCount = stats?.reviewCount || 0;
  const rating = reviewCount > 0
    ? Number((stats.averageRating || 0).toFixed(2))
    : null;

  const property = await Property.findByIdAndUpdate(
    normalizedPropertyId,
    {
      $set: {
        rating,
        reviewCount,
      },
    },
    { new: true }
  )
    .select("ownerHost")
    .lean();

  cache.delete("properties:all");
  cache.delete(`property:${normalizedPropertyId}`);

  if (property?.ownerHost) {
    cache.delete(`properties:user:${property.ownerHost}`);
  }
};

const parsePagination = (req) => {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  return { hasPagination, page, limit, skip: (page - 1) * limit };
};

// Get all users
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = User.find({})
      .select("firstName lastName email role hasPaid isActive stripeCurrentTier listingLimit subscriptionStatus stripeSubscriptionId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const users = await query;
      return res.json(users);
    }

    const [users, total] = await Promise.all([
      query.skip(skip).limit(limit),
      User.countDocuments({}),
    ]);

    return res.json({
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

// Update user (including subscription details)
router.put("/users/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      role, 
      hasPaid,
      isActive,
      stripeCurrentTier,
      listingLimit,
      subscriptionStatus,
      stripeSubscriptionId
    } = req.body;
    
    const updateData = { firstName, lastName, role, hasPaid };
    
    // Allow admin to set account active status
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    
    // Allow admin to manually set subscription details
    if (stripeCurrentTier !== undefined) updateData.stripeCurrentTier = parseInt(stripeCurrentTier);
    if (listingLimit !== undefined) updateData.listingLimit = parseInt(listingLimit);
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = stripeSubscriptionId;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      updateData,
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
    await deleteUserCascade(req.params.userId);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ message: "User not found" });
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
});

// Get all properties (admin view)
router.get("/properties", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = Property.find({})
      .select("title description pricePerNight maxGuests category status city country ownerHost createdAt")
      .populate("ownerHost", "firstName lastName email hasPaid")
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const properties = await query;
      return res.json(properties);
    }

    const [properties, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Property.countDocuments({}),
    ]);

    return res.json({
      items: properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch properties", error: error.message });
  }
});

// Update property (admin)
router.put("/properties/:propertyId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, pricePerNight, maxGuests, category, status } = req.body;
    const updateData = { title, description, pricePerNight, maxGuests, category };

    if (status !== undefined) {
      updateData.status = status;
    }

    const property = await Property.findByIdAndUpdate(
      req.params.propertyId,
      updateData,
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
    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = Booking.find({})
      .select("property guest host startDate endDate totalPrice status unreadByGuest unreadByHost createdAt")
      .populate("guest", "firstName lastName email")
      .populate("host", "firstName lastName email")
      .populate("property", "title city country")
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const bookings = await query;
      return res.json(bookings);
    }

    const [bookings, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Booking.countDocuments({}),
    ]);

    return res.json({
      items: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
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

// Fix all beds with missing or false isAvailable (migration endpoint)
router.post("/fix-beds", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const properties = await Property.find({});
    let updatedCount = 0;
    let bedsFixed = 0;
    
    for (const property of properties) {
      let needsUpdate = false;
      
      property.rooms.forEach(room => {
        room.beds.forEach(bed => {
          // Fix beds that are undefined, null, or explicitly false
          if (bed.isAvailable !== true) {
            bed.isAvailable = true;
            needsUpdate = true;
            bedsFixed++;
          }
        });
      });
      
      if (needsUpdate) {
        await property.save();
        updatedCount++;
      }
    }
    
    res.json({ 
      message: "Bed availability fixed", 
      propertiesUpdated: updatedCount,
      bedsFixed: bedsFixed
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fix beds", error: error.message });
  }
});

// Get support tickets (paginated, newest first)
router.get("/tickets", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Ticket.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ticket.countDocuments({})
    ]);

    res.json({
      items: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tickets", error: error.message });
  }
});

// Bulk delete support tickets
router.delete("/tickets", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Ticket ids are required" });
    }

    const deleteResult = await Ticket.deleteMany({ _id: { $in: ids } });
    res.json({ message: "Tickets deleted successfully", deletedCount: deleteResult.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete tickets", error: error.message });
  }
});

// Get reviews for moderation (default: pending)
router.get("/reviews", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "pending").toLowerCase();
    const allowedStatuses = ["pending", "approved", "rejected"];
    const statusFilter = allowedStatuses.includes(status) ? status : "pending";

    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = Review.find({ status: statusFilter })
      .populate("reviewer", "firstName lastName email")
      .populate("reviewee", "firstName lastName email")
      .populate("property", "title")
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const reviews = await query;
      return res.json(reviews);
    }

    const [reviews, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Review.countDocuments({ status: statusFilter }),
    ]);

    return res.json({
      items: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
});

// Approve review and publish to user review fields
router.put("/reviews/:reviewId/approve", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { notes } = req.body || {};
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.status === "approved") {
      await refreshPropertyReviewMetrics(review.property);
      return res.json({ message: "Review already approved", review });
    }

    review.status = "approved";
    review.publishedAt = new Date();
    review.moderation = {
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      notes: String(notes || "").trim(),
    };
    await review.save();

    await publishApprovedReviewToUser(review);
    await refreshPropertyReviewMetrics(review.property);

    return res.json({ message: "Review approved and published", review });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve review", error: error.message });
  }
});

// Reject review (not published)
router.put("/reviews/:reviewId/reject", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { notes } = req.body || {};
    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const wasApproved = review.status === "approved";
    review.status = "rejected";
    review.publishedAt = null;
    review.moderation = {
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      notes: String(notes || "").trim(),
    };
    await review.save();

    if (wasApproved) {
      await unpublishApprovedReviewFromUser(review);
      await refreshPropertyReviewMetrics(review.property);
    }

    return res.json({ message: "Review rejected", review });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject review", error: error.message });
  }
});

module.exports = router;
