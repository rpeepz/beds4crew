const fetch = require("node-fetch");
const cache = require("./cache");

// Geocode an address with caching
const geocodeAddress = async (address) => {
  // Check cache first
  const cacheKey = `geocode:${address}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Beds4Crew/1.0'
      }
    });
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
      // Cache for 7 days (geocoding results don't change frequently)
      cache.set(cacheKey, result, 7 * 24 * 60 * 60);
      return result;
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  return null;
};

module.exports = { geocodeAddress };
