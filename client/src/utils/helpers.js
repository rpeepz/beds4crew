// Image optimization utilities
import { BASE_URL } from './api';

// Lazy load images with intersection observer
export const lazyLoadImage = (imageElement) => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });
    
    imageObserver.observe(imageElement);
  } else {
    // Fallback for older browsers
    imageElement.src = imageElement.dataset.src;
  }
};

// Format image URL with proper base URL
export const formatImageUrl = (imagePath, baseUrl = BASE_URL) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${baseUrl}${imagePath}`;
};

// Validation utilities
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};

// Date formatting utilities
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export const formatDateRange = (startDate, endDate) => {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

export const calculateNights = (startDate, endDate) => {
  const start = new Date(startDate).setHours(0,0,0,0);
  const end = new Date(endDate).setHours(0,0,0,0);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
};

// Local storage utilities with error handling
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const setToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    return false;
  }
};

export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
    return false;
  }
};

// Listing metrics from real data only (no synthetic values)
export const getListingMetrics = (property = {}) => {
  const rating = typeof property.rating === "number" ? property.rating : null;
  const reviews = typeof property.reviewCount === "number" ? property.reviewCount : null;
  const responseHours = typeof property.ownerHost?.responseHours === "number" ? property.ownerHost.responseHours : null;
  const completionRate = typeof property.ownerHost?.completionRate === "number" ? property.ownerHost.completionRate : null;
  const sellerLevel = property.ownerHost?.sellerLevel || null;
  const isVerified = property.ownerHost?.isVerified ?? null;

  return {
    rating,
    reviews,
    responseHours,
    completionRate,
    sellerLevel,
    isVerified,
  };
};
