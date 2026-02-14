import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Chip,
  Divider,
  Tooltip,
  Switch,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ClearIcon from '@mui/icons-material/Clear';
import MapView from '../components/HotelMapView';
import { useSnackbar } from '../components/AppSnackbar';
import { fetchWithAuth, formatPriceDisplay, API_URL } from '../utils/api';
import { formatImageUrl } from '../utils/helpers';
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
const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

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
  const [onlyWithCoords, setOnlyWithCoords] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [showMap, setShowMap] = useState(true);
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
        const activeProps = data.filter(p => p.isActive !== false);
        setAllProperties(activeProps);
      })
      .catch(err => {
        console.error('Failed to fetch properties:', err);
        snackbar('Failed to load properties', 'error');
      })
      .finally(() => setLoading(false));
  }, [snackbar]);

  // Calculate distance in miles between two lat/lng points using Haversine formula
  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    // Clamp 'a' to [0, 1] to handle floating-point precision issues
    const clampedA = Math.min(1, Math.max(0, a));
    const c = 2 * Math.asin(Math.sqrt(clampedA));
    return R * c;
  }, []);

  // Calculate distance in meters
  const calculateDistanceMeters = useCallback((lat1, lng1, lat2, lng2) => {
    return calculateDistance(lat1, lng1, lat2, lng2) * 1609.34;
  }, [calculateDistance]);

  // Filter properties within radius (only those with coordinates)
  const filteredPropertiesWithCoords = useMemo(() => {
    return allProperties.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      const distance = calculateDistance(center.lat, center.lng, p.latitude, p.longitude);
      return distance <= radius;
    });
  }, [allProperties, center, radius, calculateDistance]);

  // All properties for list view (including those without coordinates)
  const allPropertiesForList = useMemo(() => {
    return onlyWithCoords ? filteredPropertiesWithCoords : allProperties;
  }, [allProperties, filteredPropertiesWithCoords, onlyWithCoords]);

  // Group properties by proximity (CLUSTER_RADIUS_METERS) - only for map
  const groupedMarkers = useMemo(() => {
    if (!filteredPropertiesWithCoords.length) {
      return [];
    }

    const groups = [];
    const visited = new Set();

    for (let i = 0; i < filteredPropertiesWithCoords.length; i++) {
      if (visited.has(i)) continue;

      const prop = filteredPropertiesWithCoords[i];
      const cluster = [prop];
      visited.add(i);

      // Find all properties within CLUSTER_RADIUS_METERS of this property
      for (let j = i + 1; j < filteredPropertiesWithCoords.length; j++) {
        if (visited.has(j)) continue;
        const otherProp = filteredPropertiesWithCoords[j];
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

    return groups;
  }, [filteredPropertiesWithCoords, calculateDistanceMeters]);

  // Pagination - use all properties
  const sortedProperties = useMemo(() => {
    const list = [...allPropertiesForList];
    if (sortBy === 'price-low') {
      return list.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));
    }
    if (sortBy === 'price-high') {
      return list.sort((a, b) => (b.pricePerNight || 0) - (a.pricePerNight || 0));
    }
    return list;
  }, [allPropertiesForList, sortBy]);

  const totalPages = Math.ceil(sortedProperties.length / RESULTS_PER_PAGE);
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    return sortedProperties.slice(start, start + RESULTS_PER_PAGE);
  }, [sortedProperties, currentPage]);

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

  const handleResetFilters = () => {
    setCenter(DEFAULT_LOCATION);
    setRadius(DEFAULT_RADIUS_MILES);
    setSearchQuery('');
    setShowCustomSearch(false);
    setOnlyWithCoords(false);
    setSortBy('recommended');
    setCurrentPage(1);
  };

  const handleToggleWishlist = async (propertyId) => {
    if (!user?.id) {
      snackbar('Please login to add to wishlist', 'warning');
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h4" mb={0.5}>
            Browse Properties
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search by location, adjust radius, and refine results. Map and list stay in sync.
          </Typography>
        </Box>
        <FormControlLabel
          control={<Switch checked={showMap} onChange={(e) => setShowMap(e.target.checked)} />}
          label={showMap ? 'Map view on' : 'Map view off'}
        />
      </Box>

      {/* Controls Section */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          <TextField
            select
            label="Quick Select Location"
            value={selectedLocation}
            onChange={handleLocationChange}
            fullWidth
            helperText="Choose a popular city"
          >
            {POPULAR_LOCATIONS.map(loc => (
              <MenuItem key={loc.label} value={loc.label}>
                {loc.label}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Typography variant="body2" gutterBottom>
              Search Radius: {radius} miles
            </Typography>
            <Slider
              value={radius}
              onChange={(_, val) => {
                setRadius(val);
                setCurrentPage(1);
              }}
              min={10}
              max={250}
              step={10}
              valueLabelDisplay="auto"
              aria-label="Search radius in miles"
            />
          </Box>

          <TextField
            select
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            fullWidth
            helperText="Order your results"
          >
            {SORT_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {/* Custom Location Search Toggle */}
        <Box sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { xs: 'flex-start', md: 'center' } }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showCustomSearch}
                onChange={(e) => setShowCustomSearch(e.target.checked)}
              />
            }
            label="Search by address or landmark"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={onlyWithCoords}
                onChange={(e) => {
                  setOnlyWithCoords(e.target.checked);
                  setCurrentPage(1);
                }}
              />
            }
            label="Only show properties visible on the map"
          />
          <Button variant="text" onClick={handleResetFilters}>Reset filters</Button>
        </Box>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`${allPropertiesForList.length} total`} variant="outlined" />
          <Chip label={`${filteredPropertiesWithCoords.length} within ${radius} miles`} variant="outlined" />
          {selectedLocation && <Chip label={`Centered on ${selectedLocation}`} />}
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {loading ? (
            <CircularProgress size={20} sx={{ mr: 1 }} />
          ) : (
            <>
              {sortedProperties.length} results
              <br />
              <Typography variant="caption" component="span">
                ({filteredPropertiesWithCoords.length} within {radius} miles)
              </Typography>
            </>
          )}
        </Typography>

       

        {/* Custom Location Search Input */}
        {showCustomSearch && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'flex-start', width: '100%' }}>
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
              fullWidth
              inputProps={{ 'aria-label': 'Search address, city, or landmark' }}
              InputProps={{
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearchQuery('')}
                      edge="end"
                      size="small"
                      aria-label="Clear search input"
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
              sx={{ minWidth: 100, flexShrink: 0 }}
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
          </Box>
        )}
      </Card>

      {/* Map Section */}
      {showMap && (
        <Card sx={{ mb: 3, height: { xs: 360, md: 520 }, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : filteredPropertiesWithCoords.length > 0 ? (
            <MapView
              properties={filteredPropertiesWithCoords}
              groupedMarkers={groupedMarkers}
              center={center}
              radius={radius}
              onPropertyClick={(id) => navigate(`/property/${id}`)}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', p: 3 }}>
              <Typography color="text.secondary" textAlign="center">
                No properties found within {radius} miles.
                <br />
                <Typography variant="caption" component="span">
                  Try increasing the search radius or selecting a different location.
                </Typography>
              </Typography>
            </Box>
          )}
        </Card>
      )}

      {/* Results List Section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Typography variant="h6">
            Results ({sortedProperties.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Showing {paginatedProperties.length} of {sortedProperties.length}
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : paginatedProperties.length > 0 ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2,
                mb: 3,
              }}
            >
              {paginatedProperties.map(prop => (
                <Card key={prop._id} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={formatImageUrl(prop.images?.[0]?.path || prop.images?.[0]) || 'https://via.placeholder.com/300x180?text=No+Image'}
                    alt={prop.title}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (prop.latitude && prop.longitude) {
                        setCenter({ lat: prop.latitude, lng: prop.longitude });
                      }
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap title={prop.title}>
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
                    </Typography>
                    {!prop.latitude || !prop.longitude ? (
                      <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
                        Map pin unavailable
                      </Typography>
                    ) : null}
                  </CardContent>
                  <CardActions sx={{ pt: 0 }}>
                    <Button
                      size="small"
                      onClick={() => navigate(`/property/${prop._id}`)}
                    >
                      View Details
                    </Button>
                    <Tooltip title={wishlist.includes(prop._id) ? 'Remove from wishlist' : 'Add to wishlist'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleWishlist(prop._id)}
                        color={wishlist.includes(prop._id) ? 'error' : 'default'}
                        aria-label={wishlist.includes(prop._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        {wishlist.includes(prop._id) ? (
                          <FavoriteIcon fontSize="small" />
                        ) : (
                          <FavoriteBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              ))}
            </Box>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, val) => setCurrentPage(val)}
                />
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">
              No properties found within {radius} miles of {selectedLocation || 'this location'}.
            </Typography>
            <Button sx={{ mt: 1 }} variant="outlined" onClick={handleResetFilters}>
              Reset filters
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
