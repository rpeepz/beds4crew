import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import PropertyCard from "../components/PropertyCard";
import GlobalSearchBar from "../components/GlobalSearchBar";

const categoryTiles = [
  { label: "Apartments", value: "apartment" },
  { label: "Condos", value: "condo" },
  { label: "Houses", value: "house" },
  { label: "Hostels", value: "hostel" },
  { label: "Flats", value: "flat" },
  { label: "Villas", value: "villa" },
  { label: "Shared Beds", value: "shared" },
];

const popularSearches = [
  "Crew-friendly stays",
  "Near airports",
  "Short-term crew housing",
  "City layovers",
  "Verified hosts",
];

export default function DashboardPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/properties`)
      .then((res) => res.json())
      .then((data) => setProperties(data.filter((prop) => prop.isActive !== false)))
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(() => properties.slice(0, 8), [properties]);
  const trending = useMemo(() => properties.slice(4, 12), [properties]);
  const recommended = useMemo(() => properties.slice(8, 16), [properties]);

  const handleSearchSubmit = ({ query, category }) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (category) params.set("category", category);
    navigate(`/properties${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <Box>
      <Box
        sx={{
          background: "linear-gradient(120deg, rgba(29,191,115,0.15), rgba(14,116,144,0.1))",
          borderBottom: 1,
          borderColor: "divider",
          py: { xs: 6, md: 10 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 } }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            Find trusted crew stays and experiences in minutes.
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            Fast discovery, verified hosts, and booking confidence for every itinerary.
          </Typography>
          <GlobalSearchBar onSubmit={handleSearchSubmit} />
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            {popularSearches.map((item) => (
              <Chip
                key={item}
                label={item}
                onClick={() => handleSearchSubmit({ query: item, category: "" })}
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>
      </Box>

      <Box sx={commonStyles.contentContainer}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Browse by category
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {categoryTiles.map((tile) => (
            <Card
              key={tile.value}
              sx={{ p: 2.5, cursor: "pointer", textAlign: "center", borderRadius: 3, boxShadow: 1 }}
              onClick={() => navigate(`/properties?category=${tile.value}`)}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tile.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Explore stays
              </Typography>
            </Card>
          ))}
        </Box>
      </Box>

      <Box sx={commonStyles.contentContainer}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Popular services
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: { xs: "80%", sm: "45%", md: "28%" },
            gap: 2,
            overflowX: "auto",
            pb: 1,
          }}
        >
          {(loading ? Array.from({ length: 4 }) : featured).map((item, index) => (
            <Box key={item?._id || index}>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : (
                <PropertyCard property={item} showWishlist={!!user?.id} />
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={commonStyles.contentContainer}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                How it works
              </Typography>
              <Stack spacing={2}>
                {[
                  "Search and filter listings fast",
                  "Compare verified hosts and reviews",
                  "Book instantly with transparent pricing",
                ].map((step, idx) => (
                  <Box key={step} display="flex" gap={2} alignItems="center">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: "primary.main",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </Box>
                    <Typography variant="body2">{step}</Typography>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, borderRadius: 3, boxShadow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Become a trusted seller
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Showcase your listings, highlight your reliability, and grow bookings with confidence.
              </Typography>
              <Button variant="contained" onClick={() => navigate("/add-property")}
              >
                Start hosting
              </Button>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={commonStyles.contentContainer}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Recommended for you
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: { xs: "80%", sm: "45%", md: "28%" },
            gap: 2,
            overflowX: "auto",
            pb: 1,
          }}
        >
          {(loading ? Array.from({ length: 4 }) : recommended).map((item, index) => (
            <Box key={item?._id || index}>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : (
                <PropertyCard property={item} showWishlist={!!user?.id} />
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={commonStyles.contentContainer}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Trending now
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: { xs: "80%", sm: "45%", md: "28%" },
            gap: 2,
            overflowX: "auto",
            pb: 1,
          }}
        >
          {(loading ? Array.from({ length: 4 }) : trending).map((item, index) => (
            <Box key={item?._id || index}>
              {loading ? (
                <Skeleton variant="rounded" height={280} />
              ) : (
                <PropertyCard property={item} showWishlist={!!user?.id} />
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={commonStyles.contentContainer}>
        <Grid container spacing={3}>
          {[{
            title: "Early marketplace",
            value: "Launch phase",
            subtitle: "Listings are growing daily as new hosts join.",
          }, {
            title: "Built for crews",
            value: "Crew-first",
            subtitle: "Short stays, flexible check-in, and fast discovery.",
          }, {
            title: "Support-led",
            value: "Human help",
            subtitle: "Direct assistance while we scale the platform.",
          }].map((stat) => (
            <Grid item xs={12} md={4} key={stat.title}>
              <Card sx={{ p: 3, borderRadius: 3, boxShadow: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {stat.title}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.subtitle}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
