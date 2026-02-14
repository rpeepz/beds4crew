import React from "react";
import { Box, Rating, Typography } from "@mui/material";

export default function RatingStars({ value = 0, count, size = "small", showCount = true }) {
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <Rating value={value} precision={0.1} size={size} readOnly />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value.toFixed(1)}
      </Typography>
      {showCount && typeof count === "number" && (
        <Typography variant="body2" color="text.secondary">
          ({count})
        </Typography>
      )}
    </Box>
  );
}
