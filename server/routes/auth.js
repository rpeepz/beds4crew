const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/auth");
const { uploadSingle } = require("../utils/fileUpload");
const { generateTokens } = require("../utils/tokenHelpers");
const { validateEmail, validatePassword, sanitizeInput } = require("../utils/validation");

const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const router = express.Router();

// Register route
router.post("/register", uploadSingle, async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password, role } = req.body;

    // Validate inputs
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists by email
    const existingUserEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserEmail) {
      return res.status(409).json({ message: "User email already in use" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get profile image path if uploaded (Cloudinary URL)
    let profileImagePath = "";
    if (req.file) {
      profileImagePath = req.file.path; // Cloudinary returns full URL in path
    }

    // Create user with sanitized inputs
    const user = new User({
      firstName: sanitizeInput(firstName),
      lastName: sanitizeInput(lastName),
      phone: sanitizeInput(phone),
      email: normalizedEmail,
      password: hashedPassword,
      profileImagePath,
      role: role || "guest",
    });

    await user.save();

    return res
      .status(201)
      .json({ message: "User registered successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password required" });
    }

    // Check if JWT secrets are configured
    if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      console.error("❌ JWT secrets not configured!");
      return res.status(500).json({ 
        message: "Server configuration error. Please contact support." 
      });
    }

    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();

    // Lookup user with lean query for better performance
    const user = await User.findOne({ email: normalizedEmail }).lean();
    if (!user) {
      console.log(`Login attempt failed: User not found for email ${normalizedEmail}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Password comparison
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Login attempt failed: Invalid password for email ${normalizedEmail}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate both tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to database
    const refreshTokenDoc = new RefreshToken({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await refreshTokenDoc.save();

    console.log(`✅ User logged in successfully: ${normalizedEmail}`);

    // Return tokens + user info
    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImagePath: user.profileImagePath,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Login failed", error: error.message });
  }
});

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    // Verify refresh token in database
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
    }).populate("userId");

    if (!storedToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Verify JWT signature
    try {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      await RefreshToken.deleteOne({ token: refreshToken });
      return res.status(401).json({ message: "Refresh token expired" });
    }

    const user = storedToken.userId;

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update refresh token in database
    await RefreshToken.updateOne(
      { _id: storedToken._id },
      {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    );

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Token refresh failed", error: error.message });
  }
});

// Logout route
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Logout failed", error: error.message });
  }
});

// Update profile (name, avatar)
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { 
        firstName: sanitizeInput(firstName), 
        lastName: sanitizeInput(lastName) 
      } },
      { new: true, select: "-password" }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Profile update failed" });
  }
});

// Upload or replace profile photo
router.post("/profile/photo", verifyToken, uploadSingle, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Cloudinary returns the full URL in req.file.path
    const newProfileImagePath = req.file.path;
    
    console.log("Uploaded file info:", { path: req.file.path, filename: req.file.filename });
    
    // Get user's old profile image path
    const user = await User.findById(req.user.id);
    const oldProfileImagePath = user.profileImagePath;

    // Update user's profile image path
    user.profileImagePath = newProfileImagePath;
    await user.save();

    // Delete old profile image from Cloudinary if it exists
    if (oldProfileImagePath && oldProfileImagePath.includes('cloudinary')) {
      const { cloudinary } = require('../utils/fileUpload');
      // Extract public_id from Cloudinary URL
      const urlParts = oldProfileImagePath.split('/');
      const filenameWithExt = urlParts[urlParts.length - 1];
      const filename = filenameWithExt.split('.')[0];
      const publicId = `profile-images/${filename}`;
      
      console.log("Deleting old image with public_id:", publicId);
      
      cloudinary.uploader.destroy(publicId, (err, result) => {
        if (err) console.error("Failed to delete old profile image from Cloudinary:", err);
        else console.log("Old image deleted:", result);
      });
    }

    res.json({ 
      message: "Profile photo updated successfully",
      profileImagePath: newProfileImagePath 
    });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    res.status(500).json({ message: "Failed to upload profile photo", error: error.message });
  }
});

// Remove profile photo
router.delete("/profile/photo", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.profileImagePath) {
      return res.status(400).json({ message: "No profile photo to remove" });
    }

    const oldProfileImagePath = user.profileImagePath;

    // Remove profile image path from user
    user.profileImagePath = "";
    await user.save();

    // Delete the file from Cloudinary if it's a Cloudinary URL
    if (oldProfileImagePath.includes('cloudinary')) {
      const { cloudinary } = require('../utils/fileUpload');
      // Extract public_id from Cloudinary URL
      const urlParts = oldProfileImagePath.split('/');
      const filenameWithExt = urlParts[urlParts.length - 1];
      const filename = filenameWithExt.split('.')[0];
      const publicId = `profile-images/${filename}`;
      
      console.log("Deleting image with public_id:", publicId);
      
      cloudinary.uploader.destroy(publicId, (err, result) => {
        if (err) console.error("Failed to delete profile image from Cloudinary:", err);
        else console.log("Image deleted:", result);
      });
    }

    res.json({ message: "Profile photo removed successfully" });
  } catch (error) {
    console.error("Profile photo deletion error:", error);
    res.status(500).json({ message: "Failed to remove profile photo", error: error.message });
  }
});

// Get current user's data (including wishlist)
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

module.exports = router;
