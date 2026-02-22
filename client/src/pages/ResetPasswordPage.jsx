import React, { useMemo, useState } from "react";
import { Box, Paper, Typography, TextField, Button } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import { useSnackbar } from "../components/AppSnackbar";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing from the URL.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/password/confirm-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess(true);
      snackbar("Password updated successfully", "success");
    } catch (submitError) {
      setError(submitError.message || "Failed to reset password");
      snackbar(submitError.message || "Failed to reset password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={commonStyles.authContainer}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" sx={commonStyles.pageTitle} align="center">
          Reset Password
        </Typography>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <TextField
              label="New Password"
              type="password"
              fullWidth
              required
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              required
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />

            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={commonStyles.fullWidthButton}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your password has been changed. Please sign in with your new password.
            </Typography>
            <Button variant="contained" fullWidth onClick={() => navigate("/login")}>
              Go to Sign In
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}
