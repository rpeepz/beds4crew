import React, { useState } from "react";
import { TextField, Button, Typography, Box, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { setTokens, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      // Store both tokens
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      snackbar("Login successful");
      navigate("/");
    } catch (err) {
      snackbar("Login failed", "error");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={commonStyles.authContainer}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" sx={commonStyles.pageTitle} align="center">
          Welcome Back
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Sign in to continue to Beds4Crew
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            name="email"
            label="Email"
            type="email"
            fullWidth
            required
            margin="normal"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            fullWidth
            required
            margin="normal"
            value={form.password}
            onChange={handleChange}
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
            color="primary" 
            fullWidth
            disabled={loading}
            sx={commonStyles.fullWidthButton}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Don't have an account?{" "}
            <Button 
              variant="text" 
              onClick={() => navigate("/register")}
              sx={{ textTransform: "none" }}
            >
              Sign Up
            </Button>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
}
