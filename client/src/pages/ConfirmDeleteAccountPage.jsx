import React, { useMemo, useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { API_URL, clearTokens } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function ConfirmDeleteAccountPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit = useMemo(() => Boolean(token), [token]);

  const confirmDeletion = async () => {
    if (!token) {
      setError("Missing deletion token.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/users/confirm-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete account");
      }

      clearTokens();
      setSuccess(data?.message || "Account deleted successfully.");
    } catch (confirmError) {
      setError(confirmError.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={commonStyles.contentContainer}>
      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, maxWidth: 680, mx: "auto" }}>
        <Typography variant="h4" sx={commonStyles.pageTitle}>
          Confirm Account Deletion
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This action is permanent. Confirm only if you want to delete your account and all access.
        </Typography>

        {!canSubmit && (
          <Alert severity="error" sx={{ mb: 2 }}>
            This deletion link is missing a token.
          </Alert>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeletion}
            disabled={!canSubmit || loading || Boolean(success)}
          >
            {loading ? "Deleting..." : "Confirm Permanent Deletion"}
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
