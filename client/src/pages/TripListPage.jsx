import React, { useEffect, useState } from "react";
import { 
  Box, Typography, Card, CardContent, CardMedia, Grid, Chip, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, 
  ListItem, ListItemText, Divider, Avatar, ListItemAvatar, Badge, Alert,
  Collapse, IconButton
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LoadingState, NoTrips } from "../components/EmptyState";
import { fetchWithAuth, API_URL, BASE_URL } from "../utils/api";
import { commonStyles, CARD_IMAGE_HEIGHT } from "../utils/styleConstants";

export default function TripListPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = () => {
    setLoading(true);
    fetchWithAuth(`${API_URL}/bookings/guest`)
      .then(res => res.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  };

  const handleOpenDialog = async (bookingId) => {
    const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}`);
    const booking = await res.json();
    setSelectedBooking(booking);
    setDialogOpen(true);
    
    // Mark as read by guest
    if (booking.unreadByGuest) {
      await fetchWithAuth(`${API_URL}/bookings/${bookingId}/mark-read`, {
        method: "PUT"
      });
      // Refresh bookings to update badge
      loadBookings();
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    await fetchWithAuth(`${API_URL}/bookings/${selectedBooking._id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: messageText })
    });
    
    setMessageText("");
    const res = await fetchWithAuth(`${API_URL}/bookings/${selectedBooking._id}`);
    const updated = await res.json();
    setSelectedBooking(updated);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    
    await fetchWithAuth(`${API_URL}/bookings/${bookingId}/cancel`, {
      method: "PUT"
    });
    
    loadBookings();
    setDialogOpen(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "warning";
      case "confirmed": return "success";
      case "cancelled": return "error";
      case "rejected": return "error";
      default: return "default";
    }
  };

  if (loading) {
    return <LoadingState message="Loading your trips..." />;
  }

  // Separate active and archived bookings
  const activeBookings = bookings.filter(bk => bk.status === "pending" || bk.status === "confirmed");
  const archivedBookings = bookings.filter(bk => bk.status === "cancelled" || bk.status === "rejected");

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Your Trips
      </Typography>

      {/* Active Bookings */}
      {activeBookings.length > 0 ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {activeBookings.map(bk => (
            <Grid item xs={12} sm={6} md={4} key={bk._id}>
              <Card sx={commonStyles.card}>
                <CardMedia
                  component="img"
                  height={CARD_IMAGE_HEIGHT.small}
                  image={`${BASE_URL}${bk.property.images?.[0]?.path || bk.property.images?.[0]}`}
                  alt={bk.property.title}
                  sx={{ objectFit: "cover" }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                    {bk.property.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {bk.property.address}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {new Date(bk.startDate).toLocaleDateString()} – {new Date(bk.endDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                    Total: ${bk.totalPrice}
                  </Typography>
                  <Chip 
                    label={bk.status.toUpperCase()} 
                    color={getStatusColor(bk.status)} 
                    size="small" 
                    sx={{ mt: 1 }}
                  />
                  {bk.bookedBeds && bk.bookedBeds.length > 0 && (
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                      Beds: {bk.bookedBeds.map(b => b.bedLabel).join(", ")}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      fullWidth
                      onClick={() => handleOpenDialog(bk._id)}
                    >
                      View Details & Message
                      {bk.unreadByGuest && (
                        <Badge 
                          badgeContent="new" 
                          color="error" 
                          sx={{ ml: 1, '& .MuiBadge-badge': { fontSize: '0.6rem' } }}
                        />
                      )}
                    </Button>
                    {(bk.status === "pending" || bk.status === "confirmed") && (
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="error"
                        fullWidth
                        onClick={() => handleCancelBooking(bk._id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : null}

      {/* Archived Trips Section */}
      {archivedBookings.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Button
            onClick={() => setShowArchived(!showArchived)}
            endIcon={
              <ExpandMoreIcon 
                sx={{ 
                  transform: showArchived ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }} 
              />
            }
            sx={{ mb: 2 }}
          >
            <Typography variant="h6">
              Archived Trips ({archivedBookings.length})
            </Typography>
          </Button>
          
          <Collapse in={showArchived}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {archivedBookings.map(bk => (
                <Grid item xs={12} sm={6} md={4} key={bk._id}>
                  <Card sx={{ ...commonStyles.card, opacity: 0.8 }}>
                    <CardMedia
                      component="img"
                      height={CARD_IMAGE_HEIGHT.small}
                      image={`${BASE_URL}${bk.property.images?.[0]?.path || bk.property.images?.[0]}`}
                      alt={bk.property.title}
                      sx={{ objectFit: "cover", filter: "grayscale(30%)" }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                        {bk.property.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {bk.property.address}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {new Date(bk.startDate).toLocaleDateString()} – {new Date(bk.endDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                        Total: ${bk.totalPrice}
                      </Typography>
                      <Chip 
                        label={bk.status.toUpperCase()} 
                        color={getStatusColor(bk.status)} 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                      {bk.bookedBeds && bk.bookedBeds.length > 0 && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                          Beds: {bk.bookedBeds.map(b => b.bedLabel).join(", ")}
                        </Typography>
                      )}
                      <Box sx={{ mt: 2 }}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          fullWidth
                          onClick={() => handleOpenDialog(bk._id)}
                        >
                          View Details
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </Box>
      )}

      {bookings.length === 0 && (
        <NoTrips />
      )}

      {/* Booking Details & Messaging Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedBooking && (
          <>
            <DialogTitle>
              Booking Details
              <Chip 
                label={selectedBooking.status.toUpperCase()} 
                color={getStatusColor(selectedBooking.status)} 
                size="small" 
                sx={{ ml: 2 }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                {selectedBooking.property.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedBooking.property.address}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Host: {selectedBooking.host?.firstName} {selectedBooking.host?.lastName}
              </Typography>
              <Typography variant="body2">
                Dates: {new Date(selectedBooking.startDate).toLocaleDateString()} – {new Date(selectedBooking.endDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                Total: ${selectedBooking.totalPrice}
              </Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Messages
              </Typography>
              
              {selectedBooking.messages && selectedBooking.messages.length > 0 ? (
                <List sx={{ maxHeight: 200, overflow: "auto", bgcolor: "background.paper" }}>
                  {selectedBooking.messages.map((msg, idx) => {
                    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                    const isCurrentUser = msg.sender?._id === currentUser.id;
                    const profilePhotoUrl = msg.sender?.profileImagePath || "";
                    
                    return (
                      <ListItem 
                        key={idx} 
                        alignItems="flex-start"
                        sx={{
                          bgcolor: isCurrentUser 
                            ? (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.300'
                            : (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.200',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar src={profilePhotoUrl}>
                            {!profilePhotoUrl && <PersonIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="caption" color="text.secondary">
                              {msg.sender?.firstName || "User"} - {new Date(msg.timestamp).toLocaleString()}
                            </Typography>
                          }
                          secondary={msg.text}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No messages yet</Typography>
              )}

              {selectedBooking.status !== "rejected" && selectedBooking.status !== "cancelled" ? (
                <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message to the host..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button variant="contained" onClick={handleSendMessage}>
                    Send
                  </Button>
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Messaging is disabled for {selectedBooking.status} bookings.
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
