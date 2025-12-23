import React, { useState } from "react";
import { TextField, Button, Typography, Box, Avatar, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    profileImage: null,
    role: "guest",
  });
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const handleChange = (e) => {
    if(e.target.name === "profileImage") {
      setForm({...form, profileImage: e.target.files[0]});
      setPreview(URL.createObjectURL(e.target.files[0]));
    } else {
      setForm({...form, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if(form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    
    form.email = form.email.toLowerCase();
    const formData = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if(key === "profileImage" && val) formData.append(key, val);
      else if(key !== "confirmPassword") formData.append(key, val);
    });

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message || "Registration failed");
      snackbar("Registration successful! Please sign in.", "success");
      navigate("/login");
    } catch (err) {
      snackbar(err.message, "error");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={commonStyles.authContainer}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h4" sx={commonStyles.pageTitle} align="center">
          Create Account
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Join Beds4Crew to start booking or hosting
        </Typography>
        
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <TextField 
            name="firstName" 
            label="First Name" 
            fullWidth 
            required 
            margin="normal" 
            value={form.firstName} 
            onChange={handleChange}
            disabled={loading}
          />
          <TextField 
            name="lastName" 
            label="Last Name" 
            fullWidth 
            required 
            margin="normal" 
            value={form.lastName} 
            onChange={handleChange}
            disabled={loading}
          />
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
          <TextField 
            name="confirmPassword" 
            label="Confirm Password" 
            type="password" 
            fullWidth 
            required 
            margin="normal" 
            value={form.confirmPassword} 
            onChange={handleChange}
            disabled={loading}
          />
          
          <Button 
            variant="outlined" 
            component="label" 
            fullWidth 
            sx={{ mt: 2, mb: 1 }}
            disabled={loading}
          >
            Upload Profile Image (Optional)
            <input 
              name="profileImage" 
              type="file" 
              hidden 
              accept="image/*" 
              onChange={handleChange}
              disabled={loading}
            />
          </Button>
          
          {preview && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <Avatar src={preview} sx={{ width: 80, height: 80 }} />
            </Box>
          )}
          
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
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>
          
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Already have an account?{" "}
            <Button 
              variant="text" 
              onClick={() => navigate("/login")}
              sx={{ textTransform: "none" }}
            >
              Sign In
            </Button>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
}
