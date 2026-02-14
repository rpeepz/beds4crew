import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, TextField, MenuItem, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const defaultCategories = [
  { value: "", label: "All categories" },
  { value: "apartment", label: "Apartments" },
  { value: "condo", label: "Condos" },
  { value: "house", label: "Houses" },
  { value: "hostel", label: "Hostels" },
  { value: "flat", label: "Flats" },
  { value: "villa", label: "Villas" },
];

export default function GlobalSearchBar({
  initialQuery = "",
  initialCategory = "",
  categories,
  placeholder = "Search stays, cities, or experiences",
  size = "medium",
  fullWidth = true,
  onSubmit,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);

  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  useEffect(() => {
    setCategory(initialCategory || "");
  }, [initialCategory]);

  const categoryOptions = useMemo(() => categories || defaultCategories, [categories]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (onSubmit) {
      onSubmit({ query: query.trim(), category });
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 1.5, width: fullWidth ? "100%" : "auto" }}>
      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        size={size}
        fullWidth={fullWidth}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        aria-label="Search listings"
      />
      <TextField
        select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        size={size}
        sx={{ minWidth: { xs: 130, sm: 160 } }}
        aria-label="Select category"
      >
        {categoryOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      <Button
        type="submit"
        variant="contained"
        size={size}
        sx={{ px: { xs: 2, sm: 3 } }}
        aria-label="Submit search"
      >
        Search
      </Button>
    </Box>
  );
}
