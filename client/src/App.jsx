import { lazy, Suspense, useEffect } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { SnackbarProvider } from "./components/AppSnackbar";
import NavigationDrawer from "./components/NavigationDrawer";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { fetchWithAuth, API_URL } from "./utils/api";

// Lazy load pages for code splitting
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AddPropertyPage = lazy(() => import("./pages/AddPropertyPage"));
const PropertyFeedPage = lazy(() => import("./pages/PropertyFeedPage"));
const PropertyDetailPage = lazy(() => import("./pages/PropertyDetailPage"));
const TripListPage = lazy(() => import("./pages/TripListPage"));
const HostListingsPage = lazy(() => import("./pages/HostListingsPage"));
const ReservationListPage = lazy(() => import("./pages/ReservationListPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const WishListPage = lazy(() => import("./pages/WishListPage"));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

// Loading component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress />
  </Box>
);

const RouteChangeEffects = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.blur === "function") {
      activeElement.blur();
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
};

function App() {
  useEffect(() => {
    // On app load, refresh user data from server to sync localStorage
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (storedUser?.id) {
      fetchWithAuth(`${API_URL}/auth/me`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            localStorage.setItem("user", JSON.stringify({
              id: data._id || data.id,
              email: data.email,
              role: data.role,
              firstName: data.firstName,
              lastName: data.lastName,
              profileImagePath: data.profileImagePath,
              hasPaid: data.hasPaid,
              phone: data.phone,
              bio: data.bio,
              subscriptionStatus: data.subscriptionStatus,
              subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd,
            }));
          }
        })
        .catch(err => console.error("Failed to refresh user data:", err));
    }
  }, []);

  return (
    <Router>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider>
          <NavigationDrawer>
            <RouteChangeEffects />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/register" element={<PublicRoute> <RegisterPage /> </PublicRoute>} />
                <Route path="/login" element={<PublicRoute> <LoginPage /> </PublicRoute>} />
                <Route path="/" element={<DashboardPage />} />
                <Route path="/add-property" element={<ProtectedRoute requiredRole="host"> <AddPropertyPage /> </ProtectedRoute>} />
                <Route path="/properties" element={<PropertyFeedPage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/property/:id" element={<PropertyDetailPage />} />
                <Route path="/trips" element={<ProtectedRoute requiredRole="guest"> <TripListPage /> </ProtectedRoute>} />
                <Route path="/my-listings" element={<ProtectedRoute> <HostListingsPage /> </ProtectedRoute>} />
                <Route path="/reservations" element={<ProtectedRoute> <ReservationListPage /> </ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute> <ProfilePage /> </ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute> <WishListPage /> </ProtectedRoute>} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/admin" element={<ProtectedRoute> <AdminPage /> </ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/login" />} />
              </Routes>
            </Suspense>
          </NavigationDrawer>
        </SnackbarProvider>
      </LocalizationProvider>
     </Router>
  );
}
export default App;
