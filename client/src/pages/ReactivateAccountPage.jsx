import React, { useMemo, useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { API_URL, getStoredUser, setStoredUser } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function ReactivateAccountPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => Boolean(token), [token]);

  const confirmReactivation = async () => {
    if (!token) {
      setError("Missing reactivation token.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/auth/reactivation/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to reactivate account");
      }

      const currentUser = getStoredUser();
      if (currentUser?.id) {
        setStoredUser({
          ...currentUser,
          isActive: true,
          accountDisabledAt: null,
          reactivationEligibleAt: null,
        });
      }

      setSuccess(data?.message || "Account reactivated successfully.");
    } catch (confirmError) {
      setError(confirmError.message || "Failed to reactivate account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={commonStyles.contentContainer}>
      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, maxWidth: 680, mx: "auto" }}>
        <Typography variant="h4" sx={commonStyles.pageTitle}>
          Reactivate Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Confirm reactivation using the secure email link. This token is valid for 30 minutes.
        </Typography>

        {!canSubmit && (
          <Alert severity="error" sx={{ mb: 2 }}>
            This reactivation link is missing a token.
          </Alert>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            variant="contained"
            onClick={confirmReactivation}
            disabled={!canSubmit || loading}
          >
            {loading ? "Confirming..." : "Confirm Reactivation"}
          </Button>
          <Button variant="outlined" component={RouterLink} to="/login">
            Go to Login
          </Button>
        </Stack>

        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>
    </Box>
  );
}
