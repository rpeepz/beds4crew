// Design system constants for consistent styling across the app

// Container widths
export const CONTAINER_WIDTHS = {
  auth: 450,        // Login, Register, Support pages
  content: 1200,    // Main content pages (Feed, Listings, etc)
  detail: 900,      // Detail pages (Property Detail)
  form: 700,        // Form pages (Add Property)
};

// Spacing system (follows 8px grid)
export const SPACING = {
  xs: 0.5,   // 4px
  sm: 1,     // 8px
  md: 2,     // 16px
  lg: 3,     // 24px
  xl: 4,     // 32px
  xxl: 6,    // 48px
};

// Consistent padding for containers
export const CONTAINER_PADDING = {
  xs: 2,  // Mobile
  sm: 3,  // Tablet
  md: 3,  // Desktop
};

// Consistent margins
export const PAGE_MARGIN = {
  top: { xs: 2, sm: 3, md: 4 },
  bottom: { xs: 2, sm: 3, md: 4 },
};

// Button spacing
export const BUTTON_SPACING = {
  topBottom: 2,
  betweenButtons: 1,
};

// Card heights
export const CARD_IMAGE_HEIGHT = {
  small: 140,
  medium: 180,
  large: 220,
};

// Border radius
export const BORDER_RADIUS = {
  small: 1,
  medium: 2,
  large: 3,
};

// Common sx props for reuse
export const commonStyles = {
  // Auth page container (Login, Register, Support)
  authContainer: {
    maxWidth: CONTAINER_WIDTHS.auth,
    mx: "auto",
    mt: { xs: 3, sm: 4, md: 5 },
    mb: { xs: 3, sm: 4 },
    px: { xs: 2, sm: 3 },
  },

  // Main content container (Feed, Listings, etc)
  contentContainer: {
    maxWidth: CONTAINER_WIDTHS.content,
    mx: "auto",
    my: { xs: 2, sm: 3, md: 4 },
    px: { xs: 2, sm: 3 },
  },

  // Detail page container
  detailContainer: {
    maxWidth: CONTAINER_WIDTHS.detail,
    mx: "auto",
    my: { xs: 2, sm: 3, md: 4 },
    px: { xs: 2, sm: 3 },
  },

  // Form container
  formContainer: {
    maxWidth: CONTAINER_WIDTHS.form,
    mx: "auto",
    my: { xs: 2, sm: 3, md: 4 },
    px: { xs: 2, sm: 3 },
  },

  // Full width button
  fullWidthButton: {
    mt: SPACING.md,
    mb: SPACING.sm,
    py: 1.5,
  },

  // Section spacing
  sectionSpacing: {
    mb: { xs: 2, sm: 3 },
  },

  // Card
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 3,
    border: "1px solid rgba(148, 163, 184, 0.2)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      transform: "translateY(-6px)",
      boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
    },
  },

  // Empty state
  emptyState: {
    textAlign: "center",
    py: { xs: 6, sm: 8, md: 10 },
    color: "text.secondary",
  },

  // Page title
  pageTitle: {
    mb: { xs: 2, sm: 3 },
    fontWeight: 600,
  },

  // Section title
  sectionTitle: {
    mb: 2,
    fontWeight: 600,
  },
};
