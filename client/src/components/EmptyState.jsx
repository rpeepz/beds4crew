import React from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { commonStyles } from "../utils/styleConstants";
import InboxIcon from "@mui/icons-material/Inbox";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EventBusyIcon from "@mui/icons-material/EventBusy";

export function EmptyState({ 
  icon: Icon = InboxIcon, 
  title, 
  description, 
  actionLabel, 
  actionHref, 
  actionOnClick 
}) {
  return (
    <Box sx={commonStyles.emptyState}>
      <Icon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
      <Typography variant="h6" gutterBottom color="text.primary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto" }}>
          {description}
        </Typography>
      )}
      {(actionLabel && (actionHref || actionOnClick)) && (
        <Button 
          variant="contained" 
          href={actionHref}
          onClick={actionOnClick}
          sx={{ mt: 2 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

export function LoadingState({ message = "Loading..." }) {
  return (
    <Box sx={{ ...commonStyles.emptyState, py: 8 }}>
      <CircularProgress size={48} />
      <Typography variant="body1" sx={{ mt: 2 }} color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

// Pre-configured empty states for common scenarios
export function NoPropertiesFound() {
  return (
    <EmptyState
      icon={SearchOffIcon}
      title="No properties found"
      description="Try adjusting your search filters or browse all available properties."
    />
  );
}

export function NoListings() {
  return (
    <EmptyState
      icon={HomeWorkIcon}
      title="No listings yet"
      description="Create your first property listing to start hosting guests and earning income."
      actionLabel="Create Property"
      actionHref="/add-property"
    />
  );
}

export function NoWishlist() {
  return (
    <EmptyState
      icon={FavoriteBorderIcon}
      title="Your wishlist is empty"
      description="Start adding properties you love to keep track of them for future bookings."
      actionLabel="Explore Properties"
      actionHref="/properties"
    />
  );
}

export function NoTrips() {
  return (
    <EmptyState
      icon={EventBusyIcon}
      title="No trips found"
      description="You haven't booked any beds yet. Explore our listings to plan your next adventure."
      actionLabel="Explore Properties"
      actionHref="/properties"
    />
  );
}

export function NoReservations() {
  return (
    <EmptyState
      icon={EventBusyIcon}
      title="No reservations yet"
      description="When guests book your properties, their reservations will appear here."
    />
  );
}
