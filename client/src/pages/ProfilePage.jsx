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
  Switch,
  FormControlLabel,
  FormGroup,
  Alert,
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
    phone: storedUser.phone || "",
    bio: storedUser.bio || "",
  });
  const [emailPreferences, setEmailPreferences] = useState({
    bookingConfirmation: true,
    bookingCancellation: true,
    newBookingRequest: true,
    newMessage: true,
    welcomeEmail: true
  });
  const [profileImage, setProfileImage] = useState(storedUser.profileImagePath || "");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [billingLoading, setBillingLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    status: storedUser.subscriptionStatus || "",
    currentPeriodEnd: storedUser.subscriptionCurrentPeriodEnd || null,
    hasPaid: storedUser.hasPaid || false,
  });
  const snackbar = useSnackbar();

  useEffect(() => {
    if (storedUser.role === "host" && storedUser.id) {
      fetchWithAuth(`${API_URL}/properties/mine`)
        .then((res) => res.json())
        .then(setListings)
        .catch(() => {});
      return;
    }

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

    // Load email preferences
    if (storedUser.id) {
      fetchWithAuth(`${API_URL}/email-preferences`)
        .then(res => res.json())
        .then(prefs => {
          if (prefs && typeof prefs === 'object') {
            setEmailPreferences(prev => ({ ...prev, ...prefs }));
          }
        })
        .catch(err => console.error('Failed to load email preferences:', err));
    }
  }, [storedUser.id, storedUser.role]);

  useEffect(() => {
    if (!storedUser.id) return;

    fetchWithAuth(`${API_URL}/auth/me`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        const updatedUser = {
          ...storedUser,
          ...data,
          id: data._id || data.id || storedUser.id,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setSubscriptionInfo({
          status: data.subscriptionStatus || "",
          currentPeriodEnd: data.subscriptionCurrentPeriodEnd || null,
          hasPaid: data.hasPaid || false,
        });
      })
      .catch(err => console.error("Failed to refresh user subscription:", err));
  }, [storedUser.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    if (checkoutStatus === "success") {
      snackbar("Subscription activated successfully", "success");
    } else if (checkoutStatus === "cancel") {
      snackbar("Subscription checkout canceled", "info");
    }

    if (checkoutStatus) {
      params.delete("checkout");
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [snackbar]);

  const profileMetrics = useMemo(() => getListingMetrics({}), []);
  const hasRating = typeof profileMetrics.rating === "number" && typeof profileMetrics.reviews === "number";

  const validateForm = () => {
    const errors = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";
    if (form.firstName.trim().length < 2) errors.firstName = "First name must be at least 2 characters";
    if (form.lastName.trim().length < 2) errors.lastName = "Last name must be at least 2 characters";
    if (form.phone && !/^\d{10,}$/.test(form.phone.replace(/\D/g, ''))) {
      errors.phone = "Phone must be at least 10 digits";
    }
    if (form.bio && form.bio.length > 500) errors.bio = "Bio must be less than 500 characters";
    return errors;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      snackbar("Please fix the errors before saving", "error");
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          bio: form.bio.trim(),
        })
      });
      if (!res.ok) {
        snackbar("Failed to update profile", "error");
        return;
      }
      const data = await res.json();
      localStorage.setItem("user", JSON.stringify(data));
      snackbar("Profile updated successfully");
    } catch (err) {
      snackbar("Failed to update profile", "error");
    }
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

  const handleEmailPreferenceChange = async (preference) => {
    const newValue = !emailPreferences[preference];
    
    // Optimistic update
    setEmailPreferences(prev => ({ ...prev, [preference]: newValue }));
    
    try {
      setSavingPrefs(true);
      const res = await fetchWithAuth(`${API_URL}/email-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [preference]: newValue } })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update preferences");
      }
      
      snackbar("Email preference updated", "success");
    } catch (error) {
      // Revert on error
      setEmailPreferences(prev => ({ ...prev, [preference]: !newValue }));
      snackbar(error.message || "Failed to update preference", "error");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleStartSubscription = async () => {
    try {
      setBillingLoading(true);
      const res = await fetchWithAuth(`${API_URL}/billing/create-checkout-session`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        
        // Handle duplicate subscription case
        if (errorData?.hasActiveSubscription) {
          snackbar("You already have an active subscription", "info");
          // Refresh user data to sync subscription status
          const userRes = await fetchWithAuth(`${API_URL}/auth/me`);
          if (userRes.ok) {
            const userData = await userRes.json();
            const updatedUser = {
              ...storedUser,
              ...userData,
              id: userData._id || userData.id || storedUser.id,
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setSubscriptionInfo({
              status: userData.subscriptionStatus || "",
              currentPeriodEnd: userData.subscriptionCurrentPeriodEnd || null,
              hasPaid: userData.hasPaid || false,
            });
          }
          return;
        }
        
        throw new Error(errorData?.message || "Failed to start checkout");
      }

      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Checkout URL missing");
      }
    } catch (error) {
      snackbar(error.message || "Failed to start subscription", "error");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setBillingLoading(true);
      const res = await fetchWithAuth(`${API_URL}/billing/create-portal-session`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to open billing portal");
      }

      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Portal URL missing");
      }
    } catch (error) {
      snackbar(error.message || "Failed to open billing portal", "error");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSyncSubscription = async () => {
    try {
      setBillingLoading(true);
      const res = await fetchWithAuth(`${API_URL}/billing/sync-subscription`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to sync subscription");
      }

      const data = await res.json();
      
      if (data.synced) {
        // Refresh user data
        const userRes = await fetchWithAuth(`${API_URL}/auth/me`);
        if (userRes.ok) {
          const userData = await userRes.json();
          const updatedUser = {
            ...storedUser,
            ...userData,
            id: userData._id || userData.id || storedUser.id,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setSubscriptionInfo({
            status: userData.subscriptionStatus || "",
            currentPeriodEnd: userData.subscriptionCurrentPeriodEnd || null,
            hasPaid: userData.hasPaid || false,
          });
        }
        
        snackbar(data.message || "Subscription synced successfully", "success");
      }
    } catch (error) {
      snackbar(error.message || "Failed to sync subscription", "error");
    } finally {
      setBillingLoading(false);
    }
  };

  const normalizedStatus = (subscriptionInfo.status || "").replace("_", " ");
  const isSubscriptionActive = ["active", "trialing"].includes(subscriptionInfo.status);
  const hasBilling = Boolean(subscriptionInfo.status) || subscriptionInfo.hasPaid;
  const periodEndLabel = subscriptionInfo.currentPeriodEnd
    ? new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()
    : null;

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
              {storedUser.role === "host" ? (
                <>
                  {subscriptionInfo.hasPaid ? "✓ Verified Host" : "Host (Unverified)"}
                  {profileMetrics.sellerLevel && ` • ${profileMetrics.sellerLevel}`}
                </>
              ) : (
                "Guest Account"
              )}
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
        storedUser.role === "host" ? (
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
        ) : (
          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">
              You must be a host to view listings.
            </Typography>
          </Card>
        )
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
        <Box sx={{ display: 'grid', gap: 3 }}>
          
          {/* Personal Info */}
          <Card sx={{ p: 3, borderRadius: 3, maxWidth: 520 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Personal information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Keep your profile current to improve trust and booking conversion.
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                label="First Name"
                name="firstName"
                fullWidth
                margin="normal"
                value={form.firstName}
                onChange={handleChange}
                error={!!formErrors.firstName}
                helperText={formErrors.firstName}
                required
              />
              <TextField
                label="Last Name"
                name="lastName"
                fullWidth
                margin="normal"
                value={form.lastName}
                onChange={handleChange}
                error={!!formErrors.lastName}
                helperText={formErrors.lastName}
                required
              />
              <TextField
                label="Phone Number"
                name="phone"
                fullWidth
                margin="normal"
                value={form.phone}
                onChange={handleChange}
                error={!!formErrors.phone}
                helperText={formErrors.phone || "Optional: at least 10 digits"}
                type="tel"
              />
              <TextField
                label="Bio"
                name="bio"
                fullWidth
                margin="normal"
                value={form.bio}
                onChange={handleChange}
                error={!!formErrors.bio}
                helperText={formErrors.bio || `${form.bio.length}/500 characters`}
                multiline
                rows={4}
              />
              <Button type="submit" fullWidth variant="contained" sx={{ my: 2 }}>
                Save changes
              </Button>
            </form>
          </Card>

          {/* Subscription Management */}
          <Card sx={{ p: 3, borderRadius: 3, maxWidth: 520 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Host Status
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage your host status by subscribing to Beds4Crew.
            </Typography>
            <Alert
              severity={isSubscriptionActive ? "success" : "warning"}
              sx={{ mb: 2 }}
            >
              {isSubscriptionActive
                ? `Active${periodEndLabel ? ` • Renews on ${periodEndLabel}` : ""}`
                : hasBilling
                  ? `Status: ${normalizedStatus || "Inactive"}`
                  : "Not currently subscribed."}
            </Alert>
            <Box display="flex" gap={2} flexWrap="wrap">
              {isSubscriptionActive ? (
                <Button
                  variant="contained"
                  onClick={handleManageSubscription}
                  disabled={billingLoading}
                >
                  {billingLoading ? "Opening portal..." : "Manage subscription"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleStartSubscription}
                  disabled={billingLoading}
                >
                  {billingLoading ? "Redirecting..." : "Start subscription"}
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleSyncSubscription}
                disabled={billingLoading}
              >
                {billingLoading ? "Syncing..." : "Sync with Stripe"}
              </Button>
            </Box>
          </Card>

          {/* Email Preferences */}
          <Card sx={{ p: 3, borderRadius: 3, maxWidth: 520 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Email notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage which email notifications you receive. Password-related emails cannot be disabled.
            </Typography>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.bookingConfirmation}
                    onChange={() => handleEmailPreferenceChange('bookingConfirmation')}
                    disabled={savingPrefs}
                  />
                }
                label="Booking Confirmations"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.bookingCancellation}
                    onChange={() => handleEmailPreferenceChange('bookingCancellation')}
                    disabled={savingPrefs}
                  />
                }
                label="Booking Cancellations"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.newBookingRequest}
                    onChange={() => handleEmailPreferenceChange('newBookingRequest')}
                    disabled={savingPrefs}
                  />
                }
                label="New Booking Requests (Hosts)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.newMessage}
                    onChange={() => handleEmailPreferenceChange('newMessage')}
                    disabled={savingPrefs}
                  />
                }
                label="New Messages"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.welcomeEmail}
                    onChange={() => handleEmailPreferenceChange('welcomeEmail')}
                    disabled={savingPrefs}
                  />
                }
                label="Promotional & Updates"
              />
            </FormGroup>
          </Card>
        </Box>
      )}
    </Box>
  );
}
