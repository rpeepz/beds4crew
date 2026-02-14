import React from "react";
import { Box, Button } from "@mui/material";

export default function CategoryNav({ categories = [], onSelect }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        overflowX: "auto",
        py: 0.5,
        px: { xs: 1, sm: 2 },
        "&::-webkit-scrollbar": { height: 6 },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 8 },
      }}
      role="navigation"
      aria-label="Category navigation"
    >
      {categories.map((category) => (
        <Button
          key={category.value}
          onClick={() => onSelect?.(category)}
          size="small"
          sx={{
            flexShrink: 0,
            fontWeight: 600,
            textTransform: "none",
            color: "text.primary",
            borderRadius: 999,
            px: 2,
            backgroundColor: "background.paper",
            boxShadow: 1,
            "&:hover": { boxShadow: 2 },
          }}
        >
          {category.label}
        </Button>
      ))}
    </Box>
  );
}
