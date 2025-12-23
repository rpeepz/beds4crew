import React from "react";
import { Card, CardMedia, CardContent, CardActions, Typography, Button, Chip, IconButton, Box } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useNavigate } from "react-router-dom";
import { formatPriceDisplay, BASE_URL } from "../utils/api";
import { commonStyles, CARD_IMAGE_HEIGHT } from "../utils/styleConstants";

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

  return (
    <Card sx={{ ...commonStyles.card, cursor: "pointer" }} onClick={handleCardClick}>
      <CardMedia
        component="img"
        height={CARD_IMAGE_HEIGHT.medium}
        image={
          property.images?.[0]
            ? `${BASE_URL}${property.images[0].path || property.images[0]}`
            : "https://via.placeholder.com/400x300?text=No+Image"
        }
        alt={property.title}
        sx={{ objectFit: "cover" }}
      />
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="h3" sx={{ flex: 1, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            {property.title}
          </Typography>
          {showStatus && (
            <Chip
              label={property.isActive ? "Active" : "Inactive"}
              color={property.isActive ? "success" : "default"}
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {property.category} • {property.type}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" noWrap>
          {property.address || `${property.city}, ${property.country}`}
        </Typography>
        
        <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
          {formatPriceDisplay(property)}
          {property.maxGuests && ` • ${property.maxGuests} guests`}
        </Typography>
        
        {property.facilities?.length > 0 && (
          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ mt: 0.5 }}>
            {property.facilities.slice(0, 3).join(" • ")}
          </Typography>
        )}
        
        {showRoomCount && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {property.rooms?.length || 0} room{property.rooms?.length !== 1 ? "s" : ""} configured
          </Typography>
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
        <Button 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/property/${property._id}`);
          }}
        >
          View Details
        </Button>
        
        {showWishlist && onWishlistToggle && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onWishlistToggle(property._id);
            }}
            color={isWishlisted ? "error" : "default"}
          >
            {isWishlisted ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        )}
      </CardActions>
    </Card>
  );
}
