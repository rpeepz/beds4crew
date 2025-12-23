import React, { useEffect, useState } from "react";
import { Box, Typography, Grid } from "@mui/material";
import { useLocation } from "react-router-dom";
import PropertySearchBar from "../components/PropertySearchBar";
import PropertyCard from "../components/PropertyCard";
import { LoadingState, NoPropertiesFound } from "../components/EmptyState";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function PropertyFeedPage() {
  const [properties, setProperties] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const location = useLocation();
  const snackbar = useSnackbar();
  
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

  if (loading) {
    return <LoadingState message="Loading properties..." />;
  }

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" sx={commonStyles.pageTitle}>
        Browse Properties
      </Typography>
      
      <PropertySearchBar properties={properties} onFilter={setFiltered} />
      
      {filtered.length > 0 ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {filtered.map(prop => (
            <Grid item xs={12} sm={6} md={4} key={prop._id}>
              <PropertyCard
                property={prop}
                onWishlistToggle={handleToggleWishlist}
                isWishlisted={wishlist.includes(prop._id)}
                showWishlist={!!user?.id}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <NoPropertiesFound />
      )}
    </Box>
  );
}
