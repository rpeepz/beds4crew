import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Card, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert, CircularProgress, MenuItem, Grid, Input } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL, BASE_URL } from "../utils/api";
import { LoadingState } from "../components/EmptyState";
import RoomBedsConfigurator from "../components/RoomBedsConfigurator";
import PhotoTile from "../components/PhotoTile";
import PropertyCalendar from "../components/PropertyCalendar";
import BlockPeriodManager from "../components/BlockPeriodManager";
import BedSelector from "../components/BedSelector";
import { commonStyles } from "../utils/styleConstants";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const categories = ["apartment", "condo", "house", "hostel", "flat", "villa"];

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().add(1, 'day'));
  const [endDate, setEndDate] = useState(null);
  const [status, setStatus] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [captionLoading, setCaptionLoading] = useState({});
  const [deleteLoading, setDeleteLoading] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePropertyLoading, setDeletePropertyLoading] = useState(false);
  const [bookingSelection, setBookingSelection] = useState({
    bookedBeds: [],
    guestCount: 0,
    totalPrice: 0,
    valid: false
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const snackbar = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/properties/${id}`)
      .then(res => res.json())
      .then(data => {
        setProperty(data);
        setEditForm(data);
      });
    
    // Fetch bookings for this property
    fetch(`${API_URL}/bookings/property/${id}`)
      .then(res => res.json())
      .then(data => {
        // Only include confirmed bookings for the calendar
        const confirmedBookings = data.filter(b => b.status === "confirmed" || b.status === "pending");
        setBookings(confirmedBookings);
      })
      .catch(err => console.error("Failed to fetch bookings:", err));
  }, [id]);

  useEffect(() => {
    if (currentUser && property) {
      setIsOwner(currentUser.id === property.ownerHost._id);
    }
  }, [currentUser, property]);

  const handleBookingSelectionChange = useCallback((selection) => {
    setBookingSelection(selection);
  }, []);

  const handleBook = async () => {
    // Check if user is logged in
    if (!currentUser || !currentUser.id) {
      snackbar("Must be logged in to book", "warning");
      // Save the current property URL to redirect back after login
      localStorage.setItem("redirectAfterLogin", `/property/${id}`);
      navigate("/login");
      return;
    }
    
    if (!startDate || !endDate) {
      setStatus("Please select valid dates");
      return;
    }

    if (!bookingSelection.valid) {
      setStatus("Please complete the booking details");
      return;
    }
    
    console.log("Starting booking request...");
    setBookingLoading(true);
    setStatus("");
    
    try {
      console.log("Sending booking data:", { 
        propertyId: id, 
        startDate, 
        endDate,
        bookedBeds: bookingSelection.bookedBeds,
        totalPrice: bookingSelection.totalPrice
      });
      
      const res = await fetchWithAuth(`${API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          propertyId: id, 
          startDate: startDate.format('YYYY-MM-DD'), 
          endDate: endDate.format('YYYY-MM-DD'),
          bookedBeds: bookingSelection.bookedBeds,
          totalPrice: bookingSelection.totalPrice
        })
      });
      
      console.log("Booking response status:", res.status);
      const data = await res.json();
      console.log("Booking response data:", data);
      
      if (!res.ok) {
        throw new Error(data.message || "Booking failed");
      }
      
      console.log("Booking successful, navigating to trips...");
      snackbar("Booking successful!");
      
      // Use setTimeout to ensure snackbar shows before navigation
      setTimeout(() => {
        navigate("/trips");
      }, 100);
    } catch (err) {
      console.error("Booking error:", err);
      setStatus(`Error: ${err.message}`);
      snackbar(err.message || "Booking failed", "error");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !property.isActive })
      });
      if (!res.ok) throw new Error("Failed to update property");
      const updated = await res.json();
      setProperty(updated);
      snackbar(`Property ${updated.isActive ? "activated" : "disabled"} successfully`);
      window.location.reload();
    } catch (err) {
      snackbar("Failed to update property", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error("Failed to update property");
      const updated = await res.json();
      setProperty(updated);
      setEditForm(updated);
      setEditDialogOpen(false);
      snackbar("Property updated successfully");
      window.location.reload();
    } catch (err) {
      snackbar("Failed to update property", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCaptionChange = useCallback(async (idx, caption) => {
    try {
      setCaptionLoading(prev => ({ ...prev, [idx]: true }));
      const res = await fetchWithAuth(`${API_URL}/properties/${id}/images/${idx}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption })
      });
      if (!res.ok) throw new Error("Failed to update caption");
      setProperty(await res.json());
      snackbar("Caption updated successfully");
      // Reload page to ensure fresh data
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      snackbar("Failed to update caption", "error");
    } finally {
      setCaptionLoading(prev => ({ ...prev, [idx]: false }));
    }
  }, [id, snackbar]);

  const handleImageDelete = useCallback(async (idx) => {
    try {
      setDeleteLoading(prev => ({ ...prev, [idx]: true }));
      const res = await fetchWithAuth(`${API_URL}/properties/${id}/images/${idx}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete image");
      setProperty(await res.json());
      snackbar("Image deleted successfully");
    } catch (err) {
      snackbar("Failed to delete image", "error");
    } finally {
      setDeleteLoading(prev => ({ ...prev, [idx]: false }));
    }
  }, [id, snackbar]);

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      setUploadLoading(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append("images", files[i]);
      const res = await fetchWithAuth(`${API_URL}/properties/${id}/images`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Failed to upload images");
      setProperty(await res.json());
      e.target.value = "";
      window.location.reload();
      snackbar("Photos uploaded successfully");
    } catch (err) {
      snackbar("Failed to upload photos", "error");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteProperty = async () => {
    try {
      setDeletePropertyLoading(true);
      const res = await fetchWithAuth(`${API_URL}/properties/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete property");
      snackbar("Property deleted successfully");
      navigate("/");
    } catch (err) {
      snackbar("Failed to delete property", "error");
    } finally {
      setDeletePropertyLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleBlockAdded = async (blockData) => {
    const res = await fetchWithAuth(`${API_URL}/properties/${id}/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blockData)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to add block");
    }
    
    const updated = await res.json();
    setProperty(updated.property);
    snackbar("Period blocked successfully");
  };

  const handleBlockRemoved = async (blockId) => {
    const res = await fetchWithAuth(`${API_URL}/properties/${id}/block/${blockId}`, {
      method: "DELETE"
    });
    
    if (!res.ok) {
      throw new Error("Failed to remove block");
    }
    
    const updated = await res.json();
    setProperty(updated.property);
    snackbar("Block removed successfully");
  };

  if (!property) return <LoadingState message="Loading property details..." />;

  const nights = startDate && endDate ? dayjs(endDate).startOf("day").diff(dayjs(startDate).startOf("day"), "day") : 0;
  
  // Check if host has paid
  const hostHasPaid = property.ownerHost?.hasPaid === true;

  return (
    <Box sx={commonStyles.detailContainer}>
      {/* Payment Warning for Guests */}
      {!isOwner && !hostHasPaid && (
        <Alert severity="error" sx={commonStyles.sectionSpacing}>
          <Typography variant="body2" fontWeight="bold">This property is not available for booking</Typography>
          <Typography variant="body2">The host has not completed payment verification.</Typography>
        </Alert>
      )}

      {/* Owner Alerts */}
      {isOwner && !property.isActive && (
        <Alert severity="info" sx={commonStyles.sectionSpacing}>
          <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}>
            <Typography variant="body2">Your property is inactive. Edit details and configure rooms & beds to activate.</Typography>
            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditDialogOpen(true)}>Edit</Button>
          </Box>
        </Alert>
      )}

      {isOwner && (
        <Card sx={{ 
          ...commonStyles.sectionSpacing, 
          p: 2, 
          bgcolor: (theme) => property.isActive 
            ? theme.palette.mode === 'dark' ? 'success.dark' : '#e8f5e9'
            : theme.palette.mode === 'dark' ? 'error.dark' : '#ffebee',
          border: (theme) => `1px solid ${property.isActive 
            ? theme.palette.mode === 'dark' ? theme.palette.success.main : '#4caf50'
            : theme.palette.mode === 'dark' ? theme.palette.error.main : '#f44336'}`
        }}>
          <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: (theme) => theme.palette.mode === 'dark' ? 'common.white' : 'text.primary' }}>
                {property.isActive ? "✓ Property Active" : "⚠ Property Inactive"}
              </Typography>
              <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? 'grey.300' : 'text.secondary' }}>
                {property.isActive ? "Your property is visible to guests and can receive bookings." : "Configure rooms and beds to activate your property."}
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              color={property.isActive ? "error" : "success"} 
              onClick={handleToggleActive} 
              disabled={loading || property.rooms.length === 0}
              sx={{ minWidth: { xs: "100%", sm: "auto" } }}
            >
              {loading ? <CircularProgress size={24} /> : (property.isActive ? "Deactivate" : "Activate")}
            </Button>
          </Box>
        </Card>
      )}

      {/* Property Title & Photos */}
      <Typography variant="h4" sx={commonStyles.pageTitle}>{property.title}</Typography>
      
      {property.images?.length > 0 && (
        <Box sx={commonStyles.sectionSpacing}>
          <Typography variant="h6" sx={commonStyles.sectionTitle}>Photo Gallery</Typography>
          <Grid container spacing={2}>
            {property.images.map((img, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <PhotoTile 
                  imageUrl={`${BASE_URL}${img.path || img}`} 
                  caption={img.caption || ""} 
                  onCaptionChange={handleCaptionChange} 
                  onImageDelete={handleImageDelete} 
                  isOwner={isOwner} 
                  index={idx} 
                  captionLoading={captionLoading[idx]} 
                  deleteLoading={deleteLoading[idx]} 
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Photo Upload - Host Only */}
      {isOwner && (
        <Card sx={{ 
          ...commonStyles.sectionSpacing, 
          p: { xs: 2, sm: 3 }, 
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : '#f5f5f5',
          border: (theme) => theme.palette.mode === 'dark' 
            ? `2px dashed ${theme.palette.primary.main}` 
            : '2px dashed #1976d2'
        }}>
          <Typography variant="h6" sx={commonStyles.sectionTitle}>Upload Photos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add photos to your listing. You can add captions to describe each photo.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", gap: 2 }}>
            <Input 
              type="file" 
              multiple 
              inputProps={{ accept: "image/*" }} 
              onChange={handlePhotoUpload} 
              disabled={uploadLoading} 
              sx={{ flex: 1, width: { xs: "100%", sm: "auto" } }} 
            />
            <Button 
              variant="contained" 
              startIcon={<CloudUploadIcon />} 
              disabled={uploadLoading} 
              component="label"
              fullWidth={true}
              sx={{ display: { xs: "flex", sm: "none" } }}
            >
              {uploadLoading ? "Uploading..." : "Upload"}
              <input hidden type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploadLoading} />
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            JPG, PNG, GIF, WebP. Max 10MB each.
          </Typography>
        </Card>
      )}

      <Typography variant="body1" sx={commonStyles.sectionSpacing}>{property.description}</Typography>

      {/* Property Details */}
      <Card sx={{ ...commonStyles.sectionSpacing, p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={commonStyles.sectionTitle}>Property Details</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box><Typography variant="caption" color="text.secondary">Type</Typography><Typography variant="body2">{property.type}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Category</Typography><Typography variant="body2">{property.category || "..."}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Location</Typography><Typography variant="body2">{property.city}, {property.country}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Price/Night</Typography><Typography variant="body2">${property.pricePerNight || "..."}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Max Guests</Typography><Typography variant="body2">{property.maxGuests || "..."}</Typography></Box>
        </Box>
      </Card>

      {/* Facilities */}
      {property.facilities?.length > 0 && (
        <Card sx={{ ...commonStyles.sectionSpacing, p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={commonStyles.sectionTitle}>Facilities</Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {property.facilities.map((facility, idx) => <Chip key={idx} label={facility} variant="outlined" />)}
          </Box>
        </Card>
      )}

      {/* Rooms & Beds */}
      {property.rooms?.length > 0 && (
        <Card sx={{ ...commonStyles.sectionSpacing, p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={commonStyles.sectionTitle}>Rooms & Beds</Typography>
          {property.rooms.map((room, roomIdx) => (
            <Card key={roomIdx} sx={{ 
              mb: 2, 
              p: 2, 
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : '#f5f5f5',
              border: (theme) => theme.palette.mode === 'dark' ? `1px solid ${theme.palette.divider}` : 'none'
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {room.isPrivate ? "🔒 Private" : "🔓 Shared"} Room #{roomIdx + 1}
              </Typography>
              <Box sx={{ pl: 2 }}>
                {room.beds.map((bed, bedIdx) => (
                  <Typography key={bedIdx} variant="body2">
                    • {bed.label} - ${bed.pricePerBed}/night {bed.isAvailable ? "✓" : "✗"}
                  </Typography>
                ))}
              </Box>
            </Card>
          ))}
        </Card>
      )}

      {/* Block Period Manager - Host Only */}
      {isOwner && (
        <Card sx={{ ...commonStyles.sectionSpacing, p: { xs: 2, sm: 3 } }}>
          <BlockPeriodManager 
            property={property} 
            onBlockAdded={handleBlockAdded}
            onBlockRemoved={handleBlockRemoved}
          />
        </Card>
      )}

      {/* Availability Calendar Toggle & Display */}
      <Card sx={{ ...commonStyles.sectionSpacing, p: { xs: 2, sm: 3 } }}>
        <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1} mb={showCalendar ? 2 : 0}>
          <Typography variant="h6">Availability</Typography>
          <Button
            variant={showCalendar ? "contained" : "outlined"}
            startIcon={<CalendarMonthIcon />}
            onClick={() => setShowCalendar(!showCalendar)}
            size="small"
            fullWidth={false}
            sx={{ minWidth: { xs: "100%", sm: "auto" } }}
          >
            {showCalendar ? "Hide Calendar" : "Show Calendar"}
          </Button>
        </Box>
        {showCalendar && (
          <PropertyCalendar 
            bookings={bookings} 
            blockedPeriods={property.blockedPeriods || []}
            monthsToShow={3} 
            isOwner={isOwner}
          />
        )}
      </Card>

      {/* Booking Section */}
      {property.isActive && !isOwner && currentUser && hostHasPaid && (
        <Card sx={{ ...commonStyles.sectionSpacing, p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={commonStyles.sectionTitle}>Book This Property</Typography>
          
          <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2} mb={3}>
            <DatePicker 
              label="Check-in" 
              value={startDate} 
              onChange={val => {
                setStartDate(val ? dayjs(val) : null);
                setStatus("");
              }}
              minDate={dayjs()}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              <DatePicker 
                label="Check-out" 
                value={endDate} 
                onChange={val => {
                  setEndDate(val ? dayjs(val) : null);
                  setStatus("");
                }}
                minDate={startDate ? dayjs(startDate).add(1, 'day') : dayjs().add(1, 'day')}
                sx={{ flex: 1 }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label="1 Week" 
                  onClick={() => {
                    if (startDate) {
                      setEndDate(dayjs(startDate).add(7, 'day'));
                      setStatus("");
                    }
                  }}
                  disabled={!startDate}
                  clickable
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ flex: 1 }}
                />
                <Chip 
                  label="1 Month" 
                  onClick={() => {
                    if (startDate) {
                      setEndDate(dayjs(startDate).add(1, 'month'));
                      setStatus("");
                    }
                  }}
                  disabled={!startDate}
                  clickable
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
          </Box>

          {startDate && endDate && nights > 0 && (
            <BedSelector
              property={property}
              startDate={startDate}
              endDate={endDate}
              existingBookings={bookings}
              onSelectionChange={handleBookingSelectionChange}
            />
          )}

          {startDate && endDate && nights > 0 && (
            <Button 
              variant="contained" 
              onClick={handleBook} 
              fullWidth 
              sx={{ mt: 2 }}
              disabled={!bookingSelection.valid || bookingLoading}
            >
              {bookingLoading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : bookingSelection.valid ? (
                `Book Now - $${bookingSelection.totalPrice}`
              ) : (
                'Complete Selection to Book'
              )}
            </Button>
          )}
          
          {status && (
            <Alert severity={status.startsWith("Error") ? "error" : "info"} sx={{ mt: 2 }}>
              {status}
            </Alert>
          )}
        </Card>
      )}

      {!property.isActive && !isOwner && (
        <Alert severity="warning">
          <Typography variant="body2">This property is inactive and cannot be booked.</Typography>
        </Alert>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Property</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="Title" name="title" value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })} margin="normal" />
          <TextField fullWidth label="Description" name="description" value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })} multiline rows={3} margin="normal" />
          <TextField fullWidth label="Price/Night" name="pricePerNight" type="number" value={editForm.pricePerNight || ""} onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })} margin="normal" />
          <TextField fullWidth label="Max Guests" name="maxGuests" type="number" value={editForm.maxGuests || ""} onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })} margin="normal" />
          <TextField fullWidth select label="Category" name="category" value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })} margin="normal">
            {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <RoomBedsConfigurator rooms={editForm.rooms || []} onChange={(rooms) => setEditForm({ ...editForm, rooms })} />
          <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee" }}>
            <Button fullWidth variant="outlined" color="error" onClick={() => setDeleteConfirmOpen(true)}>Delete Property</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={loading}>{loading ? <CircularProgress size={24} /> : "Save"}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main", fontWeight: 600 }}>Delete Property</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>This action cannot be undone.</Typography>
          </Alert>
          <Typography variant="body2" paragraph>
            Are you sure you want to permanently delete <strong>"{property.title}"</strong>? All photos, booking data, and property information will be removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteProperty} variant="contained" color="error" disabled={deletePropertyLoading}>
            {deletePropertyLoading ? <CircularProgress size={24} /> : "Delete Property"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}