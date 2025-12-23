import React, { useState } from "react";
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider, Toolbar, AppBar, Typography, Box, Button } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HotelIcon from "@mui/icons-material/Hotel";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import PublicIcon from "@mui/icons-material/Public";
import LogoutIcon from "@mui/icons-material/Logout";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SupportIcon from "@mui/icons-material/Support";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { logout } from "../utils/api";
import { useThemeMode } from "../contexts/ThemeContext";

const drawerWidth = 220;

function isEmpty(obj) {
  // First, check if the object is null or undefined
  if (obj === null || typeof obj === 'undefined') {
    return false; // It exists, just not as an object (or it's null/undefined)
  }
  
  // Then, check the number of own properties
  return Object.keys(obj).length === 0;
};

export default function NavigationDrawer({ children }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { mode, toggleTheme } = useThemeMode();

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    snackbar("Logged out successfully", "info");
    navigate("/login");
  };

  const clickedIconLink = (link) => {
    setOpen(false);
    navigate(link);
  }

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        <ListItemButton onClick={() => (clickedIconLink("/"))}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink(isEmpty(user) ? "/register" : "/profile"))}>
          <ListItemIcon><AccountCircleIcon /></ListItemIcon>
          <ListItemText primary={isEmpty(user) ? "Register" : "Profile"} />
        </ListItemButton>
        
        {/* Guest-only menu items */}
        {user.role === "guest" && (
          <>
            <ListItemButton onClick={() => (clickedIconLink("/wishlist"))}>
              <ListItemIcon><FavoriteIcon /></ListItemIcon>
              <ListItemText primary="Wishlist" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/trips"))}>
              <ListItemIcon><HotelIcon /></ListItemIcon>
              <ListItemText primary="My Trips" />
            </ListItemButton>
          </>
        )}

        {/* Host-only menu items */}
        {user.role === "host" && (
          <>
            <ListItemButton onClick={() => (clickedIconLink("/my-listings"))}>
              <ListItemIcon><BusinessIcon /></ListItemIcon>
              <ListItemText primary="My Listings" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/add-property"))}>
              <ListItemIcon><AddCircleIcon /></ListItemIcon>
              <ListItemText primary="Add Property" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/reservations"))}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Reservations" />
            </ListItemButton>
          </>
        )}

        {/* Available to both */}
        <ListItemButton onClick={() => (clickedIconLink("/properties"))}>
          <ListItemIcon><HotelIcon /></ListItemIcon>
          <ListItemText primary="Browse Properties" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/browse"))}>
          <ListItemIcon><PublicIcon /></ListItemIcon>
          <ListItemText primary="Map View" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/support"))}>
          <ListItemIcon><SupportIcon /></ListItemIcon>
          <ListItemText primary="Support" />
        </ListItemButton>

        <Divider sx={{ my: 1 }} />
        
        {/* Theme Toggle Button */}
        <ListItemButton onClick={toggleTheme}>
          <ListItemIcon>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </ListItemIcon>
          <ListItemText primary={mode === 'light' ? 'Dark Mode' : 'Light Mode'} />
        </ListItemButton>
        
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex"}}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Beds4Crew&nbsp;&copy;
          </Typography>
          {isEmpty(user) && (
            <IconButton color="inherit" edge="end" onClick={() => navigate("/login")}>
              <AccountCircleIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: 'auto',
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
        }}
      >
        {drawer}
      </Drawer>
      {/* Main content, push right if drawer is open */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, ml: open ? `${drawerWidth}px` : 0, transition: "margin .2s" }}>
        {children}
      </Box>
    </Box>
  );
}
