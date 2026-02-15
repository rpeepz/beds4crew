import React from "react";
import { Box, Divider, Grid, Link, Typography, Select, MenuItem } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const footerColumns = [
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Partnerships", "Contact"],
  },
  {
    title: "Support",
    links: ["Help Center", "Safety", "Cancellation", "Trust & Safety", "Accessibility"],
  },
  {
    title: "Community",
    links: ["Host Community", "Customer Stories", "Affiliates", "Events"],
  },
  {
    title: "Policies",
    links: ["Privacy", "Terms", "Cookie Policy", "Intellectual Property"],
  },
];

const toSupportLink = (label) => `/support?topic=${encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-"))}`;

export default function SiteFooter() {
  return (
    <Box component="footer" sx={{ mt: { xs: 6, md: 10 }, backgroundColor: "background.paper", borderTop: 1, borderColor: "divider" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: { xs: 4, md: 6 } }}>
        <Grid container spacing={3}>
          {footerColumns.map((column) => (
            <Grid item xs={6} sm={3} key={column.title}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {column.title}
              </Typography>
              <Box display="flex" flexDirection="column" gap={0.5}>
                {column.links.map((link) => (
                  <Link
                    key={link}
                    component={RouterLink}
                    to={toSupportLink(link)}
                    underline="hover"
                    color="text.secondary"
                    sx={{ fontSize: 14 }}
                  >
                    {link}
                  </Link>
                ))}
              </Box>
            </Grid>
          ))}
          <Grid item xs={12} sm={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Language & Currency
            </Typography>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Beds4Crew. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Built for trust, speed, and discovery.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
