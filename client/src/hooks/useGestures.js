import { useRef, useCallback } from "react";

/**
 * Custom hook for handling touch and swipe gestures
 * Supports: swipe left/right/down, tap, and double-tap
 * Instagram-style gesture recognition with velocity detection
 */
export default function useGestures({ 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeDown, 
  onTap,
  swipeThreshold = 50,
  velocityThreshold = 0.3,
}) {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchMoveRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    touchMoveRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touchEnd = {
      x: touchMoveRef.current.x,
      y: touchMoveRef.current.y,
      time: Date.now(),
    };

    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    const deltaTime = touchEnd.time - touchStartRef.current.time;
    
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine if it's a swipe based on distance and velocity
    const isSwipe = (absX > swipeThreshold || absY > swipeThreshold) && 
                    (velocityX > velocityThreshold || velocityY > velocityThreshold);

    if (isSwipe) {
      // Determine direction - prioritize the dominant axis
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.();
        }
        // Note: onSwipeUp not implemented as per Instagram behavior
      }
    } else if (absX < 10 && absY < 10) {
      // It's a tap (minimal movement)
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300) {
        // Double tap detected
        // Note: Double tap zoom is handled in useZoom hook
      } else {
        // Single tap
        onTap?.();
      }
      
      lastTapRef.current = now;
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeDown, onTap, swipeThreshold, velocityThreshold]);

  const handleClick = useCallback((e) => {
    // Handle desktop click as tap
    onTap?.(e);
  }, [onTap]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onClick: handleClick,
  };
}
