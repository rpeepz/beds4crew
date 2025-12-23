const express = require("express");
const cors = require("cors");
const compression = require("compression");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(compression()); // Compress all responses
app.use(express.json({ limit: "10mb" })); // Add size limit

// Configure CORS to allow requests from any device on your network
app.use(cors({
  origin: true, // Allow all origins (for local network testing)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve uploaded files
app.use(express.static("public"));

// Serve built React app (for production)
app.use(express.static(path.join(__dirname, "../client/dist")));

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const propertyRoutes = require("./routes/property");
app.use("/api/properties", propertyRoutes);

const bookingRoutes = require("./routes/booking");
app.use("/api/bookings", bookingRoutes);

const userRoutes = require("./routes/user");
app.use("/api/users", userRoutes);

const geocodingRouter = require('./routes/geocoding');
app.use('/api/geocoding', geocodingRouter);

// MongoDB Connection with optimizations
const mongoURL = process.env.MONGO_URL;

mongoose
  .connect(mongoURL, {
    maxPoolSize: 10, // Connection pooling
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((error) => console.log(`❌ MongoDB connection error: ${error.message}`));

// Handle mongoose connection errors after initial connection
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Basic test route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Beds4Crew API" });
  // res.redirect("https://beds4crew-gqib.onrender.com/");
});

// SPA fallback - serve index.html for all non-API routes
// This MUST come after all API routes and before the 404 handler
app.get("*", (req, res, next) => {
  // Only handle non-API routes
  if (req.path.startsWith("/api/")) {
    return next();
  }
  
  // Try to serve from public/uploads for image requests
  if (req.path.startsWith("/uploads/")) {
    return next();
  }
  
  // For all other routes, serve index.html (for React Router)
  const indexPath = path.join(__dirname, "../client/dist/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If client build doesn't exist, return a helpful message
      res.status(404).json({ 
        message: "Client app not built. Run 'npm run build' in the client directory." 
      });
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({ 
    message: err.message || "Internal server error" 
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Network URL: http://<your-ip>:${PORT}`);
  console.log(`💡 Find your IP: Run 'ipconfig getifaddr en0' (Mac) or 'ipconfig' (Windows)`);
});
