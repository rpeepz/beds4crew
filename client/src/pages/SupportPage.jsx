import React, { useState, useEffect } from "react";
import { Typography, Box, Button, Paper, Divider, Switch, FormControlLabel, FormGroup, Grid, Chip, Card, CardContent, Stack, Link, Collapse, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EmailIcon from "@mui/icons-material/Email";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import { SUPPORT_TOPIC_GROUPS, SUPPORT_TOPICS } from "../data/supportTopics";
import supportFaqs from "../data/supportFaqs.json";

export default function SupportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [faqSectionOpen, setFaqSectionOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
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

  const topicGroups = SUPPORT_TOPIC_GROUPS;
  const allTopics = SUPPORT_TOPICS;
  const getScrollOffset = () => {
    const stickyElements = document.querySelectorAll("header, [role='banner'], .MuiAppBar-root");
    let offset = 16;

    stickyElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.position === "fixed" || style.position === "sticky") {
        offset = Math.max(offset, el.getBoundingClientRect().height + 16);
      }
    });

    return offset;
  };

  const scrollToTopic = (slug) => {
    const el = document.getElementById(`topic-${slug}`);
    if (!el) return;

    const top = window.scrollY + el.getBoundingClientRect().top - getScrollOffset();
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  };

  useEffect(() => {
    const hashSlug = decodeURIComponent(location.hash.replace("#", ""));
    if (!hashSlug) return;

    const exists = allTopics.some((topic) => topic.slug === hashSlug);
    if (!exists) return;

    setExpandedTopic(hashSlug);
    requestAnimationFrame(() => {
      scrollToTopic(hashSlug);
    });
  }, [location.hash, allTopics]);

  const handleTopicSelect = (slug) => {
    setExpandedTopic(slug);
    navigate(`/support#${encodeURIComponent(slug)}`, { replace: true });
    requestAnimationFrame(() => {
      scrollToTopic(slug);
    });
  };

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" sx={{...commonStyles.pageTitle}}>
        Support
      </Typography>
      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Browse topics
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
          {allTopics.map((topic) => (
            <Chip
              key={topic.slug}
              label={topic.title}
              onClick={() => handleTopicSelect(topic.slug)}
              color={expandedTopic === topic.slug ? "primary" : "default"}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>

        <Card sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Frequently Asked Questions
              </Typography>
              <Button size="small" onClick={() => setFaqSectionOpen(prev => !prev)}>
                {faqSectionOpen ? "Hide FAQ" : "Show FAQ"}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Quick guides for common actions.
            </Typography>

            <Collapse in={faqSectionOpen} timeout="auto">
              <Stack spacing={1.5}>
                {supportFaqs.map((faq) => (
                  <Accordion
                    key={faq.slug}
                    expanded={expandedFaq === faq.slug}
                    onChange={(_, isExpanded) => setExpandedFaq(isExpanded ? faq.slug : null)}
                    disableGutters
                    sx={{
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      overflow: "hidden",
                      "&:before": { display: "none" }
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {faq.question}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {faq.summary}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {faq.status === "todo" && (
                        <Chip label="Template TODO" color="warning" size="small" sx={{ mb: 1 }} />
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: faq.steps?.length ? 1 : 2 }}>
                        {faq.answer}
                      </Typography>
                      {Array.isArray(faq.steps) && faq.steps.length > 0 && (
                        <Box component="ol" sx={{ pl: 2.5, mb: 2, mt: 0 }}>
                          {faq.steps.map((step, index) => (
                            <Typography key={`${faq.slug}-${index}`} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {step}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      {Array.isArray(faq.photos) && faq.photos.length > 0 && (
                        <Grid container spacing={2}>
                          {faq.photos.map((photo, index) => (
                            <Grid item xs={12} sm={6} key={`${faq.slug}-photo-${index}`}>
                              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                <Box
                                  component="img"
                                  src={photo.src}
                                  alt={photo.alt || faq.question}
                                  sx={{ width: "100%", height: 180, objectFit: "contain", p: 1 }}
                                />
                                {photo.caption && (
                                  <CardContent sx={{ pt: 0 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      {photo.caption}
                                    </Typography>
                                  </CardContent>
                                )}
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Collapse>
          </CardContent>
        </Card>

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
                      <Box key={topic.slug} id={`topic-${topic.slug}`}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {topic.title}
                        </Typography>
                        {expandedTopic === topic.slug ? (
                          <Collapse in timeout="auto">
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {topic.description}
                            </Typography>
                            {topic.resourceLink && (
                              <Link
                                href={topic.resourceLink.href}
                                target={topic.resourceLink.href.startsWith("http") ? "_blank" : undefined}
                                rel={topic.resourceLink.href.startsWith("http") ? "noopener noreferrer" : undefined}
                                underline="hover"
                                sx={{ display: "inline-block", mb: 1 }}
                              >
                                {topic.resourceLink.label}
                              </Link>
                            )}
                            <Box>
                              <Button size="small" variant="contained" onClick={handleCallSupport}>
                                Chat with Support
                              </Button>
                            </Box>
                          </Collapse>
                        ) : (
                          <>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 1,
                                overflow: "hidden",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                textOverflow: "ellipsis"
                              }}
                            >
                              {topic.description}
                            </Typography>
                            <Button size="small" onClick={() => handleTopicSelect(topic.slug)}>
                              Learn more
                            </Button>
                          </>
                        )}
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
