import React, { useState, useEffect } from "react";
import { Typography, Box, Button, Paper, Divider } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PaymentIcon from "@mui/icons-material/Payment";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function SupportPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(storedUser);
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
