import React, { useState, useEffect } from "react";
import { Typography, Box, Button, Paper, Divider, Switch, FormControlLabel, FormGroup } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PaymentIcon from "@mui/icons-material/Payment";
import EmailIcon from "@mui/icons-material/Email";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function SupportPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState({
    bookingConfirmation: true,
    bookingCancellation: true,
    newBookingRequest: true,
    newMessage: true,
    welcomeEmail: true
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(storedUser);
    
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
  }, []);

  const handleCallSupport = () => {
    snackbar("Notifying support...", "info");
    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  const handleSignUpForHosting = () => {
    snackbar("Check email for instructions", "success");
    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  const handleToggleRole = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/users/toggle-role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      const data = await res.json();
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      snackbar(data.message, "success");
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      snackbar(error.message || "Failed to toggle role", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePayment = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/users/toggle-payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      
      const data = await res.json();
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      snackbar(data.message, "success");
    } catch (error) {
      snackbar(error.message || "Failed to toggle payment status", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPreferenceChange = async (preference) => {
    const newValue = !emailPreferences[preference];
    
    // Optimistic update
    setEmailPreferences(prev => ({ ...prev, [preference]: newValue }));
    
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/email-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [preference]: newValue } })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update preferences");
      }
      
      const data = await res.json();
      snackbar(data.message + " - Confirmation sent to your email", "success");
    } catch (error) {
      // Revert on error
      setEmailPreferences(prev => ({ ...prev, [preference]: !newValue }));
      snackbar(error.message || "Failed to update preference", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/properties/admin/clear-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        throw new Error("Failed to clear cache");
      }
      
      const data = await res.json();
      snackbar(data.message, "success");
    } catch (error) {
      snackbar(error.message || "Failed to clear cache", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={commonStyles.authContainer}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" sx={commonStyles.pageTitle} align="center">
          Support Center
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          How can we help you today?
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PhoneIcon />}
            onClick={handleCallSupport}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Click to Call Support
          </Button>

          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<PersonAddIcon />}
            onClick={handleSignUpForHosting}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Sign Up for Hosting
          </Button>
        </Box>

        {/* Email Notification Preferences */}
        {user && user.id && (
          <>
            <Divider sx={{ my: 4 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <EmailIcon color="primary" />
              <Typography variant="h6" align="left">
                Email Notifications
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage which email notifications you receive. Password-related emails cannot be disabled.
            </Typography>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.bookingConfirmation}
                    onChange={() => handleEmailPreferenceChange('bookingConfirmation')}
                    disabled={loading}
                  />
                }
                label="Booking Confirmations"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.bookingCancellation}
                    onChange={() => handleEmailPreferenceChange('bookingCancellation')}
                    disabled={loading}
                  />
                }
                label="Booking Cancellations"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.newBookingRequest}
                    onChange={() => handleEmailPreferenceChange('newBookingRequest')}
                    disabled={loading}
                  />
                }
                label="New Booking Requests (Hosts)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.newMessage}
                    onChange={() => handleEmailPreferenceChange('newMessage')}
                    disabled={loading}
                  />
                }
                label="New Messages"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.welcomeEmail}
                    onChange={() => handleEmailPreferenceChange('welcomeEmail')}
                    disabled={loading}
                  />
                }
                label="Welcome Emails (for new users)"
              />
            </FormGroup>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              Changes will be confirmed via email
            </Typography>
          </>
        )}

        {/* w can we help you today?
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PhoneIcon />}
            onClick={handleCallSupport}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Click to Call Support
          </Button>

          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<PersonAddIcon />}
            onClick={handleSignUpForHosting}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Sign Up for Hosting
          </Button>
        </Box>

        {/* Admin Controls */}
        {user && 0 ? (
          <>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h6" align="center" color="text.secondary" sx={commonStyles.sectionTitle}>
              Admin Controls
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
              Current Role: <strong>{user.role}</strong> | Payment Status: <strong>{user.hasPaid ? "Paid" : "Not Paid"}</strong>
            </Typography>
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Button
                variant="outlined"
                color="info"
                size="large"
                startIcon={<SwapHorizIcon />}
                onClick={handleToggleRole}
                disabled={loading}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Toggle Role (Guest ↔ Host)
              </Button>

              <Button
                variant="outlined"
                color="warning"
                size="large"
                startIcon={<PaymentIcon />}
                onClick={handleTogglePayment}
                disabled={loading}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Toggle Payment Status
              </Button>

              <Button
                variant="outlined"
                color="error"
                size="large"
                onClick={handleClearCache}
                disabled={loading}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Clear Server Cache
              </Button>
            </Box>
          </>
        ) : null}
      </Paper>
    </Box>
  );
}
