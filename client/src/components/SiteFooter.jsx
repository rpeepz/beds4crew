import React from "react";
import { Box, Divider, Grid, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { SUPPORT_FOOTER_COLUMNS } from "../data/supportTopics";

const toSupportLink = (slug) => `/support#${encodeURIComponent(slug)}`;

export default function SiteFooter() {
  return (
    <Box component="footer" sx={{ mt: { xs: 6, md: 10 }, backgroundColor: "background.paper", borderTop: 1, borderColor: "divider" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: { xs: 4, md: 6 } }}>
        <Grid container spacing={3}>
          {SUPPORT_FOOTER_COLUMNS.map((column) => (
            <Grid item xs={6} sm={3} key={column.title}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {column.title}
              </Typography>
              <Box display="flex" flexDirection="column" gap={0.5}>
                {column.links.map((link) => (
                  <Link
                    key={link.slug}
                    component={RouterLink}
                    to={toSupportLink(link.slug)}
                    underline="hover"
                    color="text.secondary"
                    sx={{ fontSize: 14 }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Box>
            </Grid>
          ))}
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
