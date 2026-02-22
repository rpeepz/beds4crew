const User = require("../models/User");
const express = require("express");
const Property = require("../models/Property");
const verifyToken = require("../middleware/auth");
const cache = require("../utils/cache");
const { geocodeAddress } = require("../utils/geocoding");
const { uploadMultiple } = require("../utils/fileUpload");
const { sanitizeInput } = require("../utils/validation");

const router = express.Router();

// Create property (Host only)
router.post("/", verifyToken, uploadMultiple, async (req, res) => {
  try {
    // Verify user is a host
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'host') {
      return res.status(403).json({ message: "Unauthorized: Only hosts can create properties" });
    }

    const { title, type, description, pricePerNight, address, maxGuests, facilities, category, city, country, rooms } = req.body;
    
    // Cloudinary returns the full URL in file.path
    const images = req.files?.map(file => {
      const rawPath = file.path || "";
      const normalizedPath = rawPath.startsWith("http")
        ? rawPath
        : rawPath.includes("public")
          ? rawPath.replace(/^.*public/, "")
          : file.filename
            ? `/uploads/${file.filename}`
            : rawPath;

      return {
        path: normalizedPath,
        caption: ""
      };
    }) || [];
    
    // Parse rooms from JSON string
    let parsedRooms = [];
    if (rooms) {
      try {
        parsedRooms = JSON.parse(rooms);
        // Ensure all beds have isAvailable set to true by default
        parsedRooms.forEach(room => {
          room.beds.forEach(bed => {
            if (bed.isAvailable === undefined || bed.isAvailable === null) {
              bed.isAvailable = true;
            }
          });
        });
      } catch (e) {
        return res.status(400).json({ message: "Invalid rooms format" });
      }
    }

    // Geocode the address to get latitude and longitude
    let latitude, longitude;
    if (address) {
      const coords = await geocodeAddress(`${address}, ${city}, ${country}`);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    // Property is only active if it has rooms configured
    const isActive = parsedRooms.length > 0;

    const property = new Property({
      ownerHost: req.user.id,
      title: sanitizeInput(title),
      type,
      description: sanitizeInput(description),
      pricePerNight,
      address: sanitizeInput(address),
      maxGuests,
      facilities: facilities ? facilities.split(",").map(f => sanitizeInput(f)) : [],
      category: sanitizeInput(category),
      city: sanitizeInput(city),
      country: sanitizeInput(country),
      images,
      rooms: parsedRooms,
      latitude,
      longitude,
      isActive,
    });
    await property.save();
    
    // Clear cache after creation
    cache.delete("properties:all");
    
    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: "Property creation failed", error: error.message });
  }
});

// Get all properties (for guests) - only show active properties with caching
router.get("/", async (req, res) => {
  try {
    const cacheKey = "properties:all";
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    const properties = await Property.find({ isActive: true })
      .populate("ownerHost", "firstName lastName profileImagePath hasPaid")
      .lean();
      
    cache.set(cacheKey, properties, 300); // Cache for 5 minutes
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch properties", error: error.message });
  }
});

// Get properties of logged-in host
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const cacheKey = `properties:user:${req.user.id}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    const properties = await Property.find({ ownerHost: req.user.id }).lean();
    cache.set(cacheKey, properties, 300);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your properties" });
  }
});

// Date Finder - Search for properties with available beds in a date range
// IMPORTANT: This must come BEFORE /:id route to avoid matching "date-finder" as an ID
router.get("/date-finder", async (req, res) => {
  try {
    const { lat, lng, startDate, endDate, radius, minPrice, maxPrice, minBeds } = req.query;
    
    // console.log('🔍 Date Finder API called with params:', req.query);
    
    // Validate required params
    if (!lat || !lng || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required parameters: lat, lng, startDate, endDate" });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMiles = parseFloat(radius) || 25;
    const minPriceNum = parseFloat(minPrice) || 0;
    const maxPriceNum = parseFloat(maxPrice) || Number.MAX_SAFE_INTEGER;
    const minBedsNum = parseInt(minBeds) || 1;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // console.log('🔍 Parsed params:', { latitude, longitude, radiusMiles, minPriceNum, maxPriceNum, minBedsNum, start, end });
    
    if (end <= start) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    
    // Get all active properties
    const allProperties = await Property.find({ 
      isActive: true,
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    })
    .populate("ownerHost", "firstName lastName hasPaid")
    .lean();
    
    // console.log(`🔍 Found ${allProperties.length} active properties with coordinates`);
    
    // Filter properties by location (radius in miles)
    const EARTH_RADIUS_MILES = 3959;
    const propertiesInRadius = allProperties.filter(prop => {
      const latDiff = (prop.latitude - latitude) * Math.PI / 180;
      const lngDiff = (prop.longitude - longitude) * Math.PI / 180;
      const a = Math.sin(latDiff/2) * Math.sin(latDiff/2) +
                Math.cos(latitude * Math.PI / 180) * Math.cos(prop.latitude * Math.PI / 180) *
                Math.sin(lngDiff/2) * Math.sin(lngDiff/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = EARTH_RADIUS_MILES * c;
      prop.distance = distance;
      return distance <= radiusMiles;
    });
    
    // console.log(`🔍 ${propertiesInRadius.length} properties within ${radiusMiles} mile radius`);
    
    // Check availability for each property
    const Booking = require("../models/Booking");
    const availableProperties = [];
    
    for (const property of propertiesInRadius) {
      // console.log(`🔍 Checking property: ${property.title}`);
      
      // Skip if host hasn't paid
      if (!property.ownerHost?.hasPaid) {
        // console.log(`  ❌ Host hasn't paid`);
        continue;
      }
      
      // Get all confirmed bookings that overlap with the date range
      const overlappingBookings = await Booking.find({
        property: property._id,
        status: "confirmed",
        startDate: { $lte: end },
        endDate: { $gte: start }
      }).lean();
      
      // console.log(`  📅 ${overlappingBookings.length} overlapping bookings`);
      
      // Check blocked periods
      const blockedPeriods = property.blockedPeriods || [];
      const entirePropertyBlocked = blockedPeriods.some(period => {
        return period.blockType === "entire" && 
               new Date(period.startDate) <= end && 
               new Date(period.endDate) >= start;
      });
      
      if (entirePropertyBlocked) {
        // console.log(`  ❌ Entire property is blocked`);
        continue; // Skip this property
      }
      
      // Count available beds
      let availableBeds = 0;
      let lowestPrice = Number.MAX_SAFE_INTEGER;
      
      property.rooms?.forEach((room, roomIndex) => {
        room.beds?.forEach((bed, bedIndex) => {
          // Check if bed is marked as available
          if (!bed.isAvailable) {
            return;
          }
          
          // Check if bed is blocked
          const bedBlocked = blockedPeriods.some(period => {
            if (period.blockType === "bed" && 
                period.roomIndex === roomIndex && 
                period.bedIndex === bedIndex) {
              return new Date(period.startDate) <= end && 
                     new Date(period.endDate) >= start;
            }
            if (period.blockType === "room" && period.roomIndex === roomIndex) {
              return new Date(period.startDate) <= end && 
                     new Date(period.endDate) >= start;
            }
            return false;
          });
          
          if (bedBlocked) {
            return;
          }
          
          // Check if bed is booked
          const bedBooked = overlappingBookings.some(booking => {
            return booking.bookedBeds?.some(bookedBed => 
              bookedBed.roomIndex === roomIndex && bookedBed.bedIndex === bedIndex
            );
          });
          
          if (!bedBooked) {
            availableBeds++;
            if (bed.pricePerBed < lowestPrice) {
              lowestPrice = bed.pricePerBed;
            }
          }
        });
      });
      
      // console.log(`  🛏️  Available beds: ${availableBeds}, Lowest price: $${lowestPrice}`);
      
      // Apply filters
      if (availableBeds >= minBedsNum && 
          lowestPrice >= minPriceNum && 
          lowestPrice <= maxPriceNum) {
        // console.log(`  ✅ Property passed all filters!`);
        availableProperties.push({
          ...property,
          availableBeds,
          lowestPrice
        });
      } else {
        // console.log(`  ❌ Failed filters - minBeds: ${minBedsNum}, priceRange: $${minPriceNum}-$${maxPriceNum}`);
      }
    }
    
    // console.log(`🔍 Final result: ${availableProperties.length} available properties`);
    
    // Sort by distance
    availableProperties.sort((a, b) => a.distance - b.distance);
    
    res.json({
      properties: availableProperties,
      searchParams: {
        location: { lat: latitude, lng: longitude },
        radius: radiusMiles,
        startDate,
        endDate,
        priceRange: [minPriceNum, maxPriceNum],
        minBeds: minBedsNum
      }
    });
  } catch (error) {
    console.error('Date finder error:', error);
    res.status(500).json({ message: "Failed to search properties", error: error.message });
  }
});

// Get property details with caching
router.get("/:id", async (req, res) => {
  try {
    const cacheKey = `property:${req.params.id}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    const property = await Property.findById(req.params.id)
      .populate("ownerHost", "firstName lastName profileImagePath hasPaid")
      .lean();
      
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    
    cache.set(cacheKey, property, 300);
    res.json(property);
  } catch (error) {
    res.status(404).json({ message: "Property not found" });
  }
});

// Add to wishlist
router.post("/:id/wishlist", verifyToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { wishList: req.params.id } }
    );
    res.json({ message: "Added to wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update wishlist", error: error.message });
  }
});

// Remove from wishlist
router.delete("/:id/wishlist", verifyToken, async (req, res) => {
  await User.findByIdAndUpdate(
    req.user.id,
    { $pull: { wishList: req.params.id } }
  );
  res.json({ message: "Removed from wishlist" });
});

// Update property (Host only - verify ownership)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    // Verify ownership
    if (property.ownerHost.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own properties" });
    }

    // Prevent changing the type after creation
    if (req.body.type && req.body.type !== property.type) {
      return res.status(400).json({ message: "Property type cannot be changed after creation" });
    }

    // Update fields
    const { title, description, pricePerNight, maxGuests, facilities, category, isActive, rooms } = req.body;
    
    if (title) property.title = sanitizeInput(title);
    if (description) property.description = sanitizeInput(description);
    if (pricePerNight !== undefined) property.pricePerNight = pricePerNight;
    if (maxGuests !== undefined) property.maxGuests = maxGuests;
    if (facilities) property.facilities = typeof facilities === "string" 
      ? facilities.split(",").map(f => sanitizeInput(f)) 
      : facilities.map(f => sanitizeInput(f));
    if (category) property.category = sanitizeInput(category);
    if (rooms) {
      // Ensure all beds have isAvailable set to true by default
      rooms.forEach(room => {
        room.beds.forEach(bed => {
          if (bed.isAvailable === undefined || bed.isAvailable === null) {
            bed.isAvailable = true;
          }
        });
      });
      property.rooms = rooms;
    }
    
    // Handle isActive - can only activate if rooms are configured
    if (isActive !== undefined) {
      if (isActive && property.rooms.length === 0) {
        return res.status(400).json({ message: "Cannot activate property without rooms configured" });
      }
      property.isActive = isActive;
    }

    await property.save();

    const populatedProperty = await property.populate("ownerHost", "firstName lastName profileImagePath hasPaid");
    
    // Clear relevant caches
    cache.delete("properties:all");
    cache.delete(`property:${req.params.id}`);
    cache.delete(`properties:user:${req.user.id}`);
    
    res.json(populatedProperty);
  } catch (error) {
    res.status(500).json({ message: "Failed to update property", error: error.message });
  }
});

// Delete property (Host only - verify ownership)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    // Verify ownership
    if (property.ownerHost.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only delete your own properties" });
    }

    await Property.findByIdAndDelete(req.params.id);
    
    // Clear relevant caches
    cache.delete("properties:all");
    cache.delete(`property:${req.params.id}`);
    cache.delete(`properties:user:${req.user.id}`);
    
    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete property", error: error.message });
  }
});

// Update image caption (Host only - verify ownership)
router.put("/:id/images/:imageIndex", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    // Verify ownership
    if (property.ownerHost.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own properties" });
    }

    const imageIndex = parseInt(req.params.imageIndex);
    const { caption } = req.body;

    if (imageIndex < 0 || imageIndex >= property.images.length) {
      return res.status(400).json({ message: "Invalid image index" });
    }

    property.images[imageIndex].caption = sanitizeInput(caption) || "";
    await property.save();
    
    // Clear cache
    cache.delete(`property:${req.params.id}`);
    
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: "Failed to update image caption", error: error.message });
  }
});

// Delete image (Host only - verify ownership)
router.delete("/:id/images/:imageIndex", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    // Verify ownership
    if (property.ownerHost.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own properties" });
    }

    const imageIndex = parseInt(req.params.imageIndex);

    if (imageIndex < 0 || imageIndex >= property.images.length) {
      return res.status(400).json({ message: "Invalid image index" });
    }

    property.images.splice(imageIndex, 1);
    await property.save();
    
    // Clear cache
    cache.delete(`property:${req.params.id}`);
    
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: "Failed to delete image", error: error.message });
  }
});

// Add images to existing property (Host only - verify ownership)
router.post("/:id/images", verifyToken, uploadMultiple, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    // Verify ownership
    if (property.ownerHost.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only edit your own properties" });
    }

    // Check total image count
    const totalImages = (property.images?.length || 0) + (req.files?.length || 0);
    if (totalImages > 6) {
      return res.status(400).json({ message: "Maximum 6 images allowed per property" });
    }

    // Cloudinary returns the full URL in file.path
    const newImages = req.files?.map(file => ({
      path: file.path, // Cloudinary URL
      caption: ""
    })) || [];

    property.images = [...(property.images || []), ...newImages];
    await property.save();
    
    // Clear cache
    cache.delete(`property:${req.params.id}`);
    cache.delete("properties:all");
    
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: "Failed to upload images", error: error.message });
  }
});

// Clear all property caches (admin/debug endpoint)
router.post("/admin/clear-cache", async (req, res) => {
  try {
    cache.clear();
    res.json({ message: "All caches cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear cache", error: error.message });
  }
});

// Add blocked period (Host only - verify ownership)
router.post("/:id/block", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    
    // Verify ownership
    if (property.ownerHost.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only block your own properties" });
    }

    const { startDate, endDate, reason, blockType, roomIndex, bedIndex } = req.body;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    
    // Validate block type
    if (!["entire", "room", "bed"].includes(blockType)) {
      return res.status(400).json({ message: "Invalid block type. Must be 'entire', 'room', or 'bed'" });
    }
    
    // Validate room/bed indices if needed
    if (blockType === "room" || blockType === "bed") {
      if (roomIndex === undefined || roomIndex < 0 || roomIndex >= property.rooms.length) {
        return res.status(400).json({ message: "Valid room index is required for room/bed blocking" });
      }
    }
    
    if (blockType === "bed") {
      if (bedIndex === undefined || bedIndex < 0 || bedIndex >= property.rooms[roomIndex].beds.length) {
        return res.status(400).json({ message: "Valid bed index is required for bed blocking" });
      }
    }
    
    // Add the blocked period
    const blockedPeriod = {
      startDate: start,
      endDate: end,
      reason: sanitizeInput(reason) || "Unavailable",
      blockType,
      roomIndex: blockType !== "entire" ? roomIndex : undefined,
      bedIndex: blockType === "bed" ? bedIndex : undefined
    };
    
    property.blockedPeriods.push(blockedPeriod);
    await property.save();
    
    // Clear cache
    cache.delete(`property:${req.params.id}`);
    cache.delete("properties:all");
    
    res.json({ message: "Period blocked successfully", property });
  } catch (error) {
    res.status(500).json({ message: "Failed to block period", error: error.message });
  }
});

// Remove blocked period (Host only - verify ownership)
router.delete("/:id/block/:blockId", verifyToken, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    
    // Verify ownership
    if (property.ownerHost.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: You can only unblock your own properties" });
    }

    const blockId = req.params.blockId;
    const blockIndex = property.blockedPeriods.findIndex(
      block => block._id.toString() === blockId
    );
    
    if (blockIndex === -1) {
      return res.status(404).json({ message: "Blocked period not found" });
    }
    
    property.blockedPeriods.splice(blockIndex, 1);
    await property.save();
    
    // Clear cache
    cache.delete(`property:${req.params.id}`);
    cache.delete("properties:all");
    
    res.json({ message: "Block removed successfully", property });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove block", error: error.message });
  }
});

// Get blocked periods for a property (public - for calendar display)
router.get("/:id/blocks", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .select("blockedPeriods")
      .lean();
      
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    
    res.json(property.blockedPeriods || []);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch blocked periods", error: error.message });
  }
});

// Get bed availability for a property within a date range (public - for booking UI)
router.get("/:id/bed-availability", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }
    
    const property = await Property.findById(req.params.id).lean();
    
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    
    // Get all bookings that overlap with the date range
    const Booking = require("../models/Booking");
    const overlappingBookings = await Booking.find({
      property: req.params.id,
      status: { $in: ["confirmed", "pending"] },
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) }
    }).select("startDate endDate bookedBeds status").lean();
    
    // Calculate bed availability
    const bedAvailability = [];
    
    property.rooms.forEach((room, roomIndex) => {
      room.beds.forEach((bed, bedIndex) => {
        // Check if bed is blocked
        let isBlocked = false;
        let blockReason = "";
        
        property.blockedPeriods?.forEach((block) => {
          const blockStart = new Date(block.startDate);
          const blockEnd = new Date(block.endDate);
          const rangeStart = new Date(startDate);
          const rangeEnd = new Date(endDate);
          
          // Check if dates overlap
          if (blockStart <= rangeEnd && blockEnd >= rangeStart) {
            if (block.blockType === "entire" || 
               (block.blockType === "room" && block.roomIndex === roomIndex) ||
               (block.blockType === "bed" && block.roomIndex === roomIndex && block.bedIndex === bedIndex)) {
              isBlocked = true;
              blockReason = block.reason || "Unavailable";
            }
          }
        });
        
        // Check if bed is booked
        let isBooked = false;
        const bookingIds = [];
        
        overlappingBookings.forEach((booking) => {
          const bedBooked = booking.bookedBeds?.some(
            b => b.roomIndex === roomIndex && b.bedIndex === bedIndex
          );
          
          if (bedBooked) {
            isBooked = true;
            bookingIds.push(booking._id);
          }
        });
        
        bedAvailability.push({
          roomIndex,
          bedIndex,
          bedLabel: bed.label,
          pricePerBed: bed.pricePerBed,
          isPrivate: room.isPrivate,
          isAvailable: bed.isAvailable && !isBooked && !isBlocked,
          isBooked,
          isBlocked,
          blockReason: isBlocked ? blockReason : null,
          bookingIds: isBooked ? bookingIds : []
        });
      });
    });
    
    res.json({
      propertyId: property._id,
      startDate,
      endDate,
      bedAvailability
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bed availability", error: error.message });
  }
});

module.exports = router;
