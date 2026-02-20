import React, { useState, useEffect, useMemo } from "react";
import { Typography, Box, Button, Paper, Divider, Switch, FormControlLabel, FormGroup, Grid, Chip, Card, CardContent, Stack } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EmailIcon from "@mui/icons-material/Email";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";

export default function SupportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const snackbar = useSnackbar();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState({
    bookingConfirmation: true,
    bookingCancellation: true,
    newBookingRequest: true,
    newMessage: true,
    welcomeEmail: true
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(storedUser);
    
    // Load email preferences
    if (storedUser.id) {
      fetchWithAuth(`${API_URL}/email-preferences`)
        .then(res => res.json())
        .then(prefs => {
          if (prefs && typeof prefs === 'object') {
            setEmailPreferences(prev => ({ ...prev, ...prefs }));
          }
        })
        .catch(err => console.error('Failed to load email preferences:', err));
    }
  }, []);

  const handleCallSupport = () => {
    snackbar("Notifying support...", "info");
    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  const handleSignUpForHosting = () => {
    snackbar("Please check account settings", "success");
    setTimeout(() => {
      navigate("/profile");
    }, 1500);
  };

  const handleEmailPreferenceChange = async (preference) => {
    const newValue = !emailPreferences[preference];
    
    // Optimistic update
    setEmailPreferences(prev => ({ ...prev, [preference]: newValue }));
    
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/email-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [preference]: newValue } })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update preferences");
      }
      
      const data = await res.json();
      snackbar(data.message + " - Confirmation sent to your email", "success");
    } catch (error) {
      // Revert on error
      setEmailPreferences(prev => ({ ...prev, [preference]: !newValue }));
      snackbar(error.message || "Failed to update preference", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/properties/admin/clear-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        throw new Error("Failed to clear cache");
      }
      
      const data = await res.json();
      snackbar(data.message, "success");
    } catch (error) {
      snackbar(error.message || "Failed to clear cache", "error");
    } finally {
      setLoading(false);
    }
  };

  const topicGroups = useMemo(() => ([
    {
      title: "Company",
      topics: [
        { title: "About", slug: "about", description: "Learn about Beds4Crew’s mission, values, and marketplace vision." },
        { title: "Careers", slug: "careers", description: "Explore open roles and how to join the team." },
        { title: "Press", slug: "press", description: "Media resources, logos, and brand guidelines." },
        { title: "Partnerships", slug: "partnerships", description: "Partner with us to expand crew housing options." },
        { title: "Contact", slug: "contact", description: "Reach the team for general inquiries and feedback." },
      ],
    },
    {
      title: "Support",
      topics: [
        { title: "Help Center", slug: "help-center", description: "Self-serve guides for booking, hosting, and account help." },
        { title: "Safety", slug: "safety", description: "Safety guidelines for guests and hosts." },
        { title: "Cancellation", slug: "cancellation", description: "Understand cancellation policies and refund timelines." },
        { title: "Trust & Safety", slug: "trust-safety", description: "Verification, trust badges, and reporting tools." },
        { title: "Accessibility", slug: "accessibility", description: "Accessibility features and accommodations." },
      ],
    },
    {
      title: "Community",
      topics: [
        { title: "Host Community", slug: "host-community", description: "Tips, resources, and community updates for hosts." },
        { title: "Customer Stories", slug: "customer-stories", description: "Success stories from guests and hosts." },
        { title: "Affiliates", slug: "affiliates", description: "Affiliate program details and partner onboarding." },
        { title: "Events", slug: "events", description: "Upcoming webinars, meetups, and virtual events." },
      ],
    },
    {
      title: "Policies",
      topics: [
        { title: "Privacy", slug: "privacy", description: "How we protect data and handle privacy requests." },
        { title: "Terms", slug: "terms", description: "Platform terms of service and user responsibilities." },
        { title: "Cookie Policy", slug: "cookie-policy", description: "Cookie usage, preferences, and consent." },
        { title: "Intellectual Property", slug: "intellectual-property", description: "IP guidelines and infringement reporting." },
      ],
    },
    {
      title: "Social",
      topics: [
        { title: "LinkedIn", slug: "linkedin", description: "Company updates and hiring news." },
        { title: "Twitter", slug: "twitter", description: "Product updates, support notices, and community highlights." },
        { title: "Instagram", slug: "instagram", description: "Featured listings, photos, and host spotlights." },
        { title: "YouTube", slug: "youtube", description: "Tutorials, walkthroughs, and event replays." },
      ],
    },
  ]), []);

  const allTopics = useMemo(() => topicGroups.flatMap(group => group.topics), [topicGroups]);
  const selectedTopic = searchParams.get("topic");
  const selectedTopicData = allTopics.find(topic => topic.slug === selectedTopic);

  const handleTopicSelect = (slug) => {
    setSearchParams(slug ? { topic: slug } : {});
    const el = document.getElementById(slug);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box sx={commonStyles.contentContainer}>
      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Typography variant="h4" sx={commonStyles.pageTitle} align="center">
          Support Center
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Find answers fast or contact the team for personalized help.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PhoneIcon />}
            onClick={handleCallSupport}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Click to Call Support
          </Button>

          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<PersonAddIcon />}
            onClick={handleSignUpForHosting}
            fullWidth
            sx={{ py: 1.5 }}
          >
            Sign Up for Hosting
          </Button>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Browse topics
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
          {allTopics.map((topic) => (
            <Chip
              key={topic.slug}
              label={topic.title}
              onClick={() => handleTopicSelect(topic.slug)}
              color={selectedTopic === topic.slug ? "primary" : "default"}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>

        {selectedTopicData && (
          <Card sx={{ mb: 4, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {selectedTopicData.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedTopicData.description}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button variant="contained" onClick={handleCallSupport}>Contact support</Button>
                <Button variant="outlined" onClick={() => navigate("/properties")}>Browse listings</Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={3}>
          {topicGroups.map((group) => (
            <Grid item xs={12} md={6} key={group.title}>
              <Card sx={{ borderRadius: 3, height: "100%" }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                    {group.title}
                  </Typography>
                  <Stack spacing={2}>
                    {group.topics.map((topic) => (
                      <Box key={topic.slug} id={topic.slug}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {topic.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {topic.description}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => handleTopicSelect(topic.slug)}
                        >
                          Learn more
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Email Notification Preferences */}
        {user && user.id && (
          <>
            <Divider sx={{ my: 4 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <EmailIcon color="primary" />
              <Typography variant="h6" align="left">
                Email Notifications
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage which email notifications you receive. Password-related emails cannot be disabled.
            </Typography>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.bookingConfirmation}
                    onChange={() => handleEmailPreferenceChange('bookingConfirmation')}
                    disabled={loading}
                  />
                }
                label="Booking Confirmations"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.bookingCancellation}
                    onChange={() => handleEmailPreferenceChange('bookingCancellation')}
                    disabled={loading}
                  />
                }
                label="Booking Cancellations"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.newBookingRequest}
                    onChange={() => handleEmailPreferenceChange('newBookingRequest')}
                    disabled={loading}
                  />
                }
                label="New Booking Requests (Hosts)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.newMessage}
                    onChange={() => handleEmailPreferenceChange('newMessage')}
                    disabled={loading}
                  />
                }
                label="New Messages"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={emailPreferences.welcomeEmail}
                    onChange={() => handleEmailPreferenceChange('welcomeEmail')}
                    disabled={loading}
                  />
                }
                label="Welcome Emails (for new users)"
              />
            </FormGroup>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              Changes will be confirmed via email
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
}
