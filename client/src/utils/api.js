// In production (Render), use relative URLs since frontend and backend are on same domain
// In development, use localhost
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api');
export const BASE_URL = API_URL.replace('/api', ''); // Base URL without /api
export { API_URL };

// Simple in-memory cache for client-side requests
const clientCache = new Map();

const getCached = (key, ttlSeconds = 60) => {
  const cached = clientCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now > cached.expiresAt) {
    clientCache.delete(key);
    return null;
  }
  
  return cached.data;
};

const setCache = (key, data, ttlSeconds = 60) => {
  clientCache.set(key, {
    data,
    expiresAt: Date.now() + (ttlSeconds * 1000)
  });
};

const clearCache = (pattern) => {
  if (!pattern) {
    clientCache.clear();
    return;
  }
  
  for (const key of clientCache.keys()) {
    if (key.includes(pattern)) {
      clientCache.delete(key);
    }
  }
};

// Store tokens
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

export const getAccessToken = () => localStorage.getItem("accessToken");
export const getRefreshToken = () => localStorage.getItem("refreshToken");

// Clear tokens on logout
export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  clearCache(); // Clear all cached data
};

// Refresh access token using refresh token
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearTokens();
    window.location.href = "/login";
    throw new Error("No refresh token available");
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      throw new Error("Token refresh failed");
    }

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (error) {
    clearTokens();
    window.location.href = "/login";
    throw error;
  }
};

// Wrapper for fetch with automatic token refresh and caching
export const fetchWithAuth = async (url, options = {}) => {
  const cacheKey = `${options.method || 'GET'}:${url}`;
  
  // Check cache for GET requests
  if (!options.method || options.method === 'GET') {
    const cached = getCached(cacheKey);
    if (cached) {
      return { json: async () => cached, ok: true };
    }
  }
  
  let accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("No access token available");
  }

  // Don't set Content-Type if FormData is being sent (file uploads)
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };
  
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If 401, try refreshing token and retry
  if (response.status === 401) {
    try {
      accessToken = await refreshAccessToken();
      const retryHeaders = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      };
      
      if (!(options.body instanceof FormData)) {
        retryHeaders["Content-Type"] = "application/json";
      }

      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    } catch (error) {
      throw error;
    }
  }
  
  // Cache successful GET responses
  if (response.ok && (!options.method || options.method === 'GET')) {
    const data = await response.clone().json();
    setCache(cacheKey, data, 60); // Cache for 1 minute
  }
  
  // Clear cache on mutations
  if (response.ok && options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
    clearCache('properties');
    clearCache('bookings');
  }

  return response;
};

// Logout function
export const logout = async () => {
  const refreshToken = getRefreshToken();

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    console.error("Logout error:", error);
  }

  clearTokens();
};

// Calculate price range from rooms/beds
export const calculatePriceRange = (rooms) => {
  if (!rooms || rooms.length === 0) return null;
  
  const prices = [];
  rooms.forEach(room => {
    if (room.beds && room.beds.length > 0) {
      room.beds.forEach(bed => {
        if (bed.pricePerBed) {
          prices.push(bed.pricePerBed);
        }
      });
    }
  });

  if (prices.length === 0) return null;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    min: minPrice,
    max: maxPrice,
    hasPriceRange: minPrice !== maxPrice
  };
};

// Format price display for listings
export const formatPriceDisplay = (property) => {
  const priceRange = calculatePriceRange(property.rooms);
  
  if (!priceRange) {
    return property.pricePerNight ? `$${property.pricePerNight}` : "Call for price";
  }

  if (priceRange.hasPriceRange) {
    return `$${Math.round(priceRange.min)} - $${Math.round(priceRange.max)}/night`;
  } else {
    return `$${Math.round(priceRange.min)}/night`;
  }
};

// Debounce utility for search/filter operations
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Fetch bed availability for a property within a date range
export const fetchBedAvailability = async (propertyId, startDate, endDate) => {
  try {
    const start = typeof startDate === 'string' ? startDate : startDate.format('YYYY-MM-DD');
    const end = typeof endDate === 'string' ? endDate : endDate.format('YYYY-MM-DD');
    
    const cacheKey = `bed-availability:${propertyId}:${start}:${end}`;
    const cached = getCached(cacheKey, 30); // Cache for 30 seconds
    
    if (cached) {
      return cached;
    }
    
    const response = await fetch(
      `${API_URL}/properties/${propertyId}/bed-availability?startDate=${start}&endDate=${end}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch bed availability');
    }
    
    const data = await response.json();
    setCache(cacheKey, data, 30);
    return data;
  } catch (error) {
    console.error('Error fetching bed availability:', error);
    throw error;
  }
};
