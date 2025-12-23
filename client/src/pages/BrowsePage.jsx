import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Slider,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Pagination,
  CircularProgress,
  IconButton,
  FormControlLabel,
  Checkbox,
  InputAdornment,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ClearIcon from '@mui/icons-material/Clear';
import MapView from '../components/HotelMapView';
import { useSnackbar } from '../components/AppSnackbar';
import { fetchWithAuth, formatPriceDisplay, API_URL, BASE_URL } from '../utils/api';
import { useNavigate } from 'react-router-dom';

//TODO: Move to config file or generate based off existing data
const POPULAR_LOCATIONS = [
  { label: 'Miami, FL', lat: 25.7617, lng: -80.1918 },
  { label: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  { label: 'New York, NY', lat: 40.7128, lng: -74.006 },
  { label: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  { label: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { label: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
];

const DEFAULT_LOCATION = { lat: 25.7617, lng: -80.1918 };
const DEFAULT_RADIUS_MILES = 30;
const RESULTS_PER_PAGE = 10;
const CLUSTER_RADIUS_METERS = 200;

export default function BrowsePage() {
  const [allProperties, setAllProperties] = useState([]);
  const [center, setCenter] = useState(DEFAULT_LOCATION);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_MILES);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCustomSearch, setShowCustomSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch user's wishlist
  useEffect(() => {
    if (!user?.id) return;
    fetchWithAuth(`${API_URL}/auth/me`)
      .then(res => res.json())
      .then(data => setWishlist(data.wishList || []))
      .catch(err => console.error('Failed to fetch wishlist:', err));
  }, [user.id]);

  // Fetch all properties from DB
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/properties`)
      .then(res => res.json())
      .then(data => {
        // Filter to only active properties, but make lat/lng optional for list view
        const activeProps = data.filter(p => p.isActive !== false);
        setAllProperties(activeProps);
        
        // Log how many properties have coordinates vs don't
        const withCoords = activeProps.filter(p => p.latitude && p.longitude).length;
        const withoutCoords = activeProps.length - withCoords;
        console.log(`Loaded ${activeProps.length} properties: ${withCoords} with coordinates, ${withoutCoords} without`);
      })
      .catch(err => {
        console.error('Failed to fetch properties:', err);
        snackbar('Failed to load properties', 'error');
      })
      .finally(() => setLoading(false));
  }, [snackbar]);

  // Calculate distance in miles between two lat/lng points using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lat2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  };

  // Calculate distance in meters
  const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
    return calculateDistance(lat1, lng1, lat2, lng2) * 1609.34;
  };

  // Filter properties within radius (only those with coordinates)
  const filteredProperties = useMemo(() => {
    const filtered = allProperties.filter(p => {
      // Only include properties with valid coordinates for map/distance filtering
      if (!p.latitude || !p.longitude) return false;
      return calculateDistance(center.lat, center.lng, p.latitude, p.longitude) <= radius;
    });
    
    console.log('Filtered properties for map:', {
      total: allProperties.length,
      filtered: filtered.length,
      center,
      radius,
      sample: filtered.slice(0, 2).map(p => ({
        title: p.title,
        lat: p.latitude,
        lng: p.longitude
      }))
    });
    
    return filtered;
  }, [allProperties, center, radius]);

  // Group properties by proximity (CLUSTER_RADIUS_METERS)
  const groupedMarkers = useMemo(() => {
    if (!filteredProperties.length) {
      console.log('No filtered properties to group');
      return [];
    }

    const groups = [];
    const visited = new Set();

    for (let i = 0; i < filteredProperties.length; i++) {
      if (visited.has(i)) continue;

      const prop = filteredProperties[i];
      const cluster = [prop];
      visited.add(i);

      // Find all properties within CLUSTER_RADIUS_METERS of this property
      for (let j = i + 1; j < filteredProperties.length; j++) {
        if (visited.has(j)) continue;
        const otherProp = filteredProperties[j];
        const dist = calculateDistanceMeters(
          prop.latitude,
          prop.longitude,
          otherProp.latitude,
          otherProp.longitude
        );
        if (dist <= CLUSTER_RADIUS_METERS) {
          cluster.push(otherProp);
          visited.add(j);
        }
      }

      groups.push(cluster);
    }

    console.log('Grouped markers:', {
      groupCount: groups.length,
      totalProperties: filteredProperties.length,
      groupSizes: groups.map(g => g.length)
    });

    return groups;
  }, [filteredProperties]);

  const handleLocationChange = (e) => {
    const selected = POPULAR_LOCATIONS.find(l => l.label === e.target.value);
    if (selected) {
      setCenter({ lat: selected.lat, lng: selected.lng });
      setCurrentPage(1);
    }
  };

  const handleCustomLocationSearch = async () => {
    if (!searchQuery.trim()) {
      snackbar('Please enter a location to search', 'warning');
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_URL}/geocoding/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!data.lat || !data.lon) {
        snackbar('No results found for that location', 'error');
        return;
      }
      setCenter({ lat: parseFloat(data.lat), lng: parseFloat(data.lon) });
      setCurrentPage(1);
      snackbar('Location updated successfully', 'success');
    } catch (err) {
      console.error('Error searching location:', err);
      snackbar('Error searching for location', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleToggleWishlist = async (propertyId) => {
    if (!user?.id) {
      snackbar('Must be logged in to add to wishlist', 'error');
      return;
    }

    const inWishlist = wishlist.includes(propertyId);
    const method = inWishlist ? 'DELETE' : 'POST';

    try {
      const res = await fetchWithAuth(
        `${API_URL}/properties/${propertyId}/wishlist`,
        { method }
      );
      if (res.ok) {
        setWishlist(prev => {
          if (inWishlist) {
            snackbar('Property removed from wishlist', 'info');
            return prev.filter(id => id !== propertyId);
          } else {
            snackbar('Property added to wishlist', 'info');
            return [...prev, propertyId];
          }
        });
      }
    } catch (err) {
      snackbar('Failed to update wishlist', 'error');
    }
  };

  const selectedLocation = POPULAR_LOCATIONS.find(
    l => l.lat === center.lat && l.lng === center.lng
  )?.label || '';

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" mb={3}>
        Browse Properties
      </Typography>

      {/* Controls Section */}
      <Card sx={{ p: 2, mb: 3, maxWidth: '600px' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            select
            label="Quick Select Location"
            value={selectedLocation}
            onChange={handleLocationChange}
            sx={{ minWidth: 200 }}
          >
            {POPULAR_LOCATIONS.map(loc => (
              <MenuItem key={loc.label} value={loc.label}>
                {loc.label}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ minWidth: 250 }}>
            <Typography variant="body2" gutterBottom>
              Search Radius: {radius} miles
            </Typography>
            <Slider
              value={radius}
              onChange={(_, val) => {
                setRadius(val);
                setCurrentPage(1);
              }}
              min={1}
              max={100}
              step={1}
              valueLabelDisplay="auto"
            />
          </Box>

          <Typography variant="body2" sx={{ mt: 1 }}>
            {loading ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : (
              `${filteredProperties.length} result${filteredProperties.length !== 1 ? 's' : ''}`
            )}
          </Typography>
        </Box>

        {/* Custom Location Search Toggle */}
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showCustomSearch}
                onChange={(e) => setShowCustomSearch(e.target.checked)}
              />
            }
            label="Search by address or landmark"
          />
        </Box>

        {/* Custom Location Search Input */}
        {showCustomSearch && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'flex-start' }}>
            <TextField
              placeholder="Search address / city / landmark"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCustomLocationSearch();
                }
              }}
              variant="outlined"
              size="small"
              sx={{ flex: 1, minWidth: 250 }}
              InputProps={{
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearchQuery('')}
                      edge="end"
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={handleCustomLocationSearch}
              disabled={searchLoading}
              sx={{ minWidth: 100 }}
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
          </Box>
        )}
      </Card>

      {/* Map Section */}
      {!loading && (
        <Card sx={{ mb: 3, height: '500px', overflow: 'hidden', display: 'flex', maxWidth: '600px' }}>
          {filteredProperties.length > 0 ? (
            <MapView
              properties={filteredProperties}
              groupedMarkers={groupedMarkers}
              center={center}
              radius={radius}
              onPropertyClick={(id) => navigate(`/property/${id}`)}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', p: 3 }}>
              <Typography color="text.secondary" textAlign="center">
                No properties with map coordinates found within {radius} miles.
                <br />
                <Typography variant="caption" component="span">
                  (Properties without coordinates will still appear in the list below)
                </Typography>
              </Typography>
            </Box>
          )}
        </Card>
      )}

      {/* Results List Section */}
      <Box>
        <Typography variant="h6" mb={2}>
          All Properties ({allProperties.length})
          {filteredProperties.length < allProperties.length && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              ({filteredProperties.length} on map)
            </Typography>
          )}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : allProperties.length > 0 ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2,
                mb: 3,
              }}
            >
              {allProperties.slice((currentPage - 1) * RESULTS_PER_PAGE, currentPage * RESULTS_PER_PAGE).map(prop => (
                <Card key={prop._id} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={`${BASE_URL}${prop.images?.[0]?.path || prop.images?.[0]}` || 'https://via.placeholder.com/300x180?text=No+Image'}
                    alt={prop.title}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (prop.latitude && prop.longitude) {
                        setCenter({ lat: prop.latitude, lng: prop.longitude });
                      }
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap>
                      {prop.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" noWrap>
                      {prop.address}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
                      {formatPriceDisplay(prop)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {prop.category} • {prop.type}
                      {!prop.latitude && !prop.longitude && (
                        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                          ⚠ Not on map
                        </Typography>
                      )}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ pt: 0 }}>
                    <Button
                      size="small"
                      onClick={() => navigate(`/property/${prop._id}`)}
                    >
                      View Details
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleWishlist(prop._id)}
                      color={wishlist.includes(prop._id) ? 'error' : 'default'}
                    >
                      {wishlist.includes(prop._id) ? (
                        <FavoriteIcon fontSize="small" />
                      ) : (
                        <FavoriteBorderIcon fontSize="small" />
                      )}
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Box>

            {/* Pagination */}
            {Math.ceil(allProperties.length / RESULTS_PER_PAGE) > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(allProperties.length / RESULTS_PER_PAGE)}
                  page={currentPage}
                  onChange={(_, val) => setCurrentPage(val)}
                />
              </Box>
            )}
          </>
        ) : (
          <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
            No properties found.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
