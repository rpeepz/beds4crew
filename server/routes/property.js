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
    const { title, type, description, pricePerNight, address, maxGuests, facilities, category, city, country, rooms } = req.body;
    
    // Cloudinary returns the full URL in file.path
    const images = req.files?.map(file => ({
      path: file.path, // Cloudinary URL
      caption: ""
    })) || [];
    
    // Parse rooms from JSON string
    let parsedRooms = [];
    if (rooms) {
      try {
        parsedRooms = JSON.parse(rooms);
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
    
    // Filter out properties from hosts who haven't paid
    const paidHostProperties = properties.filter(p => p.ownerHost?.hasPaid === true);
      
    cache.set(cacheKey, paidHostProperties, 300); // Cache for 5 minutes
    res.json(paidHostProperties);
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
    if (rooms) property.rooms = rooms;
    
    // Handle isActive - can only activate if rooms are configured
    if (isActive !== undefined) {
      if (isActive && property.rooms.length === 0) {
        return res.status(400).json({ message: "Cannot activate property without rooms configured" });
      }
      property.isActive = isActive;
    }

    await property.save();
    
    // Clear relevant caches
    cache.delete("properties:all");
    cache.delete(`property:${req.params.id}`);
    cache.delete(`properties:user:${req.user.id}`);
    
    res.json(property);
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

module.exports = router;
