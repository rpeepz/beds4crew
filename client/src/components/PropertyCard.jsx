import React from "react";
import { Card, CardMedia, CardContent, Typography, Chip, IconButton, Box, Avatar } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useNavigate } from "react-router-dom";
import { formatPriceDisplay } from "../utils/api";
import RatingStars from "./RatingStars";
import { commonStyles, CARD_IMAGE_HEIGHT } from "../utils/styleConstants";
import { formatImageUrl, getListingMetrics } from "../utils/helpers";

export default function PropertyCard({ 
  property, 
  onWishlistToggle, 
  isWishlisted, 
  showStatus = false,
  showRoomCount = false,
  showDelete = false,
  onDelete,
  showWishlist = true
}) {
  const navigate = useNavigate();

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('button')) return;
    navigate(`/property/${property._id}`);
  };

  const metrics = getListingMetrics(property);
  const hasRating = typeof metrics.rating === "number" && typeof metrics.reviews === "number";

  return (
    <Card sx={{ ...commonStyles.card, cursor: "pointer", overflow: "hidden" }} onClick={handleCardClick}>
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          height={CARD_IMAGE_HEIGHT.large}
          loading="lazy"
          image={
            property.images?.[0]
              ? formatImageUrl(property.images[0].path || property.images[0])
              : "https://via.placeholder.com/400x300?text=No+Image"
          }
          alt={property.title}
          sx={{ objectFit: "cover" }}
        />
        {(metrics.sellerLevel || metrics.isVerified) && (
          <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1 }}>
            {metrics.sellerLevel && (
              <Chip
                label={metrics.sellerLevel}
                size="small"
                sx={{ backgroundColor: "rgba(255,255,255,0.9)", fontWeight: 600 }}
              />
            )}
            {metrics.isVerified && (
              <Chip
                label="Verified"
                size="small"
                color="success"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        )}
        {showWishlist && onWishlistToggle && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onWishlistToggle(property._id);
            }}
            sx={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(255,255,255,0.9)" }}
            color={isWishlisted ? "error" : "default"}
            aria-label={isWishlisted ? "Remove from favorites" : "Save to favorites"}
          >
            {isWishlisted ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 1.2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 28, height: 28 }}>{property.title?.[0] || "S"}</Avatar>
          <Typography variant="caption" color="text.secondary">
            {property.ownerHost?.firstName ? `${property.ownerHost.firstName} ${property.ownerHost.lastName || ""}` : "Verified Host"}
          </Typography>
          {showStatus && (
            <Chip
              label={property.isActive ? "Active" : "Inactive"}
              color={property.isActive ? "success" : "default"}
              size="small"
              sx={{ ml: "auto" }}
            />
          )}
        </Box>
        <Typography
          variant="subtitle1"
          component="h3"
          sx={{
            fontWeight: 600,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 48,
          }}
        >
          {property.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {property.city}, {property.country}
        </Typography>
        {hasRating && <RatingStars value={metrics.rating} count={metrics.reviews} />}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {formatPriceDisplay(property)}
          </Typography>
          {showRoomCount && (
            <Typography variant="caption" color="text.secondary">
              {property.rooms?.length || 0} room{property.rooms?.length !== 1 ? "s" : ""}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
