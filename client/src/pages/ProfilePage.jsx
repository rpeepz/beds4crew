import React, { useState } from "react";
import { Box, TextField, Button, Typography, Avatar, IconButton, CircularProgress } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";

export default function ProfilePage() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [form, setForm] = useState({
    firstName: storedUser.firstName || "",
    lastName: storedUser.lastName || "",
  });
  const [profileImage, setProfileImage] = useState(storedUser.profileImagePath || "");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const snackbar = useSnackbar();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    const res = await fetchWithAuth(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      snackbar("Failed to update profile", "error");
      return;
    }
    const data = await res.json();
    localStorage.setItem("user", JSON.stringify(data));
    snackbar("Profile updated successfully");
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
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      snackbar("Profile photo updated successfully");
    } catch (err) {
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
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      snackbar("Profile photo removed successfully");
    } catch (err) {
      snackbar("Failed to remove photo", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 5 }}>
      <Typography variant="h5" mb={2}>My Profile</Typography>
      
      <Box sx={{ position: "relative", width: 96, height: 96, mx: "auto", mb: 2 }}>
        <Avatar 
          src={profileImage || ""} 
          sx={{ width: 96, height: 96 }}
        >
          {!profileImage && `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`}
        </Avatar>
        
        {uploading && (
          <CircularProgress 
            size={96} 
            sx={{ 
              position: "absolute", 
              top: 0, 
              left: 0,
              zIndex: 1
            }} 
          />
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 3 }}>
        <Button
          variant="outlined"
          component="label"
          startIcon={<PhotoCameraIcon />}
          disabled={uploading || deleting}
          size="small"
        >
          {profileImage ? "Change Photo" : "Upload Photo"}
          <input
            hidden
            accept="image/*"
            type="file"
            onChange={handlePhotoUpload}
          />
        </Button>
        
        {profileImage && (
          <IconButton
            color="error"
            onClick={handlePhotoRemove}
            disabled={uploading || deleting}
            size="small"
          >
            {deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          </IconButton>
        )}
      </Box>

      <form onSubmit={handleSubmit}>
        <TextField label="First Name" name="firstName" fullWidth margin="normal" value={form.firstName} onChange={handleChange} />
        <TextField label="Last Name" name="lastName" fullWidth margin="normal" value={form.lastName} onChange={handleChange} />
        <Button type="submit" fullWidth variant="contained" sx={{ my: 2 }}>Save</Button>
      </form>
    </Box>
  );
}
