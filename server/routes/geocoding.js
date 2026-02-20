// server/routes/geocoding.js
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();


// Middleware to enforce rate limiting (1 request per second)
const rateLimit = (req, res, next) => {
  const now = Date.now();
  const lastRequest = req.session?.lastRequest || 0;
  const delay = 1000; // 1 second in ms

  if (now - lastRequest < delay) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait before making another request.' });
  }

  req.session.lastRequest = now;
  next();
};

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Beds4Crew/1.0 (r.papagna.42@gmail.com)'
      }
    });
    const data = await response.json();
    
    if (!data.length) {
      return res.status(404).json({ error: 'No results found' });
    }

    const { lat, lon } = data[0];
    // console.log('Geocoding result:', { lat, lon });
    res.json({ lat, lon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

module.exports = router;
