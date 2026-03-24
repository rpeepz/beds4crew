import React, { useEffect, useRef, useState } from "react";
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
  Divider,
  Switch,
  FormControlLabel,
  FormGroup,
  Alert,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, fetchJson, fetchJsonWithAuth, getStoredUser, setStoredUser, API_URL, isAppTransportMode } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import { scrollElementIntoViewWithOffset } from "../utils/scroll";
import { useLocation, useNavigate } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import { LoadingState, NoFavorites } from "../components/EmptyState";

export default function ProfilePage() {
  const navigate = useNavigate();  const location = useLocation();
  const storedUser = getStoredUser();
  const listingsTabRef = useRef(null);
  const favoritesTabRef = useRef(null);
  const settingsTabRef = useRef(null);
  const [tab, setTab] = useState(0);
  const [listings, setListings] = useState([]);
  const [favoriteProperties, setFavoriteProperties] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
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
  const [passwordEmailLoading, setPasswordEmailLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [billingLoading, setBillingLoading] = useState(false);
  const [showHostFlavorText, setShowHostFlavorText] = useState(false);
  const [tierInfo, setTierInfo] = useState({
    tier: 0,
    tierName: "Free",
    listingLimit: 0,
    activeListings: 0,
    canAddMore: false
  });  const [subscriptionInfo, setSubscriptionInfo] = useState({
    status: storedUser.subscriptionStatus || "",
    currentPeriodEnd: storedUser.subscriptionCurrentPeriodEnd || null,
    hasPaid: storedUser.hasPaid || false,
  });
  const [reviewStats, setReviewStats] = useState({
    averageRating: null,
    reviewCount: 0,
  });
  const snackbar = useSnackbar();
  // Detect if running inside iOS native app
  const isIosNative = (() => {
    if (!isAppTransportMode() || typeof window === "undefined") return false;
    const getPlatform = window.Capacitor?.getPlatform;
    return typeof getPlatform === "function" && getPlatform() === "ios";
  })();

  useEffect(() => {
    if (storedUser.role === "host" && storedUser.id) {
      fetchWithAuth(`${API_URL}/properties/mine`)
        .then((res) => res.json())
        .then(setListings)
        .catch(() => {});
      return;
    }

    fetchJson(`${API_URL}/properties?page=1&limit=50&ownerId=${encodeURIComponent(storedUser.id)}`)
      .then((data) => {
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];
        setListings(items);
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
        setStoredUser(updatedUser);
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
      fetchWithAuth(`${API_URL}/billing/sync-subscription`, { method: "POST" })
        .then((res) => res.ok ? res.json() : null)
        .then(async (syncData) => {
          if (!syncData?.synced) return;
          const userRes = await fetchWithAuth(`${API_URL}/auth/me`);
          if (!userRes.ok) return;
          const userData = await userRes.json();
          const updatedUser = {
            ...storedUser,
            ...userData,
            id: userData._id || userData.id || storedUser.id,
          };
          setStoredUser(updatedUser);
          setSubscriptionInfo({
            status: userData.subscriptionStatus || "",
            currentPeriodEnd: userData.subscriptionCurrentPeriodEnd || null,
            hasPaid: userData.hasPaid || false,
          });
        })
        .catch(() => {});
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

  // Fetch tier info when subscription status changes
  useEffect(() => {
    if (!storedUser.id || storedUser.role !== "host") return;
    
    fetchWithAuth(`${API_URL}/billing/user-tier`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setTierInfo(data);
      })
      .catch(err => console.error("Failed to fetch tier info:", err));
  }, [storedUser.id, storedUser.role, subscriptionInfo.status]);

  useEffect(() => {
    if (!storedUser.id) return;

    fetchJson(`${API_URL}/users/${storedUser.id}/review-stats`)
      .then((data) => {
        setReviewStats({
          averageRating: typeof data?.averageRating === "number" ? data.averageRating : null,
          reviewCount: typeof data?.reviewCount === "number" ? data.reviewCount : 0,
        });
      })
      .catch((err) => {
        console.error("Failed to load review stats:", err);
      });
  }, [storedUser.id]);

  const hasRating = typeof reviewStats.averageRating === "number" && reviewStats.reviewCount > 0;

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
      setStoredUser(data);
      snackbar("Profile updated successfully");
    } catch {
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
      setStoredUser(updatedUser);
      
      snackbar("Profile photo updated successfully");
    } catch {
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
      setStoredUser(updatedUser);
      
      snackbar("Profile photo removed successfully");
    } catch {
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

  const handleRequestPasswordChange = async () => {
    try {
      setPasswordEmailLoading(true);
      const res = await fetchWithAuth(`${API_URL}/auth/password/request-change`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to send password change email");
      }

      snackbar(data.message || "Password change email sent", "success");
    } catch (error) {
      snackbar(error.message || "Failed to send password change email", "error");
    } finally {
      setPasswordEmailLoading(false);
    }
  };

  const handleStartSubscription = () => {
    // disallow stripe manage in iOS native app
    if (isIosNative) {
      snackbar("Subscription management is not available inside the iOS app.", "info");
      return;
    }
    navigate("/pricing");
  };

  const handleManageSubscription = async () => {
    // disallow stripe manage in iOS native app
    if (isIosNative) {
      snackbar("Subscription management is not available inside the iOS app.", "info", {
        force: true,
        action: {
          label: "View Subscription Options",
          href: "https://beds4crew-o40r.onrender.com/profile?tab=settings#host-status",
          type: "link"
        }
      });
      return;
    }

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
          setStoredUser(updatedUser);
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

  const loadFavorites = async () => {
    if (!storedUser.id) return;

    setFavoritesLoading(true);
    try {
      const summary = await fetchJsonWithAuth(`${API_URL}/users/wishlist/summary`);
      setFavoriteProperties(Array.isArray(summary) ? summary : []);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleRemoveFavorite = async (propertyId) => {
    const res = await fetchWithAuth(`${API_URL}/users/wishlist/${propertyId}`, {
      method: "DELETE"
    });

    if (res.ok) {
      setFavoriteProperties(prev => prev.filter((property) => property._id !== propertyId));
      snackbar("Property removed from favorites", "info");
    }
  };

  const normalizedStatus = (subscriptionInfo.status || "").replace("_", " ");
  const isSubscriptionActive = ["active", "trialing"].includes(subscriptionInfo.status);
  const hasBilling = Boolean(subscriptionInfo.status) || subscriptionInfo.hasPaid;
  const periodEndLabel = subscriptionInfo.currentPeriodEnd
    ? new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()
    : null;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");

    if (tabParam === "listings") {
      setTab(0);

      window.requestAnimationFrame(() => {
        scrollElementIntoViewWithOffset(listingsTabRef.current, { extraOffset: 16 });
      });
      return;
    }

    if (tabParam === "favorites") {
      setTab(1);

      window.requestAnimationFrame(() => {
        scrollElementIntoViewWithOffset(favoritesTabRef.current, { extraOffset: 16 });
      });
    }

    if (tabParam === "settings") {
      setTab(2);

      window.requestAnimationFrame(() => {
        scrollElementIntoViewWithOffset(settingsTabRef.current, { extraOffset: 16 });
      });
    }
  }, [location.search]);

  useEffect(() => {
    if (tab !== 1) return;
    loadFavorites().catch(() => {});
  }, [tab, storedUser.id]);

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
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{tierInfo.activeListings}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Rating</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{hasRating ? reviewStats.averageRating.toFixed(2) : "--"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Reviews</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{reviewStats.reviewCount}</Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
        <Tab id="listings-tab" ref={listingsTabRef} label="Listings" />
        <Tab id="favorites-tab" ref={favoritesTabRef} label="Favorites" />
        <Tab id="settings-tab" label="Account settings" />
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
        <>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            My Favorites
          </Typography>

          {favoritesLoading ? (
            <LoadingState message="Loading favorites..." />
          ) : favoriteProperties.length > 0 ? (
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {favoriteProperties.map((property) => (
                <Grid item xs={12} sm={6} md={4} key={property._id}>
                  <PropertyCard
                    property={property}
                    onWishlistToggle={handleRemoveFavorite}
                    isWishlisted
                    showWishlist
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <NoFavorites />
          )}
        </>
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

          <Card sx={{ p: 3, borderRadius: 3, maxWidth: 520 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              For account security, password updates are confirmed through an email link valid for 30 minutes.
            </Typography>
            <Button
              variant="contained"
              onClick={handleRequestPasswordChange}
              disabled={passwordEmailLoading}
            >
              {passwordEmailLoading ? "Sending..." : "Change password"}
            </Button>
          </Card>

          {/* Subscription Management */}
          <Card sx={{ p: 3, borderRadius: 3, maxWidth: 520 }}>
            <Typography id="host-status" ref={settingsTabRef} variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Host Status
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 0.25, fontSize: "0.8rem", lineHeight: 1.4 }}
            >
              Become a verified host to unlock more listing features and gain traveler trust.
              {showHostFlavorText && " Manage your subscription or choose a plan to get started.\n\nVerified hosts have an active subscription and have completed the onboarding process. If you're already a host but not verified, please check your email for onboarding instructions or contact support.  Subscription status is synced with our payment provider, but you can manually sync if you've recently made changes to your subscription."}
            </Typography>
            <Button
              variant="text"
              size="small"
              onClick={() => setShowHostFlavorText((prev) => !prev)}
              sx={{ p: 0, mb: 2, minWidth: "auto", textTransform: "none", fontSize: "0.75rem", lineHeight: 1.2 }}
            >
              {showHostFlavorText ? "Show less" : "Show more"}
            </Button>
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
                  sx={{
                    minWidth: 200,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    ...({
                      animation: "checkoutPulse 1.1s ease",
                    }),
                    "@keyframes checkoutPulse": {
                      "0%": { transform: "scale(1)" },
                      "40%": { transform: "scale(1.06)" },
                      "70%": { transform: "scale(0.98)" },
                      "100%": { transform: "scale(1)" },
                    },
                  }}
                >
                  {billingLoading
                    ? "Opening portal..."
                    : isIosNative
                      ? "Manage on web"
                      : "Manage subscription"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleStartSubscription}
                  // disable start subscription button if in iOS native app
                  disabled={isIosNative}
                >
                  {isIosNative ? "Choose on web" : "Choose a plan"}
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={handleSyncSubscription}
                disabled={billingLoading || isIosNative}
              >
                {billingLoading ? "Syncing..." : isIosNative ? "Sync Subscription on Web" : "Sync Subscription"}
              </Button>
            </Box>
          </Card>


          {/* Tier & Listing Limits (Host only) */}
          {storedUser.role === "host" && (
            <Card sx={{ p: 3, borderRadius: 3, maxWidth: 520, border: "2px solid #e0e0e0" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                💰 Current Plan
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {tierInfo.tierName === "Free" 
                  ? "Free plan - No active subscription"
                  : `${tierInfo.tierName} Plan (${tierInfo.activeListings}/${tierInfo.listingLimit} listings used)`
                }
              </Typography>
              <Box sx={{ mb: 2, p: 2, backgroundColor: "background.paper", borderRadius: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Active Listings</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {tierInfo.activeListings} / {tierInfo.listingLimit}
                  </Typography>
                </Box>
                <Box sx={{ width: "100%", height: 6, backgroundColor: "#ddd", borderRadius: 3, overflow: "hidden" }}>
                  <Box
                    sx={{
                      height: "100%",
                      width: `${tierInfo.listingLimit > 0 ? (tierInfo.activeListings / tierInfo.listingLimit) * 100 : 0}%`,
                      backgroundColor: tierInfo.canAddMore ? "#4caf50" : "#ff9800",
                      transition: "width 0.3s ease"
                    }}
                  />
                </Box>
              </Box>
              <Button
                fullWidth
                variant={isSubscriptionActive ? "outlined" : "contained"}
                color={isSubscriptionActive && !tierInfo.canAddMore ? "warning" : "primary"}
                onClick={() =>
                  isIosNative ?
                  snackbar("Subscription management is not available inside the iOS app. Please visit our website to manage your subscription.", "info",
                    {
                      force: true,
                      action: {
                        label: "View Pricing",
                        href: "https://beds4crew-o40r.onrender.com/pricing",
                        type: "link"
                      }
                    }
                  ) 
                  : navigate("/pricing")
                }
                sx={{ mt: 1 }}
              >
                {isIosNative
                  ? "Manage Plan on Web"
                  : isSubscriptionActive
                    ? "Upgrade Plan"
                    : "Choose a Plan"}
              </Button>
            </Card>
          )}
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
