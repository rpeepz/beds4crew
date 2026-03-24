import { forwardRef, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, AlertTitle, Snackbar, LinearProgress } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Slide from "@mui/material/Slide";

import { SnackbarProvider } from "./components/AppSnackbar";
import NavigationDrawer from "./components/NavigationDrawer";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { clearTokens, fetchJsonWithAuth, getAccessToken, getStoredUser, isAppTransportMode, setStoredUser, API_URL } from "./utils/api";
import { SUPPORT_INTERNAL_PATHS } from "./data/supportTopics";
import { useThemeMode } from "./contexts/ThemeContext";

// Lazy load pages for code splitting
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AddPropertyPage = lazy(() => import("./pages/AddPropertyPage"));
const PropertyFeedPage = lazy(() => import("./pages/PropertyFeedPage"));
const PropertyDetailPage = lazy(() => import("./pages/PropertyDetailPage"));
const TripListPage = lazy(() => import("./pages/TripListPage"));
const ReservationListPage = lazy(() => import("./pages/ReservationListPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const SupportResourcePage = lazy(() => import('./pages/SupportResourcePage'));
const SupportChatPage = lazy(() => import('./pages/SupportChatPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const DisabledAccountPage = lazy(() => import('./pages/DisabledAccountPage'));
const ReactivateAccountPage = lazy(() => import('./pages/ReactivateAccountPage'));
const ConfirmDeleteAccountPage = lazy(() => import('./pages/ConfirmDeleteAccountPage'));

// Loading component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress />
  </Box>
);

const CookieNoticeTransition = forwardRef(function CookieNoticeTransition(props, ref) {
  const { in: isOpen, ...rest } = props;
  return (
    <Slide
      ref={ref}
      {...rest}
      in={isOpen}
      direction={ "up" }
    />
  );
});

const RouteChangeEffects = () => {
  const location = useLocation();
  const previousLocationRef = useRef(null);

  useEffect(() => {
    const currentRoute = `${location.pathname}${location.search || ""}`;
    const previousRoute = previousLocationRef.current;

    if (previousRoute && previousRoute !== currentRoute) {
      sessionStorage.setItem("previousRoute", previousRoute);
    }
    sessionStorage.setItem("currentRoute", currentRoute);
    previousLocationRef.current = currentRoute;

    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.blur === "function") {
      activeElement.blur();
    }
  }, [location.pathname, location.search]);

  return null;
};

const DISABLED_ACCOUNT_PATH = "/account-disabled";
const REACTIVATE_ACCOUNT_PATH = "/reactivate-account";
const CONFIRM_DELETE_ACCOUNT_PATH = "/confirm-delete-account";

const DisabledAccountGuard = ({ children }) => {
  const location = useLocation();
  const accessToken = getAccessToken();
  const user = getStoredUser();
  const isDisabledAccount = Boolean(accessToken) && user?.isActive === false;
  const supportPaths = ["/support", "/support/chat", ...SUPPORT_INTERNAL_PATHS];
  const onSupportPath = supportPaths.includes(location.pathname);
  const onAllowedPath = location.pathname === DISABLED_ACCOUNT_PATH
    || location.pathname === REACTIVATE_ACCOUNT_PATH
    || location.pathname === CONFIRM_DELETE_ACCOUNT_PATH
    || onSupportPath;

  if (isDisabledAccount && !onAllowedPath) {
    return <Navigate to={DISABLED_ACCOUNT_PATH} replace />;
  }

  return children;
};

function App() {
  const { cookieNoticeDismissed, dismissCookieNotice } = useThemeMode();
  const isNativeApp = isAppTransportMode();
  const [showCookieNotice, setShowCookieNotice] = useState(false);
  const [consentStatus, setConsentStatus] = useState(null);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartYRef = useRef(0);
  const isPullingRef = useRef(false);
  const pullRefreshCooldownRef = useRef(0);

  const PULL_DISTANCE_TRIGGER = 82;
  const PULL_DISTANCE_MAX = 120;

  useEffect(() => {
    if (isNativeApp) {
      setConsentStatus(null);
      return;
    }

    fetch(`${API_URL}/analytics/consent/status`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((status) => {
        if (status) {
          setConsentStatus(status);
        }
      })
      .catch(() => {
        setConsentStatus(null);
      });
  }, [isNativeApp]);

  useEffect(() => {
    const showCookieNoticeEnabled = import.meta.env.VITE_SHOW_COOKIE_NOTICE !== 'false';
    const consentValue = consentStatus?.consentValue;
    const hasConsentDecision = consentValue === "granted" || consentValue === "denied";
    const requiresOptIn = Boolean(consentStatus?.requiredOptIn);
    const forcePrompt = requiresOptIn && !hasConsentDecision;

    const shouldShowNotice = !isNativeApp
      && showCookieNoticeEnabled
      && (forcePrompt || !cookieNoticeDismissed);

    setShowCookieNotice(shouldShowNotice);
  }, [cookieNoticeDismissed, consentStatus, isNativeApp]);

  useEffect(() => {
    // On app load, refresh user data from server to sync localStorage/session
    const hasSession = localStorage.getItem("authSession") === "true";
    const storedUser = getStoredUser();

    if (storedUser?.id || hasSession) {
      fetchJsonWithAuth(`${API_URL}/auth/me`)
        .then(data => {
          if (data) {
            setStoredUser({
              id: data._id || data.id,
              email: data.email,
              role: data.role,
              firstName: data.firstName,
              lastName: data.lastName,
              profileImagePath: data.profileImagePath,
              hasPaid: data.hasPaid,
              isActive: data.isActive !== false,
              accountDisabledAt: data.accountDisabledAt || null,
              reactivationEligibleAt: data.reactivationEligibleAt || null,
              phone: data.phone,
              bio: data.bio,
              isAdmin: !!data.isAdmin,
              subscriptionStatus: data.subscriptionStatus,
              subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd,
            });
          }
        })
        .catch(() => clearTokens());
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTouchStart = (event) => {
      if (window.scrollY > 0 || isPullRefreshing) {
        isPullingRef.current = false;
        return;
      }

      const firstTouch = event.touches?.[0];
      if (!firstTouch) return;

      pullStartYRef.current = firstTouch.clientY;
      isPullingRef.current = true;
      setPullDistance(0);
    };

    const handleTouchMove = (event) => {
      if (!isPullingRef.current || isPullRefreshing) return;

      const firstTouch = event.touches?.[0];
      if (!firstTouch) return;

      const deltaY = firstTouch.clientY - pullStartYRef.current;
      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      const nextDistance = Math.min(PULL_DISTANCE_MAX, deltaY * 0.45);
      setPullDistance(nextDistance);
      if (nextDistance > 0) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current || isPullRefreshing) {
        setPullDistance(0);
        return;
      }

      const triggerRefresh = pullDistance >= PULL_DISTANCE_TRIGGER;
      isPullingRef.current = false;
      setPullDistance(0);

      if (!triggerRefresh) return;

      const now = Date.now();
      if (now - pullRefreshCooldownRef.current < 1200) {
        return;
      }

      pullRefreshCooldownRef.current = now;
      setIsPullRefreshing(true);
      window.dispatchEvent(new CustomEvent("app:pull-to-refresh", { detail: { source: "gesture", at: now } }));

      window.setTimeout(() => {
        setIsPullRefreshing(false);
      }, 900);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isPullRefreshing, pullDistance]);

  const handleDismissCookieNotice = () => {
    dismissCookieNotice();
    setShowCookieNotice(false);
  };

  const submitAnalyticsConsent = async (analytics) => {
    try {
      await fetch(`${API_URL}/analytics/consent`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analytics }),
      });

      const refreshed = await fetch(`${API_URL}/analytics/consent/status`, {
        credentials: "include",
      });
      if (refreshed.ok) {
        const data = await refreshed.json();
        setConsentStatus(data);
      }
    } catch {
      // no-op: banner remains visible if consent update fails
    }
  };

  const handleAllowAnalytics = async () => {
    await submitAnalyticsConsent(true);
    dismissCookieNotice();
    setShowCookieNotice(false);
  };

  const handleDenyAnalytics = async () => {
    await submitAnalyticsConsent(false);
    dismissCookieNotice();
    setShowCookieNotice(false);
  };

  return (
    <Router>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider>
          <NavigationDrawer>
            {(pullDistance > 0 || isPullRefreshing) && (
              <Box
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: (theme) => theme.zIndex.appBar - 1,
                  px: 2,
                  mb: 1,
                }}
              >
                <LinearProgress
                  variant={isPullRefreshing ? "indeterminate" : "determinate"}
                  value={Math.min(100, (pullDistance / PULL_DISTANCE_TRIGGER) * 100)}
                  sx={{ borderRadius: 999 }}
                />
              </Box>
            )}
            <RouteChangeEffects />
            <Suspense fallback={<LoadingFallback />}>
              <DisabledAccountGuard>
                <Routes>
                  <Route path="/register" element={<PublicRoute> <RegisterPage /> </PublicRoute>} />
                  <Route path="/login" element={<PublicRoute> <LoginPage /> </PublicRoute>} />
                  <Route path="/forgot-password" element={<PublicRoute> <ForgotPasswordPage /> </PublicRoute>} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/reactivate-account" element={<ReactivateAccountPage />} />
                  <Route path="/confirm-delete-account" element={<ConfirmDeleteAccountPage />} />
                  <Route path="/account-disabled" element={<ProtectedRoute> <DisabledAccountPage /> </ProtectedRoute>} />
                  <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/add-property" element={<ProtectedRoute requiredRole="host"> <AddPropertyPage /> </ProtectedRoute>} />
                  <Route path="/properties" element={<PropertyFeedPage />} />
                  <Route path="/browse" element={<BrowsePage />} />
                  <Route path="/property/:id" element={<PropertyDetailPage />} />
                  <Route path="/trips" element={<ProtectedRoute requiredRole="guest"> <TripListPage /> </ProtectedRoute>} />
                  <Route path="/my-listings" element={<ProtectedRoute requiredRole="host"> <Navigate to="/profile?tab=listings#listings-tab" replace /> </ProtectedRoute>} />
                  <Route path="/favorites" element={<ProtectedRoute> <Navigate to="/profile?tab=favorites#favorites-tab" replace /> </ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute> <Navigate to="/profile?tab=settings#settings-tab" replace /> </ProtectedRoute>} />
                  <Route path="/reservations" element={<ProtectedRoute requiredRole="host"> <ReservationListPage /> </ProtectedRoute>} />
                  <Route path="/review/:token" element={<ProtectedRoute> <ReviewPage /> </ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute> <ProfilePage /> </ProtectedRoute>} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/support/chat" element={<SupportChatPage />} />
                  {SUPPORT_INTERNAL_PATHS.map((path) => (
                    <Route key={path} path={path} element={<SupportResourcePage />} />
                  ))}
                  <Route path="/admin" element={<ProtectedRoute> <AdminPage /> </ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
              </DisabledAccountGuard>
            </Suspense>
            <Snackbar
              open={showCookieNotice}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              autoHideDuration={null}
              TransitionComponent={CookieNoticeTransition}
            >
              
              <Alert
                severity={consentStatus?.requiredOptIn ? "warning" : "info"}
                variant="filled"
                onClose={consentStatus?.requiredOptIn ? undefined : handleDismissCookieNotice}
                action={(
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button color="inherit" size="small" onClick={handleAllowAnalytics}>
                      Allow analytics
                    </Button>
                    <Button color="inherit" size="small" onClick={handleDenyAnalytics}>
                      Essential only
                    </Button>
                  </Box>
                )}
              ><AlertTitle>Cookie Preferences</AlertTitle>
                {consentStatus?.requiredOptIn
                  ? "To comply with regulations, we require your consent to use analytics cookies that help us improve the site. Please choose your preference."
                  : "We use cookies to understand site usage and improve our content."}
              </Alert>
            </Snackbar>
          </NavigationDrawer>
        </SnackbarProvider>
      </LocalizationProvider>
     </Router>
  );
}
export default App;
