import React, { useEffect, useState } from "react";
import { 
  Box, Typography, Card, CardContent, CardMedia, Grid, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, List,
  ListItem, ListItemText, Divider, Alert, Avatar, ListItemAvatar, Badge
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { LoadingState, NoReservations } from "../components/EmptyState";
import { fetchWithAuth, API_URL } from "../utils/api";
import { formatImageUrl } from "../utils/helpers";
import { commonStyles, CARD_IMAGE_HEIGHT } from "../utils/styleConstants";

export default function ReservationListPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = () => {
    setLoading(true);
    fetchWithAuth(`${API_URL}/bookings/host`)
      .then(res => res.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  };

  const handleOpenDialog = async (bookingId) => {
    const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}`);
    const booking = await res.json();
    setSelectedBooking(booking);
    setDialogOpen(true);
    
    // Mark as read by host
    if (booking.unreadByHost) {
      await fetchWithAuth(`${API_URL}/bookings/${bookingId}/mark-read`, {
        method: "PUT"
      });
      // Refresh bookings to update badge
      loadBookings();
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    if (!window.confirm("Confirm this booking? The bed(s) will be marked as unavailable.")) return;
    
    const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}/confirm`, {
      method: "PUT"
    });
    
    if (res.ok) {
      loadBookings();
      if (selectedBooking?._id === bookingId) {
        const updated = await fetchWithAuth(`${API_URL}/bookings/${bookingId}`);
        setSelectedBooking(await updated.json());
      }
    }
  };

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm("Reject this booking request?")) return;
    
    const res = await fetchWithAuth(`${API_URL}/bookings/${bookingId}/reject`, {
      method: "PUT"
    });
    
    if (res.ok) {
      loadBookings();
      if (selectedBooking?._id === bookingId) {
        const updated = await fetchWithAuth(`${API_URL}/bookings/${bookingId}`);
        setSelectedBooking(await updated.json());
      }
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
    return <LoadingState message="Loading reservations..." />;
  }

  const pendingBookings = bookings.filter(b => b.status === "pending" && b.property);
  const confirmedBookings = bookings.filter(b => b.status === "confirmed" && b.property);
  const otherBookings = bookings.filter(b => b.status !== "pending" && b.status !== "confirmed" && b.property);

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" sx={commonStyles.pageTitle}>
        Reservations for My Properties
      </Typography>

      {bookings.length === 0 && <NoReservations />}

      {pendingBookings.length > 0 && (
        <>
          <Alert severity="info" sx={commonStyles.sectionSpacing}>
            You have {pendingBookings.length} pending reservation request{pendingBookings.length > 1 ? 's' : ''} awaiting your response
          </Alert>
          <Typography variant="h6" sx={commonStyles.sectionTitle} color="warning.main">
            Pending Requests
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={commonStyles.sectionSpacing}>
            {pendingBookings.map(bk => (
              <Grid item xs={12} sm={6} md={4} key={bk._id}>
                <Card sx={{ ...commonStyles.card, border: 2, borderColor: "warning.main" }}>
                  <CardMedia
                    component="img"
                    height={CARD_IMAGE_HEIGHT.small}
                    image={formatImageUrl(bk.property?.images?.[0]?.path || bk.property?.images?.[0] || '')}
                    alt={bk.property?.title || 'Property'}
                    sx={{ objectFit: "cover" }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                      {bk.property?.title || 'Property'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Guest: {bk.guest?.firstName} {bk.guest?.lastName}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {new Date(bk.startDate).toLocaleDateString()} – {new Date(bk.endDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                    <Box sx={{ mt: 2, display: "flex", gap: 1, flexDirection: "column" }}>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="success"
                        fullWidth
                        onClick={() => handleConfirmBooking(bk._id)}
                      >
                        Confirm Booking
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="error"
                        fullWidth
                        onClick={() => handleRejectBooking(bk._id)}
                      >
                        Reject
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        fullWidth
                        onClick={() => handleOpenDialog(bk._id)}
                      >
                        Message Guest
                        {bk.unreadByHost && (
                          <Badge 
                            badgeContent="new" 
                            color="error" 
                            sx={{ ml: 1, '& .MuiBadge-badge': { fontSize: '0.6rem' } }}
                          />
                        )}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {confirmedBookings.length > 0 && (
        <>
          <Typography variant="h6" sx={commonStyles.sectionTitle} color="success.main">
            Confirmed Reservations
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={commonStyles.sectionSpacing}>
            {confirmedBookings.map(bk => (
              <Grid item xs={12} sm={6} md={4} key={bk._id}>
                <Card sx={commonStyles.card}>
                  <CardMedia
                    component="img"
                    height={CARD_IMAGE_HEIGHT.small}
                    image={formatImageUrl(bk.property?.images?.[0]?.path || bk.property?.images?.[0] || '')}
                    alt={bk.property?.title || 'Property'}
                    sx={{ objectFit: "cover" }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                      {bk.property?.title || 'Property'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Guest: {bk.guest?.firstName} {bk.guest?.lastName}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {new Date(bk.startDate).toLocaleDateString()} – {new Date(bk.endDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                    <Button 
                      size="small" 
                      variant="outlined"
                      sx={{ mt: 2 }}
                      onClick={() => handleOpenDialog(bk._id)}
                      fullWidth
                    >
                      View Details & Message
                      {bk.unreadByHost && (
                        <Badge 
                          badgeContent="new" 
                          color="error" 
                          sx={{ ml: 1, '& .MuiBadge-badge': { fontSize: '0.6rem' } }}
                        />
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {otherBookings.length > 0 && (
        <>
          <Typography variant="h6" sx={commonStyles.sectionTitle}>
            Past/Cancelled Reservations
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {otherBookings.map(bk => (
              <Grid item xs={12} sm={6} md={4} key={bk._id}>
                <Card sx={{ ...commonStyles.card, opacity: 0.7 }}>
                  <CardMedia
                    component="img"
                    height={CARD_IMAGE_HEIGHT.small}
                    image={formatImageUrl(bk.property?.images?.[0]?.path || bk.property?.images?.[0] || '')}
                    alt={bk.property?.title || 'Property'}
                    sx={{ objectFit: "cover" }}
                  />
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                      {bk.property?.title || 'Property'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Guest: {bk.guest?.firstName} {bk.guest?.lastName}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {new Date(bk.startDate).toLocaleDateString()} – {new Date(bk.endDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Total: ${bk.totalPrice}
                    </Typography>
                    <Chip 
                      label={bk.status.toUpperCase()} 
                      color={getStatusColor(bk.status)} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedBooking && (
          <>
            <DialogTitle>
              Reservation Details
              <Chip 
                label={selectedBooking.status.toUpperCase()} 
                color={getStatusColor(selectedBooking.status)} 
                size="small" 
                sx={{ ml: 2 }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom>
                <strong>{selectedBooking.property.title}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedBooking.property.address}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Guest: {selectedBooking.guest?.firstName} {selectedBooking.guest?.lastName}
              </Typography>
              <Typography variant="body2">
                Email: {selectedBooking.guest?.email}
              </Typography>
              <Typography variant="body2">
                Dates: {new Date(selectedBooking.startDate).toLocaleDateString()} – {new Date(selectedBooking.endDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                Total: ${selectedBooking.totalPrice}
              </Typography>

              {selectedBooking.status === "pending" && (
                <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                  <Button 
                    variant="contained" 
                    color="success"
                    onClick={() => handleConfirmBooking(selectedBooking._id)}
                    fullWidth
                  >
                    Confirm
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleRejectBooking(selectedBooking._id)}
                    fullWidth
                  >
                    Reject
                  </Button>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Messages</Typography>
              
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
                    placeholder="Type a message to the guest..."
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
