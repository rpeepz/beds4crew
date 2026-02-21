import React, { useState, useEffect, useRef } from "react";
import { Box, IconButton, Typography, Fade, Portal } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import useGestures from "../hooks/useGestures";
import useZoom from "../hooks/useZoom";

/**
 * Instagram-style Full-Screen Media Viewer
 * Features:
 * - Full viewport immersive black background
 * - Gesture-based navigation (swipe, pinch-to-zoom, double-tap)
 * - Auto-hiding controls with fade animation
 * - FLIP animation on open/close
 * - Hardware-accelerated transforms
 */
export default function MediaViewer({ 
  images = [], 
  currentIndex = 0, 
  onClose, 
  onNavigate,
  formatImageUrl = (url) => url,
  altPrefix = "",
  thumbnailRect = null
}) {
  const [index, setIndex] = useState(currentIndex);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isAnimatingIn, setIsAnimatingIn] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Gesture handling (image)
  const imageGestures = useGestures({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
    onSwipeDown: handleClose,
    onTap: handleToggleControls,
  });

  // Gesture handling (backdrop)
  const backdropGestures = useGestures({
    onSwipeLeft: handleClose,
    onSwipeRight: handleClose,
    onSwipeDown: handleClose,
    onTap: handleClose,
  });

  // Zoom functionality
  const zoom = useZoom({
    imageRef,
    containerRef,
    onZoomStart: () => setControlsVisible(true),
    onZoomEnd: () => setControlsVisible(true),
  });

  // Preload adjacent images for smooth navigation
  useEffect(() => {
    const preloadIndexes = [index - 1, index + 1].filter(i => i >= 0 && i < images.length);
    preloadIndexes.forEach(i => {
      const img = new Image();
      img.src = formatImageUrl(images[i].path || images[i]);
    });
  }, [index, images, formatImageUrl]);

  // Reset zoom and inline transforms when changing images to keep centered
  useEffect(() => {
    zoom.resetZoom?.();
    if (imageRef.current) {
      imageRef.current.style.transition = "";
      imageRef.current.style.transform = "";
      imageRef.current.style.opacity = "";
    }
  }, [index]);

  // FLIP animation on mount
  useEffect(() => {
    if (thumbnailRect && containerRef.current) {
      const container = containerRef.current;
      const image = imageRef.current;
      
      if (image) {
        // Calculate FLIP animation
        const startX = thumbnailRect.left + thumbnailRect.width / 2;
        const startY = thumbnailRect.top + thumbnailRect.height / 2;
        const startScale = Math.min(thumbnailRect.width / window.innerWidth, thumbnailRect.height / window.innerHeight);
        
        // Set initial transform
        image.style.transform = `translate(-50%, -50%) translate(${startX - window.innerWidth / 2}px, ${startY - window.innerHeight / 2}px) scale(${startScale})`;
        image.style.opacity = "0";
        
        // Trigger animation
        requestAnimationFrame(() => {
          image.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease";
          image.style.transform = "translate(-50%, -50%) scale(1)";
          image.style.opacity = "1";
        });
      }
    }
    
    setIsAnimatingIn(false);
    setControlsVisible(true);
  }, [thumbnailRect]);

  // Lock body scroll when viewer is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (zoom.isZoomed) return; // Disable keyboard nav when zoomed
      
      switch (e.key) {
        case "Escape":
          handleClose();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom.isZoomed]);

  function handleNext() {
    if (index < images.length - 1 && !zoom.isZoomed) {
      const newIndex = index + 1;
      setIndex(newIndex);
      onNavigate?.(newIndex);
      showControls();
    }
  }

  function handlePrev() {
    if (index > 0 && !zoom.isZoomed) {
      const newIndex = index - 1;
      setIndex(newIndex);
      onNavigate?.(newIndex);
      showControls();
    }
  }

  function handleClose() {
    setIsAnimatingOut(true);
    setControlsVisible(false);
    
    // Animate back to thumbnail position if available
    if (thumbnailRect && imageRef.current) {
      const image = imageRef.current;
      const startX = thumbnailRect.left + thumbnailRect.width / 2;
      const startY = thumbnailRect.top + thumbnailRect.height / 2;
      const startScale = Math.min(thumbnailRect.width / window.innerWidth, thumbnailRect.height / window.innerHeight);
      
      image.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 1, 1), opacity 0.25s ease";
      image.style.transform = `translate(-50%, -50%) translate(${startX - window.innerWidth / 2}px, ${startY - window.innerHeight / 2}px) scale(${startScale})`;
      image.style.opacity = "0";
    }
    
    setTimeout(() => {
      onClose?.();
    }, 250);
  }

  function handleToggleControls() {
    setControlsVisible(true);
  }

  function showControls() {
    setControlsVisible(true);
  }

  const currentImage = images[index];

  return (
    <Portal>
      <Box
        ref={containerRef}
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          bgcolor: "rgba(0, 0, 0, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          // Touch action for gesture handling
          touchAction: zoom.isZoomed ? "none" : "pan-y",
          cursor: zoom.isZoomed ? "grab" : "default",
          // Hardware acceleration
          transform: "translateZ(0)",
          willChange: "auto",
        }}
        onMouseMove={showControls}
      >
        {/* Background overlay - fades in */}
        <Box
          {...backdropGestures}
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            opacity: isAnimatingOut ? 0 : 1,
            transition: "opacity 0.25s ease",
            cursor: "pointer",
          }}
        />

        {/* Main Image - centered with aspect ratio preserved */}
        <Box
          ref={imageRef}
          {...imageGestures}
          component="img"
          src={formatImageUrl(currentImage.path || currentImage)}
          alt={currentImage.caption || `${altPrefix} ${index + 1}`}
          onDoubleClick={zoom.handleDoubleClick}
          onTouchStart={zoom.handleTouchStart}
          onTouchMove={zoom.handleTouchMove}
          onTouchEnd={zoom.handleTouchEnd}
          sx={{
            maxWidth: zoom.isZoomed ? "none" : "calc(100% - 80px)",
            maxHeight: zoom.isZoomed ? "none" : "calc(100% - 80px)",
            width: zoom.isZoomed ? "auto" : "auto",
            height: zoom.isZoomed ? "auto" : "auto",
            objectFit: "contain",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: zoom.isZoomed ? zoom.transform : "translate(-50%, -50%) scale(1)",
            transformOrigin: "center center",
            transition: zoom.isAnimating ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
            cursor: zoom.isZoomed ? "grab" : "default",
            "&:active": {
              cursor: zoom.isZoomed ? "grabbing" : "default",
            },
            // Hardware acceleration
            willChange: zoom.isZoomed ? "transform" : "auto",
            backfaceVisibility: "hidden",
            userSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "auto",
          }}
          draggable={false}
        />

        {/* Top Overlay - Back button and info */}
        <Fade in={controlsVisible && !isAnimatingOut} timeout={200}>
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: { xs: 1, sm: 2 },
              background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
              pointerEvents: "none",
              "& > *": {
                pointerEvents: "auto",
              },
            }}
          >
            <IconButton
              onClick={handleClose}
              sx={{
                color: "white",
                bgcolor: "rgba(0,0,0,0.3)",
                backdropFilter: "blur(10px)",
                "&:hover": {
                  bgcolor: "rgba(0,0,0,0.5)",
                },
              }}
            >
              <CloseIcon />
            </IconButton>

            <Typography
              variant="body2"
              sx={{
                color: "white",
                fontWeight: 500,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {index + 1} / {images.length}
            </Typography>
          </Box>
        </Fade>

        {/* Bottom Overlay - Caption */}
        {currentImage.caption && (
          <Fade in={controlsVisible && !isAnimatingOut} timeout={200}>
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                p: { xs: 2, sm: 3 },
                background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
                pointerEvents: "none",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "white",
                  textAlign: "center",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                {currentImage.caption}
              </Typography>
            </Box>
          </Fade>
        )}

        {/* Navigation Arrows - Desktop */}
        {!zoom.isZoomed && (
          <>
            {index > 0 && (
              <Fade in={controlsVisible && !isAnimatingOut} timeout={200}>
                <IconButton
                  onClick={handlePrev}
                  sx={{
                    position: "absolute",
                    left: { xs: 8, sm: 16 },
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "white",
                    bgcolor: "rgba(0,0,0,0.3)",
                    backdropFilter: "blur(10px)",
                    display: { xs: "none", sm: "flex" },
                    "&:hover": {
                      bgcolor: "rgba(0,0,0,0.5)",
                    },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
              </Fade>
            )}

            {index < images.length - 1 && (
              <Fade in={controlsVisible && !isAnimatingOut} timeout={200}>
                <IconButton
                  onClick={handleNext}
                  sx={{
                    position: "absolute",
                    right: { xs: 8, sm: 16 },
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "white",
                    bgcolor: "rgba(0,0,0,0.3)",
                    backdropFilter: "blur(10px)",
                    display: { xs: "none", sm: "flex" },
                    "&:hover": {
                      bgcolor: "rgba(0,0,0,0.5)",
                    },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Fade>
            )}
          </>
        )}

        {/* Mobile: Tap zones for navigation (invisible) */}
        {!zoom.isZoomed && (
          <>
            {index > 0 && (
              <Box
                onClick={handlePrev}
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "25%",
                  display: { xs: "block", sm: "none" },
                  cursor: "pointer",
                }}
              />
            )}
            {index < images.length - 1 && (
              <Box
                onClick={handleNext}
                sx={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "25%",
                  display: { xs: "block", sm: "none" },
                  cursor: "pointer",
                }}
              />
            )}
          </>
        )}
      </Box>
    </Portal>
  );
}
