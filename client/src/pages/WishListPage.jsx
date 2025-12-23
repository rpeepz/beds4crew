import React, { useEffect, useState } from "react";
import { Box, Typography, Grid } from "@mui/material";
import { useLocation } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import { LoadingState, NoWishlist } from "../components/EmptyState";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function WishListPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const snackbar = useSnackbar();

  useEffect(() => {
    async function fetchWishlist() {
      setLoading(true);
      try {
        const userRes = await fetchWithAuth(`${API_URL}/auth/me`);
        const user = await userRes.json();
        if (!user.wishList?.length) {
          setProperties([]);
          return;
        }
        const props = await Promise.all(
          user.wishList.map(pid =>
            fetch(`${API_URL}/properties/${pid}`).then(r => r.json())
          )
        );
        setProperties(props.filter(Boolean));
      } finally {
        setLoading(false);
      }
    }
    fetchWishlist();
  }, [location.pathname]);

  const handleRemove = async (propId) => {
    const res = await fetchWithAuth(`${API_URL}/properties/${propId}/wishlist`, {
      method: "DELETE"
    });
    if (res.ok) {
      setProperties(prev => prev.filter(p => p._id !== propId));
      snackbar("Property removed from wishlist", "info");
    }
  };

  if (loading) {
    return <LoadingState message="Loading wishlist..." />;
  }

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" sx={commonStyles.pageTitle}>
        My Wishlist
      </Typography>
      
      {properties.length > 0 ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {properties.map(prop => (
            <Grid item xs={12} sm={6} md={4} key={prop._id}>
              <PropertyCard
                property={prop}
                onWishlistToggle={handleRemove}
                isWishlisted={true}
                showWishlist={true}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <NoWishlist />
      )}
    </Box>
  );
}
