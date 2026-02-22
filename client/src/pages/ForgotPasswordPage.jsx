import React, { useState } from "react";
import { Box, Paper, Typography, TextField, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import { useSnackbar } from "../components/AppSnackbar";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/password/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to request password reset");
      }

      setSubmitted(true);
      snackbar("If that account exists, a reset email has been sent.", "success");
    } catch (error) {
      snackbar(error.message || "Failed to request password reset", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={commonStyles.authContainer}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" sx={commonStyles.pageTitle} align="center">
          Forgot Password
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Enter your email and we&apos;ll send you a password reset link valid for 30 minutes.
        </Typography>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={commonStyles.fullWidthButton}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            If an account exists for this email, a password reset link has been sent.
          </Typography>
        )}

        <Button variant="text" onClick={() => navigate("/login")} sx={{ textTransform: "none", mt: 1 }}>
          Back to sign in
        </Button>
      </Paper>
    </Box>
  );
}
