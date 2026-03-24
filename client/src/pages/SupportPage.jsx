import React, { useState, useEffect } from "react";
import { Typography, Box, Button, Paper, Divider, Switch, FormControlLabel, FormGroup, Grid, Chip, Card, CardContent, Stack, Link, Collapse, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SupportIcon from "@mui/icons-material/SupportAgent";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { useSnackbar } from "../components/AppSnackbar";
import { fetchWithAuth, API_URL } from "../utils/api";
import { commonStyles } from "../utils/styleConstants";
import { scrollElementIntoViewWithOffset } from "../utils/scroll";
import { SUPPORT_TOPIC_GROUPS, SUPPORT_TOPICS } from "../data/supportTopics";
import supportFaqs from "../data/supportFaqs.json";
import { hasChatFlow } from "../utils/chatFlowHelpers";

export default function SupportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const snackbar = useSnackbar();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState(SUPPORT_TOPIC_GROUPS[0]?.title || "");
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
    const isDisabledAccount = storedUser?.isActive === false;
    
    // Load email preferences
    if (storedUser.id && !isDisabledAccount) {
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
  const activeTopics = topicGroups.find((group) => group.title === activeGroup)?.topics || [];
  const findTopicGroupTitle = (slug) => topicGroups.find((group) => group.topics.some((topic) => topic.slug === slug))?.title;
  const isExternalLink = (href = "") => href.startsWith("http");

  const openSupportChat = ({ slug, title, source = "topic" }) => {
    const params = new URLSearchParams({ source, slug, title });
    navigate(`/support/chat?${params.toString()}`);
  };
  const scrollToTopic = (slug) => {
    const el = document.getElementById(`topic-${slug}`);
    scrollElementIntoViewWithOffset(el, { extraOffset: 16 });
  };

  const scrollToFaq = (slug) => {
    const el = document.getElementById(`faq-${slug}`);
    scrollElementIntoViewWithOffset(el, { extraOffset: 16 });
  };

  useEffect(() => {
    const hashSlug = decodeURIComponent(location.hash.replace("#", ""));
    if (!hashSlug) return;

    if (hashSlug === "faq") {
      setFaqSectionOpen(true);
      setExpandedFaq(null);
      requestAnimationFrame(() => {
        const faqSection = document.getElementById("faq");
        scrollElementIntoViewWithOffset(faqSection, { extraOffset: 16 });
      });
      return;
    }

    if (hashSlug.startsWith("faq-")) {
      const faqSlug = hashSlug.replace("faq-", "");
      const faqExists = supportFaqs.some((faq) => faq.slug === faqSlug);
      if (!faqExists) {
        setFaqSectionOpen(true);
        setExpandedFaq(null);
        requestAnimationFrame(() => {
          const faqSection = document.getElementById("faq");
          scrollElementIntoViewWithOffset(faqSection, { extraOffset: 16 });
        });
        return;
      }

      setFaqSectionOpen(true);
      setExpandedFaq(faqSlug);
      requestAnimationFrame(() => {
        scrollToFaq(faqSlug);
      });
      return;
    }

    const exists = allTopics.some((topic) => topic.slug === hashSlug);
    if (exists) {
      const groupTitle = findTopicGroupTitle(hashSlug);
      if (groupTitle) {
        setActiveGroup(groupTitle);
      }
      setExpandedTopic(hashSlug);
      requestAnimationFrame(() => {
        scrollToTopic(hashSlug);
      });
      return;
    }

    const faqExists = supportFaqs.some((faq) => faq.slug === hashSlug);
    if (faqExists) {
      setFaqSectionOpen(true);
      setExpandedFaq(hashSlug);
      requestAnimationFrame(() => {
        scrollToFaq(hashSlug);
      });
    }
  }, [location.hash, allTopics]);

  const handleTopicSelect = (slug) => {
    const groupTitle = findTopicGroupTitle(slug);
    if (groupTitle) {
      setActiveGroup(groupTitle);
    }
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a category first, then open a specific topic.
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          {topicGroups.map((group) => (
            <Chip
              key={group.title}
              label={group.title}
              onClick={() => setActiveGroup(group.title)}
              color={activeGroup === group.title ? "primary" : "default"}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
          {activeTopics.map((topic) => (
            <Button
              key={topic.slug}
              size="small"
              variant={expandedTopic === topic.slug ? "contained" : "outlined"}
              onClick={() => handleTopicSelect(topic.slug)}
              sx={{ mb: 1 }}
            >
              {topic.title}
            </Button>
          ))}
        </Stack>

        <Card sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography id="faq" variant="h6" sx={{ fontWeight: 700 }}>
                Frequently Asked Questions
              </Typography>
              <Button size="small" onClick={() => setFaqSectionOpen(prev => !prev)}>
                {faqSectionOpen ? "Hide FAQ" : "Show FAQ"}
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Quick guides for common actions.
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {supportFaqs.map((faq) => (
                <Chip
                  key={`faq-chip-${faq.slug}`}
                  label={faq.question}
                  size="small"
                  variant={expandedFaq === faq.slug ? "filled" : "outlined"}
                  onClick={() => {
                    setFaqSectionOpen(true);
                    setExpandedFaq(faq.slug);
                    navigate(`/support#faq-${encodeURIComponent(faq.slug)}`, { replace: true });
                    requestAnimationFrame(() => {
                      scrollToFaq(faq.slug);
                    });
                  }}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>

            <Collapse in={faqSectionOpen} timeout="auto">
              <Stack spacing={1.5}>
                {supportFaqs.map((faq) => (
                  <Accordion
                    key={faq.slug}
                    id={`faq-${faq.slug}`}
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
                      <Typography variant="overline" color="text.secondary" sx={{ display: "block" }}>
                        Answer
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: faq.steps?.length ? 1 : 2 }}>
                        {faq.answer}
                      </Typography>
                      {Array.isArray(faq.steps) && faq.steps.length > 0 && (
                        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                            Recommended steps
                          </Typography>
                          <Box component="ol" sx={{ pl: 2.5, mb: 0, mt: 0 }}>
                          {faq.steps.map((step, index) => (
                            <Typography key={`${faq.slug}-${index}`} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              {step}
                            </Typography>
                          ))}
                          </Box>
                          {faq.href && (
                            <Link
                              href={faq.href}
                              target={faq.href.startsWith("http") ? "_blank" : undefined}
                              rel={faq.href.startsWith("http") ? "noopener noreferrer" : undefined}
                            >
                              {faq.hrefLabel || "Learn more"}
                            </Link>
                          )}
                        </Box>
                      )}

                      {hasChatFlow(faq.slug) && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openSupportChat({ slug: faq.slug, title: faq.question, source: "faq" })}
                        >
                          Chat with Support
                        </Button>
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
                      <Accordion
                        key={topic.slug}
                        id={`topic-${topic.slug}`}
                        expanded={expandedTopic === topic.slug}
                        onChange={(_, isExpanded) => {
                          if (isExpanded) {
                            handleTopicSelect(topic.slug);
                            return;
                          }

                          setExpandedTopic(null);
                        }}
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
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {topic.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Tap to view details and next actions
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {topic.description}
                          </Typography>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {topic.resourceLink && (
                              <>
                                {isExternalLink(topic.resourceLink.href) ? (
                                  <Button
                                    component="a"
                                    href={topic.resourceLink.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="small"
                                    variant="text"
                                  >
                                    {topic.resourceLink.label}
                                  </Button>
                                ) : (
                                  <Button
                                    component={RouterLink}
                                    to={topic.resourceLink.href}
                                    size="small"
                                    variant="contained"
                                  >
                                    {topic.resourceLink.label}
                                  </Button>
                                )}
                              </>
                            )}

                            {hasChatFlow(topic.slug) && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => openSupportChat({ slug: topic.slug, title: topic.title, source: "topic" })}
                              >
                                Chat with Support
                                <SupportIcon sx={{ ml: 0.5 }}/> 
                              </Button>
                            )}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
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
