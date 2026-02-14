import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import { getListingMetrics } from "../utils/helpers";
import PropertyCard from "../components/PropertyCard";

export default function ProfilePage() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [tab, setTab] = useState(0);
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState({
    firstName: storedUser.firstName || "",
    lastName: storedUser.lastName || "",
  });
  const [profileImage, setProfileImage] = useState(storedUser.profileImagePath || "");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const snackbar = useSnackbar();

  useEffect(() => {
    fetch(`${API_URL}/properties`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((prop) => {
          const ownerId = prop.ownerHost?._id || prop.ownerHost;
          return ownerId === storedUser.id;
        });
        setListings(filtered);
      })
      .catch(() => {});
  }, [storedUser.id]);

  const profileMetrics = useMemo(() => getListingMetrics({}), []);
  const hasRating = typeof profileMetrics.rating === "number" && typeof profileMetrics.reviews === "number";

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    const res = await fetchWithAuth(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      snackbar("Failed to update profile", "error");
      return;
    }
    const data = await res.json();
    localStorage.setItem("user", JSON.stringify(data));
    snackbar("Profile updated successfully");
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      snackbar("Please select an image file", "error");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      snackbar("Image must be less than 10MB", "error");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("profileImage", file);

      const res = await fetchWithAuth(`${API_URL}/auth/profile/photo`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Failed to upload photo");

      const data = await res.json();
      setProfileImage(data.profileImagePath);
      
      // Update localStorage
      const updatedUser = { ...storedUser, profileImagePath: data.profileImagePath };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      snackbar("Profile photo updated successfully");
    } catch (err) {
      snackbar("Failed to upload photo", "error");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handlePhotoRemove = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;

    try {
      setDeleting(true);
      const res = await fetchWithAuth(`${API_URL}/auth/profile/photo`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to remove photo");

      setProfileImage("");
      
      // Update localStorage
      const updatedUser = { ...storedUser, profileImagePath: "" };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      snackbar("Profile photo removed successfully");
    } catch (err) {
      snackbar("Failed to remove photo", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={commonStyles.contentContainer}>
      <Card sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, mb: 3 }}>
        <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3} alignItems={{ xs: "flex-start", md: "center" }}>
          <Box sx={{ position: "relative", width: 96, height: 96 }}>
            <Avatar src={profileImage || ""} sx={{ width: 96, height: 96, fontSize: 32 }}>
              {!profileImage && `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`}
            </Avatar>
            {uploading && (
              <CircularProgress size={96} sx={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
            )}
          </Box>
          <Box flex={1}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {form.firstName || "Your"} {form.lastName || "Profile"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {profileMetrics.sellerLevel ? `Seller level: ${profileMetrics.sellerLevel}` : "Seller level: New"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />} disabled={uploading || deleting} size="small">
                {profileImage ? "Change Photo" : "Upload Photo"}
                <input hidden accept="image/*" type="file" onChange={handlePhotoUpload} />
              </Button>
              {profileImage && (
                <IconButton color="error" onClick={handlePhotoRemove} disabled={uploading || deleting} size="small">
                  {deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
                </IconButton>
              )}
            </Box>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Active listings</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{listings.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Rating</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{hasRating ? profileMetrics.rating : "--"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Reviews</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{hasRating ? profileMetrics.reviews : "0"}</Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
        <Tab label="Listings" />
        <Tab label="Portfolio" />
        <Tab label="Account settings" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={3}>
          {listings.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No listings yet. Create your first listing to build trust and visibility.
                </Typography>
                <Button variant="contained" sx={{ mt: 2 }} href="/add-property">
                  Add a listing
                </Button>
              </Card>
            </Grid>
          ) : (
            listings.map((listing) => (
              <Grid item xs={12} sm={6} md={4} key={listing._id}>
                <PropertyCard property={listing} showStatus showWishlist={false} />
              </Grid>
            ))
          )}
        </Grid>
      )}

      {tab === 1 && (
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Portfolio highlights
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showcase your best spaces and recent activity to build trust.
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {listings.slice(0, 6).map((listing) => (
              <Grid item xs={6} md={4} key={listing._id}>
                <Card sx={{ p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {listing.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {listing.city}, {listing.country}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {tab === 2 && (
        <Card sx={{ p: 3, borderRadius: 3, maxWidth: 520 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Account settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Keep your profile current to improve trust and booking conversion.
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField label="First Name" name="firstName" fullWidth margin="normal" value={form.firstName} onChange={handleChange} />
            <TextField label="Last Name" name="lastName" fullWidth margin="normal" value={form.lastName} onChange={handleChange} />
            <Button type="submit" fullWidth variant="contained" sx={{ my: 2 }}>Save</Button>
          </form>
        </Card>
      )}
    </Box>
  );
}
