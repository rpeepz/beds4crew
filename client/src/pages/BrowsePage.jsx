import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Avatar,
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
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Collapse,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ClearIcon from '@mui/icons-material/Clear';

import { commonStyles } from "../utils/styleConstants";
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
  const [sortBy, setSortBy] = useState('recommended');
  const [showMap, setShowMap] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [gridColumns, setGridColumns] = useState(3);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationInput, setLocationInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const snackbar = useSnackbar();
  const gridOptions = [10, 5, 3, 2, 1];
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const mapSectionRef = useRef(null);
  const resultsListRef = useRef(null);

  // Fetch user's wishlist
  useEffect(() => {
    if (!user?.id) return;
    fetchWithAuth(`${API_URL}/auth/me`)
      .then(res => res.json())
      .then(data => setWishlist(data.wishList || []))
      .catch(err => console.error('Failed to fetch wishlist:', err));
  }, [user.id]);

  // No initial load - properties are only loaded via date search
  useEffect(() => {
    setLoading(false);
  }, []);

  // Restore saved search state if returning from property details
  useEffect(() => {
    const savedState = sessionStorage.getItem('browseSearchState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.startDate) setStartDate(dayjs(state.startDate));
        if (state.endDate) setEndDate(dayjs(state.endDate));
        if (state.center) setCenter(state.center);
        if (state.radius) setRadius(state.radius);
        if (state.properties) setAllProperties(state.properties);
        if (state.sortBy) setSortBy(state.sortBy);
        if (state.gridColumns) setGridColumns(state.gridColumns);
        if (state.locationInput) setLocationInput(state.locationInput);
        // Clear the saved state after restoring
        sessionStorage.removeItem('browseSearchState');
      } catch (err) {
        console.error('Failed to restore search state:', err);
      }
    }
  }, []);

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

  // All properties for list view
  // Always respect the radius filter - show only properties within radius with coordinates
  const allPropertiesForList = useMemo(() => {
    return filteredPropertiesWithCoords;
  }, [filteredPropertiesWithCoords]);

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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const saveSearchState = () => {
    const state = {
      startDate: startDate?.format('YYYY-MM-DD'),
      endDate: endDate?.format('YYYY-MM-DD'),
      center,
      radius,
      properties: allProperties,
      sortBy,
      gridColumns,
      locationInput,
    };
    sessionStorage.setItem('browseSearchState', JSON.stringify(state));
  };

  const handleResultFocus = (property) => {
    if (!showMap) {
      setShowMap(true);
    }
    if (property.latitude && property.longitude) {
      setCenter({ lat: property.latitude, lng: property.longitude });
    }
    setSelectedPropertyId(property._id);
    window.requestAnimationFrame(() => {
      const headerEl = document.querySelector('header, .MuiAppBar-root');
      const headerOffset = headerEl?.getBoundingClientRect().height || 0;
      const mapEl = mapSectionRef.current;
      if (!mapEl) return;
      const mapTop = mapEl.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(mapTop - headerOffset - 12, 0),
        behavior: 'smooth',
      });
    });
  };

  const renderResultCard = (prop) => (
    <Card 
      key={prop._id} 
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer' }}
      onClick={() => handleResultFocus(prop)}
    >
      <CardMedia
        component="img"
        height="180"
        image={formatImageUrl(prop.images?.[0]?.path || prop.images?.[0]) || 'https://picsum.photos/300/180?random=1'}
        alt={prop.title}
      />
            <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 1.2 }}>
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar
                    sx={{ width: 32, height: 32, fontSize: 14 }}
                    src={prop.ownerHost?.profileImagePath || ""}
                    alt={prop.ownerHost?.firstName || "Host"}
                  >
                    {prop.ownerHost?.firstName?.[0] || "H"}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {prop.ownerHost?.firstName ? `${prop.ownerHost.firstName} ${prop.ownerHost.lastName || ""}` : "Verified Host"}
                  </Typography>

                </Box>
                <Typography variant="body2" color="text.secondary">{prop.city}, {prop.country}</Typography>
              </Box>
      </CardContent>
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" noWrap title={prop.title}>
          {prop.title}
        </Typography>
        <Typography variant="body2" color="textSecondary" noWrap>
          {prop.address}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
          {prop.lowestPrice ? `$${prop.lowestPrice}/night` : formatPriceDisplay(prop)}
        </Typography>
        {prop.availableBeds !== undefined && (
          <Typography variant="body2" color="primary.main" sx={{ mt: 0.5, fontWeight: 600 }}>
            {prop.availableBeds} {prop.availableBeds === 1 ? 'bed' : 'beds'} available
          </Typography>
        )}
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
          onClick={(e) => {
            e.stopPropagation();
            saveSearchState();
            navigate(`/property/${prop._id}`);
          }}
        >
          View Details
        </Button>
        <Tooltip title={wishlist.includes(prop._id) ? 'Remove from wishlist' : 'Add to wishlist'}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleWishlist(prop._id);
            }}
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
  );

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

  // Debounced location search for autocomplete
  useEffect(() => {
    if (!locationInput || locationInput.length < 3) {
      setLocationOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(`${API_URL}/geocoding/search?q=${encodeURIComponent(locationInput)}`);
        const data = await res.json();
        if (data.lat && data.lon) {
          setLocationOptions([{
            label: data.display_name || locationInput,
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lon)
          }]);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      } finally {
        setGeocoding(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationInput]);

  // Search by date range
  const handleDateSearch = async () => {
    if (!startDate || !endDate) {
      snackbar('Please select both start and end dates', 'warning');
      return;
    }

    if (endDate.isBefore(startDate)) {
      snackbar('End date must be after start date', 'error');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: center.lat.toString(),
        lng: center.lng.toString(),
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        radius: radius.toString(),
        minPrice: '0',
        maxPrice: '10000',
        minBeds: '1',
      });

      const res = await fetch(`${API_URL}/properties/date-finder?${params.toString()}`);
      const data = await res.json();
      
      if (res.ok) {
        setAllProperties(data.properties || []);
        setCurrentPage(1);
        
        // Select first property and scroll to results
        if (data.properties.length > 0) {
          setSelectedPropertyId(data.properties[0]._id);
          setTimeout(() => {
            const headerEl = document.querySelector('header, .MuiAppBar-root');
            const headerOffset = headerEl?.getBoundingClientRect().height || 0;
            const resultsEl = resultsListRef.current;
            if (resultsEl) {
              const resultsTop = resultsEl.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({
                top: Math.max(resultsTop - headerOffset - 20, 0),
                behavior: 'smooth',
              });
            }
          }, 100);
        }
        
        if (data.properties.length === 0) {
          snackbar('No available properties found for those dates', 'info');
        } else {
          snackbar(`Found ${data.properties.length} available propert${data.properties.length === 1 ? 'y' : 'ies'}`, 'success');
        }
      } else {
        snackbar(data.message || 'Search failed', 'error');
      }
    } catch (err) {
      console.error('Date search error:', err);
      snackbar('Failed to search by dates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setCenter(DEFAULT_LOCATION);
    setRadius(DEFAULT_RADIUS_MILES);
    setSearchQuery('');
    setShowCustomSearch(false);
    setSortBy('recommended');
    setCurrentPage(1);
    setStartDate(null);
    setEndDate(null);
    setLocationInput('');
    // Reload all properties
    setLoading(true);
    fetch(`${API_URL}/properties`)
      .then(res => res.json())
      .then(data => {
        const activeProps = data.filter(p => p.isActive !== false);
        setAllProperties(activeProps);
      })
      .finally(() => setLoading(false));
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
          <Typography variant="h4" sx={commonStyles.pageTitle}>
            Search Beds By Date
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search by location, adjust radius, and refine results.
          </Typography>
        </Box>
      </Box>
      {/* <FormControlLabel
        control={<Switch checked={showMap} onChange={(e) => setShowMap(e.target.checked)} />}
        label={showMap ? 'Map' : 'Map off'}
      />
      <FormControlLabel
        control={<Switch checked={showControls} onChange={(e) => setShowControls(e.target.checked)} />}
        label={showControls ? 'Controls' : 'Controls off'}
      /> */}

      {/* Controls Section */}
      {showControls && (
        <Card sx={{ p: 2, mb: 3 }}>
          {/* Date Search Section */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Search Available Properties by Date
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <DatePicker
                label="Check-in Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                minDate={dayjs()}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              <DatePicker
                label="Check-out Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                minDate={startDate || dayjs()}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Box>
            <Button
              variant="contained"
              fullWidth
              onClick={handleDateSearch}
              disabled={!startDate || !endDate || loading}
            >
              {loading ? 'Searching...' : 'Search Available Properties'}
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            {/* Location Search with Autocomplete */}
            <Autocomplete
              freeSolo
              options={[...POPULAR_LOCATIONS, ...locationOptions]}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
              inputValue={locationInput}
              onInputChange={(e, value) => setLocationInput(value)}
              onChange={(e, value) => {
                if (value && typeof value === 'object') {
                  setCenter({ lat: value.lat, lng: value.lng });
                  setCurrentPage(1);
                }
              }}
              loading={geocoding}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Location"
                  placeholder="City or ZIP code"
                  helperText="Type to search cities or ZIP codes"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {geocoding ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

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
          {/* Stats */}
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip label={`${allPropertiesForList.length} total`} variant="outlined" />
            <Chip label={`${filteredPropertiesWithCoords.length} within ${radius} miles`} variant="outlined" />
            {startDate && endDate && (
              <Chip 
                label={`${startDate.format('MMM D')} - ${endDate.format('MMM D')}`} 
                color="primary"
                onDelete={() => {
                  setStartDate(null);
                  setEndDate(null);
                  handleResetFilters();
                }}
              />
            )}
            <Box sx={{ ml: 'auto' }}>
              <Button size="small" variant="outlined" onClick={handleResetFilters}>
                Reset All
              </Button>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {loading ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : (
              <>
                {sortedProperties.length} results
                {startDate && endDate && <Typography variant="caption" component="span" sx={{ ml: 1, color: 'primary.main' }}>(showing available properties for selected dates)</Typography>}
              </>
            )}
          </Typography>

        </Card>
      )}

      {/* Map Section */}
      {showMap && (
        <Card ref={mapSectionRef} sx={{ height: 'auto', overflow: 'hidden', mb: 3 }}>
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
              selectedPropertyId={selectedPropertyId}
              onPropertyClick={(id) => {
                saveSearchState();
                navigate(`/property/${id}`);
              }}
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
      <Box ref={resultsListRef}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Typography variant="h6">
            Results ({sortedProperties.length})
          </Typography>
          <Box>
            <Typography variant="body2" gutterBottom>
              Results per row
            </Typography>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={gridColumns}
              onChange={(_, value) => {
                if (value) setGridColumns(value);
              }}
            >
              {gridOptions.map((option) => (
                <ToggleButton key={option} value={option}>
                  {option}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : paginatedProperties.length > 0 ? (
          <>
            <Box
              sx={(theme) => ({
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                gap: theme.spacing(3),
                mb: 3,
              })}
            >
              {paginatedProperties.map((prop) => (
                <Box
                  key={prop._id}
                  sx={(theme) => ({
                    flex: `1 1 calc((100% - (${theme.spacing(3)} * ${gridColumns - 1})) / ${gridColumns})`,
                    minWidth: 0,
                  })}
                >
                  {renderResultCard(prop)}
                </Box>
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
