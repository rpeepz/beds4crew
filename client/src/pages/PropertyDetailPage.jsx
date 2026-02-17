import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Box, Typography, Card, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert, CircularProgress, MenuItem, Grid, Input, Breadcrumbs, Avatar, Divider, useMediaQuery } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { LoadingState } from "../components/EmptyState";
import RoomBedsConfigurator from "../components/RoomBedsConfigurator";
import PhotoTile from "../components/PhotoTile";
import PropertyCalendar from "../components/PropertyCalendar";
import BlockPeriodManager from "../components/BlockPeriodManager";
import BedSelector from "../components/BedSelector";
import BedAvailabilityGrid from "../components/BedAvailabilityGrid";
import MapView from "../components/HotelMapView";
import { commonStyles } from "../utils/styleConstants";
import { formatImageUrl, getListingMetrics } from "../utils/helpers";
import RatingStars from "../components/RatingStars";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const categories = ["apartment", "condo", "house", "hostel", "flat", "villa"];

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().add(1, 'day'));
  const [endDate, setEndDate] = useState(null);
  const [status, setStatus] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));

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
        // Separate confirmed and pending bookings
        const confirmedBookings = data.filter(b => b.status === "confirmed");
        const pendingBookingsList = data.filter(b => b.status === "pending");
        setBookings(confirmedBookings);
        setPendingBookings(pendingBookingsList);
      })
      .catch(err => console.error("Failed to fetch bookings:", err));
  }, [id]);

  useEffect(() => {
    if (currentUser && property) {
      setIsOwner(currentUser.id === property.ownerHost._id);
    }
  }, [currentUser, property]);

  const handleStartEdit = () => {
    setEditForm(JSON.parse(JSON.stringify(property)));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditForm(property);
    setIsEditing(false);
  };

  useEffect(() => {
    if (isOwner && searchParams.get("edit") === "true") {
      setEditDialogOpen(true);
    }
  }, [isOwner, searchParams]);

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

    // Check if selected dates have any confirmed bookings or blocked periods
    const start = startDate;
    const end = endDate;
    let current = start;
    
    while (current.isBefore(end) || current.isSame(end, "day")) {
      const dateStr = current.format("YYYY-MM-DD");
      const blockedOnDate = blockedPeriods.some(block => {
        const blockStart = dayjs(block.startDate);
        const blockEnd = dayjs(block.endDate);
        return current.isBetween(blockStart, blockEnd, null, "[]");
      });
      
      const bookedOnDate = bookings.some(booking => {
        const bookStart = dayjs(booking.startDate);
        const bookEnd = dayjs(booking.endDate);
        return current.isBetween(bookStart, bookEnd, null, "[]");
      });
      
      if (blockedOnDate || bookedOnDate) {
        setStatus("Some selected dates are not available for booking");
        return;
      }
      
      current = current.add(1, "day");
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
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update property");
      }
      const updated = await res.json();
      setProperty(updated);
      setEditForm(updated);
      setIsEditing(false);
      snackbar("Property updated successfully");
    } catch (err) {
      snackbar(err.message || "Failed to update property", "error");
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
  const metrics = getListingMetrics(property);
  const hasRating = typeof metrics.rating === "number" && typeof metrics.reviews === "number";

  return (
    <Box sx={commonStyles.detailContainer}>
      {!isOwner && !hostHasPaid && (
        <Alert severity="error" sx={commonStyles.sectionSpacing}>
          <Typography variant="body2" fontWeight="bold">This property is not available for booking</Typography>
          <Typography variant="body2">The host has not completed payment verification.</Typography>
        </Alert>
      )}

      {isOwner && !property.isActive && (
        <Alert severity="info" sx={commonStyles.sectionSpacing}>
          <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}>
            <Typography variant="body2">Your property is inactive. Edit details and configure rooms & beds to activate.</Typography>
            <Button size="small" startIcon={<EditIcon />} onClick={handleStartEdit}>Edit listing</Button>
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

      <Breadcrumbs sx={{ mb: 2 }}>
        <Button variant="text" size="small" onClick={() => navigate("/")}>Home</Button>
        <Button variant="text" size="small" onClick={() => navigate("/properties")}>Listings</Button>
        <Typography variant="body2" color="text.secondary">{property.title}</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" gap={2} flexWrap="wrap">
          {isEditing ? (
            <TextField
              label="Title"
              name="title"
              value={editForm.title || ""}
              onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })}
              fullWidth
              sx={{ maxWidth: 520 }}
            />
          ) : (
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>{property.title}</Typography>
          )}
          {isOwner && (
            <Button
              variant={isEditing ? "outlined" : "contained"}
              startIcon={<EditIcon />}
              onClick={isEditing ? handleCancelEdit : handleStartEdit}
            >
              {isEditing ? "Cancel editing" : "Edit listing"}
            </Button>
          )}
        </Box>
        <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 32, height: 32 }}>{property.ownerHost?.firstName?.[0] || "H"}</Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {property.ownerHost?.firstName ? `${property.ownerHost.firstName} ${property.ownerHost.lastName || ""}` : "Verified Host"}
            </Typography>
            {metrics.isVerified && <Chip label="Verified" size="small" color="success" />}
          </Box>
          {hasRating && <RatingStars value={metrics.rating} count={metrics.reviews} />}
          <Typography variant="body2" color="text.secondary">{property.city}, {property.country}</Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8} lg={12}>
          <Card sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Media gallery</Typography>
            {property.images?.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    overflow: "hidden",
                    aspectRatio: { xs: "4 / 3", md: "16 / 9" },
                    bgcolor: "grey.100",
                  }}
                >
                  <Box
                    component="img"
                    src={formatImageUrl(property.images[0].path || property.images[0])}
                    alt={property.title}
                    loading="lazy"
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
                <Box
                  sx={{
                    display: { xs: "flex", md: "grid" },
                    gap: 1,
                    gridTemplateRows: { md: "repeat(3, 1fr)" },
                    overflowX: { xs: "auto", md: "visible" },
                    pb: { xs: 1, md: 0 },
                  }}
                >
                  {property.images.slice(1, 4).map((img, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        minWidth: { xs: 140, sm: 180, md: "auto" },
                        borderRadius: 2,
                        overflow: "hidden",
                        aspectRatio: { xs: "4 / 3", md: "4 / 3" },
                        bgcolor: "grey.100",
                      }}
                    >
                      <Box
                        component="img"
                        src={formatImageUrl(img.path || img)}
                        alt={img.caption || property.title}
                        loading="lazy"
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No images yet.</Typography>
            )}
          </Card>

          {isOwner && property.images?.length > 0 && (
            <Card sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Manage photos</Typography>
              <Grid container spacing={2}>
                {property.images.map((img, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <PhotoTile
                      imageUrl={formatImageUrl(img.path || img)}
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
            </Card>
          )}

          {isOwner && (
            <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : '#f5f5f5', border: (theme) => theme.palette.mode === 'dark'
              ? `2px dashed ${theme.palette.primary.main}`
              : '2px dashed #1dbf73' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Upload photos</Typography>
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

          {/* <Box> */}
            <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>What this place offers</Typography>
              {property.facilities?.length > 0 ? (
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {property.facilities.map((facility, idx) => <Chip key={idx} label={facility} variant="outlined" />)}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No facilities listed.</Typography>
              )}
            </Card>

            <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>About this stay</Typography>
              {isEditing ? (
                <Box>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })}
                    multiline
                    rows={4}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <TextField fullWidth label="Type" value={editForm.type || ""} disabled />
                    <TextField
                      fullWidth
                      select
                      label="Category"
                      name="category"
                      value={editForm.category || ""}
                      onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })}
                    >
                      {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                    <TextField fullWidth label="Price/night" name="pricePerNight" type="number" value={editForm.pricePerNight || ""} onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })} />
                    <TextField fullWidth label="Max guests" name="maxGuests" type="number" value={editForm.maxGuests || ""} onChange={(e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })} />
                    <TextField fullWidth label="Address" value={editForm.address || ""} disabled />
                    <TextField fullWidth label="City" value={editForm.city || ""} disabled />
                    <TextField fullWidth label="Country" value={editForm.country || ""} disabled />
                  </Box>
                </Box>
              ) : (
                <>
                  <Typography variant="body1" sx={{ mb: 2 }}>{property.description}</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <Box><Typography variant="caption" color="text.secondary">Type</Typography><Typography variant="body2">{property.type}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Category</Typography><Typography variant="body2">{property.category || "..."}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Location</Typography><Typography variant="body2">{property.city}, {property.country}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Price/night</Typography><Typography variant="body2">${property.pricePerNight || "..."}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Max guests</Typography><Typography variant="body2">{property.maxGuests || "..."}</Typography></Box>
                  </Box>
                </>
              )}
            </Card>

            <Box sx={{ position: { md: "sticky" }, top: { md: 96 } }}>
              <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  ${property.pricePerNight || "--"} / night
                </Typography>
                {(metrics.responseHours || metrics.completionRate) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {metrics.responseHours ? `Response time: ${metrics.responseHours}h` : ""}
                    {metrics.responseHours && metrics.completionRate ? " • " : ""}
                    {metrics.completionRate ? `Completion ${metrics.completionRate}%` : ""}
                  </Typography>
                )}
                <Divider sx={{ mb: 2 }} />

                {property.isActive && !isOwner && currentUser?.id && hostHasPaid ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Dates
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <DatePicker
                          label="Check-in"
                          value={startDate}
                          onChange={val => {
                            setStartDate(val ? dayjs(val) : null);
                            setStatus("");
                          }}
                          minDate={dayjs()}
                          slotProps={{ textField: { fullWidth: true, size: "small" } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <DatePicker
                          label="Check-out"
                          value={endDate}
                          onChange={val => {
                            setEndDate(val ? dayjs(val) : null);
                            setStatus("");
                          }}
                          minDate={startDate ? dayjs(startDate).add(1, 'day') : dayjs().add(1, 'day')}
                          slotProps={{ textField: { fullWidth: true, size: "small" } }}
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
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
                      />
                      {nights > 0 && (
                        <Chip
                          label={`${nights} night${nights > 1 ? "s" : ""}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
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
                      <Box sx={{ mt: 2 }}>
                        {bookingSelection.valid && (
                          <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">Estimated total</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>${bookingSelection.totalPrice}</Typography>
                          </Box>
                        )}
                        <Button
                          variant="contained"
                          onClick={handleBook}
                          fullWidth
                          disabled={!bookingSelection.valid || bookingLoading}
                          sx={{ py: 1.2 }}
                        >
                          {bookingLoading ? (
                            <CircularProgress size={24} sx={{ color: 'white' }} />
                          ) : bookingSelection.valid ? (
                            `Book Now - $${bookingSelection.totalPrice}`
                          ) : (
                            'Complete Selection to Book'
                          )}
                        </Button>
                      </Box>
                    )}

                    {status && (
                      <Alert severity={status.startsWith("Error") ? "error" : "info"} sx={{ mt: 2 }}>
                        {status}
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {isOwner
                        ? "You own this listing."
                        : currentUser?.id
                        ? "This listing is not available for booking right now."
                        : "Sign in to see availability and book instantly."}
                    </Typography>
                    {!currentUser?.id && (
                      <Button variant="contained" fullWidth onClick={() => navigate("/login")}>
                        Sign in to book
                      </Button>
                    )}
                  </Box>
                )}
              </Card>

              <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3 }}>
                <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1} mb={showCalendar ? 2 : 0}>
                  <Typography variant="h6">Availability</Typography>
                  <Button
                    property={property}
                    variant={showCalendar ? "contained" : "outlined"}
                    startIcon={<CalendarMonthIcon />}
                    onClick={() => setShowCalendar(!showCalendar)}
                    size="small"
                    sx={{ minWidth: { xs: "100%", sm: "auto" } }}
                  >
                    {showCalendar ? "Hide Calendar" : "Show Calendar"}
                  </Button>
                </Box>
                {showCalendar && (
                  <Box sx={{ overflowX: "auto" }}>
                    <PropertyCalendar
                      bookings={bookings}
                      pendingBookings={pendingBookings}
                      blockedPeriods={property.blockedPeriods || []}
                      monthsToShow={isMobile ? 1 : 2}
                      isOwner={isOwner}
                      property={property}
                    />
                  </Box>
                )}
              </Card>

              {property.rooms?.length > 0 && (
                <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Rooms & beds</Typography>
                  {isEditing ? (
                    <RoomBedsConfigurator
                      rooms={editForm.rooms || []}
                      propertyType={editForm.type || "accommodation"}
                      disableAutoReset
                      onChange={(rooms) => setEditForm({ ...editForm, rooms })}
                    />
                  ) : (
                    property.rooms.map((room, roomIdx) => (
                      <Card key={roomIdx} sx={{ mb: 2, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : '#f5f5f5' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          {room.isPrivate ? "🔒 Private" : "🔓 Shared"} Room #{roomIdx + 1}
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          {room.beds.map((bed, bedIdx) => (
                            <Typography key={bedIdx} variant="body2">
                              • {bed.label} - ${bed.pricePerBed}/night
                            </Typography>
                          ))}
                        </Box>
                      </Card>
                    ))
                  )}

                  {startDate && endDate && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                      <BedAvailabilityGrid
                        property={property}
                        bookings={bookings}
                        blockedPeriods={property.blockedPeriods || []}
                        startDate={startDate}
                        endDate={endDate}
                        isOwner={isOwner}
                      />
                    </Box>
                  )}
                </Card>
              )}

              {isOwner && (
                  <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3 }}>
                  <BlockPeriodManager
                    property={property}
                    onBlockAdded={handleBlockAdded}
                    onBlockRemoved={handleBlockRemoved}
                  />
                </Card>
              )}

              <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Where you’ll be</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {property.address ? `${property.address}, ${property.city}` : `${property.city}, ${property.country}`}
                </Typography>
                {property.latitude && property.longitude ? (
                  <Box sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <MapView
                      properties={[property]}
                      groupedMarkers={[[property]]}
                      center={{ lat: property.latitude, lng: property.longitude }}
                      radius={1}
                      height="320px"
                      onPropertyClick={() => navigate(`/property/${property._id}`)}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">Location details are not available yet.</Typography>
                )}
              </Card>
              <Card sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Reviews</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Verified guest feedback builds trust.</Typography>
                <Divider sx={{ mb: 2 }} />
                {hasRating ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <Box key={idx} sx={{ mb: 2 }}>
                      <RatingStars value={metrics.rating} showCount={false} />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        “Seamless stay, quick responses, and reliable check-in. Would book again.”
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Verified stay</Typography>
                      {idx < 2 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No reviews yet.
                  </Typography>
                )}
              </Card>
              <Divider sx={{ mb: 2 }} />
              <Card sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Host snapshot</Typography>
                  {metrics.completionRate || metrics.responseHours ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {metrics.completionRate ? `Response rate ${metrics.completionRate}%` : ""}
                      {metrics.completionRate && metrics.responseHours ? " • " : ""}
                      {metrics.responseHours ? `Typically replies in ${metrics.responseHours} hours` : ""}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      No host stats yet.
                    </Typography>
                  )}
                  <Button variant="outlined" fullWidth onClick={() => navigate("/profile")}>View Host profile</Button>
              </Card>
            
          </Box>
        </Grid>


      </Grid>

      {!property.isActive && !isOwner && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">This property is inactive and cannot be booked.</Typography>
        </Alert>
      )}

      {isOwner && isEditing && (
        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button variant="outlined" color="error" onClick={() => setDeleteConfirmOpen(true)}>
            Delete listing
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Save changes"}
          </Button>
        </Box>
      )}

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