import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Badge,
  Button,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  Popover,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
} from "@mui/material";
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
import MessageIcon from "@mui/icons-material/Message";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { logout, fetchWithAuth, API_URL } from "../utils/api";
import { useThemeMode } from "../contexts/ThemeContext";
import GlobalSearchBar from "./GlobalSearchBar";
import CategoryNav from "./CategoryNav";
import SiteFooter from "./SiteFooter";

const drawerWidth = 280;
const categories = [
  { value: "apartment", label: "Apartments" },
  { value: "condo", label: "Condos" },
  { value: "house", label: "Houses" },
  { value: "hostel", label: "Hostels" },
  { value: "flat", label: "Flats" },
  { value: "villa", label: "Villas" },
  { value: "shared", label: "Shared Beds" },
];

function isEmpty(obj) {
  if (obj === null || typeof obj === 'undefined') {
    return false;
  }
  return Object.keys(obj).length === 0;
};

export default function NavigationDrawer({ children }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [pollInterval, setPollInterval] = useState(5000);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const [megaAnchor, setMegaAnchor] = useState(null);
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { mode, toggleTheme } = useThemeMode();
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up("md"));

  useEffect(() => {
    if (!isEmpty(user)) {
      fetchUnreadCount();
      const interval = setInterval(() => {
        fetchUnreadCount();
        setPollInterval(prev => Math.min(prev + 5000, 30000));
      }, pollInterval);
      return () => clearInterval(interval);
    }
  }, [user.id, pollInterval]);

  useEffect(() => {
    if (open) {
      setPollInterval(5000);
    }
  }, [open]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/bookings/unread/count`);
      
      // If unauthorized, silently skip (user might be logging out or token expired)
      if (res.status === 401) {
        setUnreadCount(0);
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const newCount = data.unreadCount || 0;

      if (newCount > previousUnreadCount && previousUnreadCount !== 0) {
        snackbar(`You have ${newCount} new message${newCount > 1 ? 's' : ''}!`, "info");
        setPollInterval(5000);
      }

      setPreviousUnreadCount(newCount);
      setUnreadCount(newCount);
    } catch (error) {
      // Log but don't show error to avoid spam in console
      if (error.message !== 'HTTP 401') {
        console.error("Failed to fetch unread count:", error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    snackbar("Logged out successfully", "info");
    navigate("/login");
  };

  const clickedIconLink = (link) => {
    setOpen(false);
    navigate(link);
  };

  const handleTitleClick = () => {
    setOpen(false);
    navigate("/");
  };

  const handleBackdropClick = () => {
    setOpen(false);
  };

  const handleSearchSubmit = ({ query, category }) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (category) params.set("category", category);
    navigate(`/properties${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleAccountMenu = (event) => {
    setAccountAnchor(event.currentTarget);
  };

  const closeAccountMenu = () => {
    setAccountAnchor(null);
  };

  const openMegaMenu = (event) => {
    setMegaAnchor(event.currentTarget);
  };

  const closeMegaMenu = () => {
    setMegaAnchor(null);
  };

  const drawer = (
    <Box sx={{ width: drawerWidth }}>
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Beds4Crew
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Marketplace navigation
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItemButton onClick={() => (clickedIconLink("/"))}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/properties"))}>
          <ListItemIcon><HotelIcon /></ListItemIcon>
          <ListItemText primary="Explore" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/browse"))}>
          <ListItemIcon><PublicIcon /></ListItemIcon>
          <ListItemText primary="Map View" />
        </ListItemButton>
        <ListItemButton onClick={() => (clickedIconLink("/support"))}>
          <ListItemIcon><SupportIcon /></ListItemIcon>
          <ListItemText primary="Support" />
        </ListItemButton>
        {user.id === "698c112bbc6f9ffd822acf3c" && (
          <ListItemButton onClick={() => (clickedIconLink("/admin"))}>
            <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
            <ListItemText primary="Admin" />
          </ListItemButton>
        )}
      </List>
      <Divider sx={{ my: 1 }} />
      <Accordion disableGutters elevation={0} sx={{ px: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>Categories</AccordionSummary>
        <AccordionDetails>
          <List dense>
            {categories.map((category) => (
              <ListItemButton key={category.value} onClick={() => clickedIconLink(`/properties?category=${category.value}`)}>
                <ListItemText primary={category.label} />
              </ListItemButton>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
      <Divider sx={{ my: 1 }} />
      <List>
        <ListItemButton onClick={() => (clickedIconLink(isEmpty(user) ? "/register" : "/profile"))}>
          <ListItemIcon><AccountCircleIcon /></ListItemIcon>
          <ListItemText primary={isEmpty(user) ? "Register" : "Profile"} />
        </ListItemButton>
        {user.role === "guest" && (
          <>
            <ListItemButton onClick={() => (clickedIconLink("/wishlist"))}>
              <ListItemIcon><FavoriteIcon /></ListItemIcon>
              <ListItemText primary="Wishlist" />
            </ListItemButton>
            <ListItemButton onClick={() => (clickedIconLink("/trips"))}>
              <ListItemIcon>
                <Badge badgeContent={unreadCount} color="error">
                  <HotelIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Trips" />
            </ListItemButton>
          </>
        )}
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
              <ListItemIcon>
                <Badge badgeContent={unreadCount} color="error">
                  <SettingsIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Reservations" />
            </ListItemButton>
          </>
        )}
      </List>
      <Divider sx={{ my: 1 }} />
      <List>
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
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2, minHeight: { xs: 64, md: 72 } }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(true)} sx={{ display: { md: "none" } }}>
            <Badge badgeContent={unreadCount} color="error">
              <MenuIcon />
            </Badge>
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 800, cursor: "pointer" }}
            onClick={handleTitleClick}
          >
            Beds4Crew
          </Typography>
          {isDesktop && (
            <Box sx={{ flex: 1, maxWidth: 720 }}>
              <GlobalSearchBar onSubmit={handleSearchSubmit} />
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
            <Button
              variant="contained"
              color="primary"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
              onClick={() => navigate("/properties")}
            >
              Find a Bed
            </Button>
            <IconButton
              color="inherit"
              aria-label="Messages"
              onClick={() => {
                if (user.role === "host") {
                  navigate("/reservations");
                } else if (user.role === "guest") {
                  navigate("/trips");
                } else {
                  navigate("/support?topic=messages");
                }
              }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <MessageIcon />
              </Badge>
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="Support"
              onClick={() => navigate("/support#top")}
            >
              <SupportAgentIcon />
            </IconButton>
            <IconButton color="inherit" onClick={handleAccountMenu} aria-label="Account menu">
              <Avatar sx={{ width: 32, height: 32 }}>
                {user.firstName?.[0] || "U"}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
        <Box sx={{ borderTop: 1, borderColor: "divider", backgroundColor: "background.paper" }}>
          <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 1, sm: 2 }, display: "flex", alignItems: "center", gap: 2, py: 1, flexWrap: "wrap" }}>
            <Button variant="text" sx={{ fontWeight: 600 }} onClick={() => navigate("/")}>Home</Button>
            <Button variant="text" sx={{ fontWeight: 600 }} onClick={() => navigate("/properties")}>Explore</Button>
            <Button variant="text" sx={{ fontWeight: 600 }} onClick={() => navigate("/browse")}>Map</Button>
            {/* <Button variant="text" sx={{ fontWeight: 600 }} onClick={() => navigate("/support")}>Support</Button> */}
            <Button
              variant="text"
              sx={{ fontWeight: 600 }}
              onMouseEnter={openMegaMenu}
              onClick={openMegaMenu}
            >
              Categories
            </Button>
            {isDesktop && (
              <CategoryNav
                categories={categories}
                onSelect={(category) => navigate(`/properties?category=${category.value}`)}
              />
            )}
            {!isDesktop && (
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <GlobalSearchBar size="small" onSubmit={handleSearchSubmit} />
              </Box>
            )}
          </Box>
        </Box>
      </AppBar>

      <Popover
        open={Boolean(megaAnchor)}
        anchorEl={megaAnchor}
        onClose={closeMegaMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { p: 3, maxWidth: 600 } }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Explore categories
        </Typography>
        <Grid container spacing={2}>
          {categories.map((category) => (
            <Grid item xs={6} key={category.value}>
              <Button
                fullWidth
                variant="outlined"
                sx={{ justifyContent: "flex-start", textTransform: "none" }}
                onClick={() => {
                  closeMegaMenu();
                  navigate(`/properties?category=${category.value}`);
                }}
              >
                {category.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Popover>

      <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={closeAccountMenu}>
        {(isEmpty(user)
          ? [
              <MenuItem key="login" onClick={() => { closeAccountMenu(); navigate("/login"); }}>Sign in</MenuItem>,
              <MenuItem key="register" onClick={() => { closeAccountMenu(); navigate("/register"); }}>Create account</MenuItem>,
            ]
          : [
              <MenuItem key="profile" onClick={() => { closeAccountMenu(); navigate("/profile"); }}>Profile</MenuItem>,
              ...(user.role === "guest"
                ? [
                    <MenuItem key="wishlist" onClick={() => { closeAccountMenu(); navigate("/wishlist"); }}>Wishlist</MenuItem>,
                    <MenuItem key="trips" onClick={() => { closeAccountMenu(); navigate("/trips"); }}>Trips</MenuItem>,
                  ]
                : []),
              ...(user.role === "host"
                ? [
                    <MenuItem key="listings" onClick={() => { closeAccountMenu(); navigate("/my-listings"); }}>Listings</MenuItem>,
                    <MenuItem key="reservations" onClick={() => { closeAccountMenu(); navigate("/reservations"); }}>Reservations</MenuItem>,
                  ]
                : []),
            ])
        }
        <MenuItem key="theme" onClick={() => { closeAccountMenu(); toggleTheme(); }}>
          {mode === "light" ? "Dark Mode" : "Light Mode"}
        </MenuItem>
        {!isEmpty(user) && [
          <Divider key="divider" />,
          <MenuItem key="logout" onClick={() => { closeAccountMenu(); handleLogout(); }}>Log out</MenuItem>,
        ]}
      </Menu>

      <Drawer
        anchor="left"
        open={open}
        onClose={handleBackdropClick}
        sx={{ [`& .MuiDrawer-paper`]: { width: drawerWidth } }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flex: 1, py: { xs: 2, md: 4 } }}>
        {children}
      </Box>
      <SiteFooter />
    </Box>
  );
}
