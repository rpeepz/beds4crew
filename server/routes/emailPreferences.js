const express = require("express");
const User = require("../models/User");
const verifyToken = require("../middleware/auth");
const emailService = require("../utils/emailService");

const router = express.Router();

// Get user's email preferences
router.get("/email-preferences", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("emailPreferences email firstName").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.emailPreferences || {});
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch preferences", error: error.message });
  }
});

// Update email preferences - requires email confirmation
router.put("/email-preferences", verifyToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    // Validate that only allowed preferences are being updated
    const allowedPreferences = [
      "bookingConfirmation",
      "bookingCancellation",
      "newBookingRequest",
      "newMessage",
      "welcomeEmail"
    ];
    
    const updates = {};
    for (const key of allowedPreferences) {
      if (preferences.hasOwnProperty(key)) {
        updates[`emailPreferences.${key}`] = preferences[key];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid preferences provided" });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("emailPreferences email firstName");
    
    // Send confirmation email
    const changedSettings = Object.entries(preferences)
      .map(([key, value]) => `${key}: ${value ? 'Enabled' : 'Disabled'}`)
      .join('<br>');
    
    await emailService.send({
      to: user.email,
      subject: "Email Notification Settings Updated",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1976d2;">Settings Updated</h1>
          <p>Hi ${user.firstName},</p>
          <p>Your email notification preferences have been updated:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            ${changedSettings}
          </div>
          <p style="color: #666; margin-top: 30px;">
            You can change these settings anytime in the Support Center.
          </p>
          <p style="color: #666;">
            Note: You will continue to receive important security-related emails (password resets, email verification) regardless of these settings.
          </p>
        </div>
      `
    }).catch(err => console.error('Failed to send confirmation email:', err));
    
    res.json({ 
      message: "Email preferences updated successfully",
      emailPreferences: user.emailPreferences 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update preferences", error: error.message });
  }
});

module.exports = router;
