import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { API_URL, fetchWithAuth, getStoredUser, logout, setStoredUser } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

export default function DisabledAccountPage() {
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reactivationEligibleAt, setReactivationEligibleAt] = useState(() => getStoredUser().reactivationEligibleAt || null);

  useEffect(() => {
    fetchWithAuth(`${API_URL}/auth/me`)
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!data) return;

        const updatedUser = {
          ...getStoredUser(),
          ...data,
          id: data._id || data.id,
          isActive: data.isActive !== false,
          reactivationEligibleAt: data.reactivationEligibleAt || null,
        };

        setStoredUser(updatedUser);
        setReactivationEligibleAt(updatedUser.reactivationEligibleAt || null);

        if (updatedUser.isActive !== false) {
          navigate("/", { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  const holdNotice = useMemo(() => {
    if (!reactivationEligibleAt) {
      return "You can request a reactivation email from this page.";
    }

    return `You may only re-enable every 30 days. Next eligible time: ${formatDateTime(reactivationEligibleAt)}.`;
  }, [reactivationEligibleAt]);

  const requestReactivationEmail = async () => {
    try {
      setRequesting(true);
      setError("");
      setSuccess("");

      const response = await fetchWithAuth(`${API_URL}/auth/reactivation/request`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.reactivationEligibleAt) {
          setReactivationEligibleAt(data.reactivationEligibleAt);
        }
        throw new Error(data?.message || "Failed to request reactivation email");
      }

      setSuccess(data?.message || "Reactivation email sent. Check your inbox.");
    } catch (requestError) {
      setError(requestError.message || "Failed to request reactivation email");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Box sx={commonStyles.contentContainer}>
      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, maxWidth: 680, mx: "auto" }}>
        <Typography variant="h4" sx={commonStyles.pageTitle}>
          Your Account Is Disabled
        </Typography>
        <Typography variant="body1" sx={{ mb: 1.5 }}>
          Access is restricted while your account is disabled.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {holdNotice}
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={requestReactivationEmail}
            disabled={requesting}
          >
            {requesting ? "Sending..." : "Send Reactivation Email"}
          </Button>
          <Button variant="outlined" component={RouterLink} to="/support">
            Contact Support
          </Button>
          <Button variant="text" color="inherit" onClick={logout}>
            Log Out
          </Button>
        </Stack>

        {success && <Alert severity="success" sx={{ mb: 1.5 }}>{success}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </Paper>
    </Box>
  );
}
