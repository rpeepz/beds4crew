import { useState, useRef, useCallback } from "react";

/**
 * Custom hook for pinch-to-zoom and double-tap zoom functionality
 * Instagram-style zoom with smooth animations and pan support
 */
export default function useZoom({ 
  imageRef,
  containerRef,
  minZoom = 1,
  maxZoom = 4,
  onZoomStart,
  onZoomEnd,
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  // Pinch zoom state
  const initialPinchRef = useRef({ distance: 0, scale: 1 });
  const isPinchingRef = useRef(false);
  
  // Pan state (when zoomed)
  const panStartRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);

  // Get distance between two touch points
  const getTouchDistance = useCallback((touch1, touch2) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point between two touches
  const getTouchCenter = useCallback((touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  // Reset zoom to default
  const resetZoom = useCallback(() => {
    setIsAnimating(true);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsZoomed(false);
    
    setTimeout(() => {
      setIsAnimating(false);
      onZoomEnd?.();
    }, 300);
  }, [onZoomEnd]);

  // Zoom to a specific point (for double-tap)
  const zoomToPoint = useCallback((clientX, clientY, targetScale) => {
    if (!imageRef.current || !containerRef.current) return;

    const image = imageRef.current;
    const container = containerRef.current;
    
    const imageRect = image.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate the point relative to the image center
    const pointX = clientX - containerRect.left - containerRect.width / 2;
    const pointY = clientY - containerRect.top - containerRect.height / 2;

    // Calculate new translation to keep the tapped point centered
    const newTranslateX = -pointX * (targetScale - 1);
    const newTranslateY = -pointY * (targetScale - 1);

    setIsAnimating(true);
    setScale(targetScale);
    setTranslate({ x: newTranslateX, y: newTranslateY });
    setIsZoomed(targetScale > 1);

    if (targetScale > 1) {
      onZoomStart?.();
    } else {
      setTimeout(() => {
        onZoomEnd?.();
      }, 300);
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  }, [imageRef, containerRef, onZoomStart, onZoomEnd]);

  // Handle double-tap zoom (desktop and mobile)
  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    
    if (isZoomed) {
      resetZoom();
    } else {
      const targetScale = 2.5;
      zoomToPoint(e.clientX, e.clientY, targetScale);
    }
  }, [isZoomed, resetZoom, zoomToPoint]);

  // Handle touch events for pinch zoom and pan
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch zoom start
      e.preventDefault();
      isPinchingRef.current = true;
      
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      initialPinchRef.current = {
        distance,
        scale: scale,
      };
      
      onZoomStart?.();
    } else if (e.touches.length === 1 && isZoomed) {
      // Pan start (only when zoomed)
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.touches[0].clientX - translate.x,
        y: e.touches[0].clientY - translate.y,
      };
    }
  }, [scale, isZoomed, translate, getTouchDistance, onZoomStart]);

  const handleTouchMove = useCallback((e) => {
    if (isPinchingRef.current && e.touches.length === 2) {
      e.preventDefault();
      
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / initialPinchRef.current.distance;
      let newScale = initialPinchRef.current.scale * scaleChange;
      
      // Clamp scale
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
      
      setScale(newScale);
      setIsZoomed(newScale > 1);
      
      // Calculate center point for zoom origin
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        const pointX = center.x - containerRect.left - containerRect.width / 2;
        const pointY = center.y - containerRect.top - containerRect.height / 2;
        
        setTranslate({
          x: -pointX * (newScale - 1),
          y: -pointY * (newScale - 1),
        });
      }
    } else if (isPanningRef.current && e.touches.length === 1 && isZoomed) {
      e.preventDefault();
      
      const newX = e.touches[0].clientX - panStartRef.current.x;
      const newY = e.touches[0].clientY - panStartRef.current.y;
      
      setTranslate({ x: newX, y: newY });
    }
  }, [isZoomed, minZoom, maxZoom, containerRef, getTouchDistance, getTouchCenter]);

  const handleTouchEnd = useCallback((e) => {
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      
      // If zoomed out beyond min, snap back
      if (scale <= minZoom) {
        resetZoom();
      }
    }
    
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
  }, [scale, minZoom, resetZoom]);

  // Calculate transform string
  const transform = `translate(-50%, -50%) translate(${translate.x}px, ${translate.y}px) scale(${scale})`;

  return {
    isZoomed,
    scale,
    translate,
    transform,
    isAnimating,
    handleDoubleClick,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetZoom,
  };
}
