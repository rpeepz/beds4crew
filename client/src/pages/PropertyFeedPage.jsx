import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Drawer,
  Button,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
  Select,
  InputLabel,
  FormControl,
  Divider,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useLocation, useSearchParams } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import { NoPropertiesFound } from "../components/EmptyState";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import { getListingMetrics } from "../utils/helpers";

export default function PropertyFeedPage() {
  const [properties, setProperties] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [minRating, setMinRating] = useState(0);
  const [instantBook, setInstantBook] = useState(false);
  const [sortBy, setSortBy] = useState("best");
  const [visibleCount, setVisibleCount] = useState(12);
  const [gridColumns, setGridColumns] = useState(3);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const location = useLocation();
  const snackbar = useSnackbar();
  const gridOptions = [10, 5, 3, 2, 1];
  
  // Fetch user's wishlist on mount and when navigating to this page
  useEffect(() => {
    if (!user?.id) return;
    fetchWithAuth(`${API_URL}/auth/me`)
        .then(res => res.json())
        .then(data => setWishlist(data.wishList || []))
        .catch(() => {});
  }, [user.id, location.pathname]);

  const handleToggleWishlist = async (propertyId) => {
    if (!user?.id) {
      snackbar("Must be logged in to add to your wishlist", "error");
      return;
    }
    const inWishlist = wishlist.includes(propertyId);
    const method = inWishlist ? "DELETE" : "POST";
    const res = await fetchWithAuth(`${API_URL}/properties/${propertyId}/wishlist`, {
      method: method
    });
    if (res.ok) {
      if (inWishlist) {
        snackbar("Property removed from wishlist", "info");
        setWishlist(prev => prev.filter(id => id !== propertyId));
      } else {
        snackbar("Property wishlisted", "info");
        setWishlist(prev => [...prev, propertyId]);
      }
    }
  };

  // Fetch all properties on mount and when navigating to this page
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/properties`)
      .then(res => res.json())
      .then(data => {
        const activeProperties = data.filter(prop => prop.isActive !== false);
        setProperties(activeProperties);
      })
      .finally(() => setLoading(false));
  }, [location.pathname]);

  useEffect(() => {
    const initialQuery = searchParams.get("query") || "";
    const initialCategory = searchParams.get("category") || "";
    setQuery(initialQuery);
    setCategory(initialCategory);
  }, [searchParams]);

  useEffect(() => {
    if (properties.length) {
      const prices = properties.map((p) => p.pricePerNight || 0);
      const upper = Math.max(...prices, 1000);
      setMaxPrice(upper);
      setPriceRange([0, upper]);
    }
  }, [properties]);

  const enrichedProperties = useMemo(
    () => properties.map((prop) => ({ ...prop, _metrics: getListingMetrics(prop) })),
    [properties]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = enrichedProperties.filter((prop) => {
      const matchTerm =
        !term ||
        [prop.title, prop.address, prop.category, prop.type, prop.description, prop.city, prop.country]
          .some((field) => (field || "").toLowerCase().includes(term));
      const matchCategory = !category || prop.category === category;
      const matchType = !type || prop.type === type;
      const matchPrice = (prop.pricePerNight || 0) >= priceRange[0] && (prop.pricePerNight || 0) <= priceRange[1];
      const matchRating = minRating <= 0 ? true : (typeof prop._metrics.rating === "number" && prop._metrics.rating >= minRating);
      const matchInstant = !instantBook || prop.isActive;
      return matchTerm && matchCategory && matchType && matchPrice && matchRating && matchInstant;
    });

    switch (sortBy) {
      case "priceLow":
        return [...base].sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));
      case "priceHigh":
        return [...base].sort((a, b) => (b.pricePerNight || 0) - (a.pricePerNight || 0));
      case "rating":
        return [...base].sort((a, b) => b._metrics.rating - a._metrics.rating);
      default:
        return base;
    }
  }, [enrichedProperties, query, category, type, priceRange, minRating, instantBook, sortBy]);

  const visibleListings = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    setVisibleCount(12);
  }, [query, category, type, priceRange, minRating, instantBook, sortBy]);

  const activeFilters = useMemo(() => {
    const items = [];
    if (category) {
      items.push({ key: "category", label: `Category: ${category.charAt(0).toUpperCase()}${category.slice(1)}` });
    }
    if (type) {
      const typeLabel =
        type === "private" ? "Private Room" : type === "bed" ? "Individual Bed" : "Accommodation";
      items.push({ key: "type", label: `Type: ${typeLabel}` });
    }
    return items;
  }, [category, type]);

  const filterPanel = (
    <Box sx={{ width: { xs: 280, md: 300 }, p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        Filters
      </Typography>
      <TextField
        label="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      />
      <TextField
        select
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        <MenuItem value="">All categories</MenuItem>
        <MenuItem value="apartment">Apartments</MenuItem>
        <MenuItem value="condo">Condos</MenuItem>
        <MenuItem value="house">Houses</MenuItem>
        <MenuItem value="hostel">Hostels</MenuItem>
        <MenuItem value="flat">Flats</MenuItem>
        <MenuItem value="villa">Villas</MenuItem>
      </TextField>
      <TextField
        select
        label="Type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        <MenuItem value="">Any</MenuItem>
        <MenuItem value="accommodation">Accommodation</MenuItem>
        <MenuItem value="private">Private Room</MenuItem>
        <MenuItem value="bed">Individual Bed</MenuItem>
      </TextField>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        Price range
      </Typography>
      <Slider
        value={priceRange}
        min={0}
        max={maxPrice}
        onChange={(_, value) => setPriceRange(value)}
        valueLabelDisplay="auto"
      />
      <Typography variant="caption" color="text.secondary">
        ${priceRange[0]} - ${priceRange[1]}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        Minimum rating
      </Typography>
      <Slider
        value={minRating}
        min={0}
        max={5}
        step={0.1}
        onChange={(_, value) => setMinRating(value)}
        valueLabelDisplay="auto"
      />
      <Divider sx={{ my: 2 }} />
      <FormControlLabel
        control={<Switch checked={instantBook} onChange={(e) => setInstantBook(e.target.checked)} />}
        label="Instant book only"
      />
    </Box>
  );

  return (
    <Box sx={commonStyles.contentContainer}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={commonStyles.pageTitle}>
            Explore listings
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {filtered.length} results
            </Typography>
            {activeFilters.length > 0 ? (
              activeFilters.map((filter) => (
                <Chip key={filter.key} size="small" label={filter.label} variant="outlined" />
              ))
            ) : (
              <Typography variant="caption" color="text.secondary">
                No filters applied
              </Typography>
            )}
          </Stack>
        </Box>
        <Button variant="outlined" onClick={() => setFiltersOpen(true)} sx={{ display: { xs: "inline-flex", md: "none" } }}>
          Filters
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" }, gap: 3 }}>
        <Box sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 96, alignSelf: "flex-start" }}>
          {filterPanel}
        </Box>
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="sort-by-label">Sort by</InputLabel>
              <Select
                labelId="sort-by-label"
                value={sortBy}
                label="Sort by"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="best">Best match</MenuItem>
                <MenuItem value="rating">Highest rated</MenuItem>
                <MenuItem value="priceLow">Price: low to high</MenuItem>
                <MenuItem value="priceHigh">Price: high to low</MenuItem>
              </Select>
            </FormControl>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="body2" color="text.secondary">
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

          {loading ? (
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Skeleton variant="rounded" height={320} />
                </Grid>
              ))}
            </Grid>
          ) : filtered.length > 0 ? (
            <Box
              sx={(theme) => ({
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-start",
                gap: theme.spacing(3),
              })}
            >
              {visibleListings.map((prop) => (
                <Box
                  key={prop._id}
                  sx={(theme) => ({
                    flex: `1 1 calc((100% - (${theme.spacing(3)} * ${gridColumns - 1})) / ${gridColumns})`,
                    minWidth: 0,
                  })}
                >
                  <PropertyCard
                    property={prop}
                    onWishlistToggle={handleToggleWishlist}
                    isWishlisted={wishlist.includes(prop._id)}
                    showWishlist={!!user?.id}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <NoPropertiesFound />
          )}
          {!loading && visibleListings.length < filtered.length && (
            <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => setVisibleCount((prev) => prev + 12)}>
                Load more
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Drawer anchor="left" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        {filterPanel}
      </Drawer>
    </Box>
  );
}
