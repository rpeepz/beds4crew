import React, { useState, useCallback } from "react";
import { Box } from "@mui/material";
import MediaViewer from "./MediaViewer";

/**
 * Instagram-style Media Gallery Component
 * Mobile-first, gesture-driven, edge-to-edge media display
 * 
 * @param {Array} images - Array of image objects with path and optional caption
 * @param {string} altPrefix - Prefix for alt text (e.g., property title)
 * @param {Function} formatImageUrl - Function to format image URLs
 * @param {number} columns - Number of columns in grid (default: 3 for mobile-first)
 */
export default function MediaGallery({ 
  images = [], 
  altPrefix = "", 
  formatImageUrl = (url) => url,
  columns = 3 
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbnailRefs] = useState({});

  const handleThumbnailClick = useCallback((index, event) => {
    setCurrentIndex(index);
    setViewerOpen(true);
    
    // Store the clicked element's position for FLIP animation
    const rect = event.currentTarget.getBoundingClientRect();
    thumbnailRefs[index] = rect;
  }, [thumbnailRefs]);

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  const handleNavigate = useCallback((newIndex) => {
    setCurrentIndex(newIndex);
  }, []);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <>
      {/* Grid View - Instagram Profile Style */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: { xs: 0.25, sm: 0.5, md: 1 },
          width: "100%",
          // Edge-to-edge on mobile
          mx: { xs: 0, sm: 0 },
          px: { xs: 0, sm: 0 },
        }}
      >
        {images.map((img, idx) => (
          <Box
            key={idx}
            onClick={(e) => handleThumbnailClick(idx, e)}
            sx={{
              aspectRatio: "1",
              overflow: "hidden",
              bgcolor: "grey.900",
              cursor: "pointer",
              position: "relative",
              transition: "opacity 0.2s ease",
              "&:hover": {
                opacity: 0.85,
              },
              "&:active": {
                transform: "scale(0.98)",
                transition: "transform 0.1s ease",
              },
            }}
          >
            <Box
              component="img"
              src={formatImageUrl(img.path || img)}
              alt={img.caption || `${altPrefix} ${idx + 1}`}
              loading={idx < 9 ? "eager" : "lazy"} // Eager load first 9 for faster initial display
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                // Hardware acceleration
                transform: "translateZ(0)",
                willChange: "auto",
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Full-Screen Media Viewer Modal */}
      {viewerOpen && (
        <MediaViewer
          images={images}
          currentIndex={currentIndex}
          onClose={handleCloseViewer}
          onNavigate={handleNavigate}
          formatImageUrl={formatImageUrl}
          altPrefix={altPrefix}
          thumbnailRect={thumbnailRefs[currentIndex]}
        />
      )}
    </>
  );
}
