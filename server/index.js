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

// Configure CORS based on environment
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      // Production: Allow same-origin requests (no CORS needed since API and client are on same domain)
      origin: false, // Disable CORS since we're serving from same origin
      credentials: true
    }
  : {
      // Development: Allow all origins for local network testing
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };

app.use(cors(corsOptions));

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

if (!mongoURL) {
  console.error("❌ MONGO_URL environment variable is not set!");
  console.log("⚠️  Server will start but database operations will fail.");
} else {
  mongoose
    .connect(mongoURL, {
      maxPoolSize: 10, // Connection pooling
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => console.log("✅ MongoDB connected successfully"))
    .catch((error) => {
      console.error(`❌ MongoDB connection error: ${error.message}`);
      console.log("⚠️  Server will continue running but database operations will fail.");
    });

  // Handle mongoose connection errors after initial connection
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });
}

// Basic test route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Beds4Crew API" });
});

// SPA fallback - serve index.html for all non-API routes
// This catches ALL routes that don't match the above
app.use((req, res, next) => {
  // Skip API routes - let them 404 naturally
  if (req.path.startsWith("/api/")) {
    return next();
  }
  
  // Skip uploaded files
  if (req.path.startsWith("/uploads/")) {
    return next();
  }
  
  // For all other routes, serve index.html (for React Router)
  const indexPath = path.join(__dirname, "../client/dist/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
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

// Start server - THIS MUST HAPPEN regardless of DB connection
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Network URL: http://<your-ip>:${PORT}`);
  console.log(`💡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💡 MongoDB: ${mongoURL ? 'Configured' : '❌ NOT CONFIGURED'}`);
});
