import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Grid,
  Chip,
  Container,
  CircularProgress,
} from "@mui/material";
import { fetchWithAuth, API_URL, isAppTransportMode } from "../utils/api";

const TIERS = [
  {
    id: 1,
    name: "Basic",
    price: "$5",
    listings: 2,
    description: "Getting started",
    features: ["2 property listings", "Basic support"],
  },
  {
    id: 2,
    name: "Growth",
    price: "$15",
    listings: 5,
    description: "Scale up",
    features: ["5 property listings", "Priority support"],
  },
  {
    id: 3,
    name: "Professional",
    price: "$30",
    listings: 10,
    description: "Growing business",
    features: ["10 property listings", "Priority support", "Advanced analytics"],
  },
  {
    id: 4,
    name: "Enterprise",
    price: "$75",
    listings: "25+",
    description: "Large operator",
    features: ["25+ property listings", "Priority support", "Advanced analytics"],
  },
];

export default function PricingPage() {
  const [selectedTier, setSelectedTier] = useState(1);
  const [loading, setLoading] = useState(false);
  const [highlightCheckout, setHighlightCheckout] = useState(false);
  const checkoutCtaRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  // Detect if running inside iOS native app
  const isIosNative = (() => {
    if (!isAppTransportMode() || typeof window === "undefined") return false;
    const getPlatform = window.Capacitor?.getPlatform;
    return typeof getPlatform === "function" && getPlatform() === "ios";
  })();

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectTier = (tierId) => {
    setSelectedTier(tierId);

    if (checkoutCtaRef.current) {
      const ctaTop =
        checkoutCtaRef.current.getBoundingClientRect().top + window.pageYOffset;
      const targetY = Math.max(0, ctaTop - window.innerHeight * 0.75);
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }

    setHighlightCheckout(false);
    requestAnimationFrame(() => {
      setHighlightCheckout(true);
    });

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightCheckout(false);
    }, 1400);
  };

  // disallow checkout in iOS native app
  const handleCheckout = async () => {
    if (isIosNative) {
      alert("Subscription checkout is not available inside the iOS app.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/billing/checkout-tier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || "Failed to start checkout");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout");
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, bgcolor: "background.default" }}>
      <Typography variant="h3" align="center" sx={{ mb: 2, fontWeight: "bold" }}>
        Choose Your Plan
      </Typography>
      <Typography variant="body1" align="center" sx={{ mb: 4, color: "text.secondary" }}>
        No commission. Keep 100% of all bookings. Cancel anytime.
      </Typography>

      <Grid container spacing={3}>
        {TIERS.map((tier) => (
          <Grid item xs={12} sm={6} md={3} key={tier.id}>
            <Card
              onClick={() => handleSelectTier(tier.id)}
              sx={{
                border: selectedTier === tier.id ? "3px solid" : "2px solid",
                borderColor: selectedTier === tier.id ? "primary.main" : "divider",
                cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: 4,
                  borderColor: "primary.main",
                },
                display: "flex",
                flexDirection: "column",
                height: "100%",
                backgroundColor: selectedTier === tier.id ? "action.selected" : "background.paper",
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  {tier.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {tier.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h4" sx={{ mb: 0.5 }}>
                    {tier.price}
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      /month
                    </Typography>
                  </Typography>
                </Box>

                <Chip
                  label={`${tier.listings} listings`}
                  color="primary"
                  size="small"
                  sx={{ mb: 2 }}
                />

                <Box sx={{ mb: 2 }}>
                  {tier.features.map((feature, idx) => (
                    <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                      ✓ {feature}
                    </Typography>
                  ))}
                </Box>
              </CardContent>

              <Box sx={{ p: 2 }}>
                <Button
                  fullWidth
                  variant={selectedTier === tier.id ? "contained" : "outlined"}
                  size="small"
                  onClick={() => handleSelectTier(tier.id)}
                >
                  Select
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box ref={checkoutCtaRef} sx={{ mt: 4, textAlign: "center" }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleCheckout}
          // disable checkout button if loading or in iOS native app
          disabled={loading || isIosNative}
          sx={{
            minWidth: 200,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            ...(highlightCheckout && {
              animation: "checkoutPulse 1.1s ease",
              boxShadow: 6,
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: 3,
            }),
            "@keyframes checkoutPulse": {
              "0%": { transform: "scale(1)" },
              "40%": { transform: "scale(1.06)" },
              "70%": { transform: "scale(0.98)" },
              "100%": { transform: "scale(1)" },
            },
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} /> Processing...
            </>
          ) : (
            isIosNative ? "Not available in iOS app" : "Continue to Payment"
          )}
        </Button>
      </Box>

      <Box
        sx={{
          mt: 4,
          p: 2,
          backgroundColor: "action.hover",
          borderRadius: 1,
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="textSecondary">
          {isIosNative
            ? "iOS app build does not initiate external subscription checkout."
            : "💳 Secure checkout powered by Stripe. No charges until you confirm."}
        </Typography>
      </Box>
    </Container>
  );
}
