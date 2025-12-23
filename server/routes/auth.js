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

    // Check if user already exists by email
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(409).json({ message: "User email already in use" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get profile image path if uploaded
    let profileImagePath = "";
    if (req.file) {
      profileImagePath = `/uploads/${req.file.filename}`;
    }

    // Create user with sanitized inputs
    const user = new User({
      firstName: sanitizeInput(firstName),
      lastName: sanitizeInput(lastName),
      phone: sanitizeInput(phone),
      email,
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

    // Lookup user with lean query for better performance
    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log(`Login attempt failed: User not found for email ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Password comparison
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Login attempt failed: Invalid password for email ${email}`);
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

    console.log(`✅ User logged in successfully: ${email}`);

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
