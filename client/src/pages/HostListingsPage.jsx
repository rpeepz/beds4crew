import React, { useEffect, useState } from "react";
import { Box, Typography, Grid, TextField, MenuItem } from "@mui/material";
import PropertyCard from "../components/PropertyCard";
import { LoadingState, NoListings } from "../components/EmptyState";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function HostListingsPage() {
  const [properties, setProperties] = useState([]);
  const [sortedProperties, setSortedProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("title-asc");
  const snackbar = useSnackbar();

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    let sorted = [...properties];

    switch (sortBy) {
      case "price-low-high":
        sorted.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));
        break;
      case "price-high-low":
        sorted.sort((a, b) => (b.pricePerNight || 0) - (a.pricePerNight || 0));
        break;
      case "title-asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "status-active":
        sorted.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
        break;
      case "status-inactive":
        sorted.sort((a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));
        break;
      default:
        sorted.sort((a, b) => a.title.localeCompare(b.title));
    }

    setSortedProperties(sorted);
  }, [properties, sortBy]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/properties/mine`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      snackbar("Failed to load properties", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your listings..." />;
  }

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" sx={commonStyles.pageTitle}>
        My Listings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={commonStyles.sectionSpacing}>
        Manage your properties and configure rooms/beds to activate them for bookings.
      </Typography>
      
      {/* Sorting Controls */}
      {properties.length > 0 && (
        <Box sx={commonStyles.sectionSpacing}>
          <TextField
            select
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 220 } }}
            size="small"
          >
            <MenuItem value="title-asc">Title (A-Z)</MenuItem>
            <MenuItem value="title-desc">Title (Z-A)</MenuItem>
            <MenuItem value="price-low-high">Price (Low to High)</MenuItem>
            <MenuItem value="price-high-low">Price (High to Low)</MenuItem>
            <MenuItem value="status-active">Status (Active First)</MenuItem>
            <MenuItem value="status-inactive">Status (Inactive First)</MenuItem>
          </TextField>
        </Box>
      )}
      
      {sortedProperties.length > 0 ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {sortedProperties.map(prop => (
            <Grid item xs={12} sm={6} md={4} key={prop._id}>
              <PropertyCard
                property={prop}
                showStatus={true}
                showRoomCount={true}
                showWishlist={false}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <NoListings />
      )}
    </Box>
  );
}
