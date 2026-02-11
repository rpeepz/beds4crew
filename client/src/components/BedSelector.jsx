import React, { useState, useEffect, useMemo } from "react";
import { 
  Box, Typography, Card, FormControl, InputLabel, Select, MenuItem, 
  Checkbox, FormControlLabel, Alert, Chip, Button, Divider
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BedIcon from "@mui/icons-material/Bed";

export default function BedSelector({ property, startDate, endDate, onSelectionChange, existingBookings = [] }) {
  const [selectedBeds, setSelectedBeds] = useState([]);
  const [guestCount, setGuestCount] = useState(1);
  const [guestBedAssignments, setGuestBedAssignments] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [useSimplePricing, setUseSimplePricing] = useState(false);

  // Check if property uses simple pricing (pricePerNight is set and type is accommodation)
  useEffect(() => {
    const hasSimplePricing = property.type === "accommodation" && property.pricePerNight > 0;
    setUseSimplePricing(hasSimplePricing);
  }, [property]);

  // Calculate nights
  const nights = startDate && endDate 
    ? Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
    : 0;

  // Get all available beds (memoized to prevent infinite loops)
  const availableBeds = useMemo(() => {
    if (!property.rooms) return [];
    
    const beds = [];
    
    // Check if there's a whole-property booking for these dates
    const hasWholePropertyBooking = existingBookings.some(booking => 
      (!booking.bookedBeds || booking.bookedBeds.length === 0)
    );
    
    // If whole property is booked, no beds are available
    if (hasWholePropertyBooking) {
      return [];
    }
    
    property.rooms.forEach((room, roomIndex) => {
      room.beds.forEach((bed, bedIndex) => {
        // Check if bed is available and not booked
        const isBooked = existingBookings.some(booking => 
          booking.bookedBeds && booking.bookedBeds.some(b => 
            b.roomIndex === roomIndex && b.bedIndex === bedIndex
          )
        );
        
        if (bed.isAvailable && !isBooked) {
          beds.push({
            roomIndex,
            bedIndex,
            label: bed.label,
            pricePerBed: bed.pricePerBed,
            isPrivate: room.isPrivate,
            roomLabel: `Room ${roomIndex + 1} (${room.isPrivate ? 'Private' : 'Shared'})`
          });
        }
      });
    });
    return beds;
  }, [property, existingBookings]);

  // Calculate total price
  useEffect(() => {
    if (useSimplePricing && property.type === "accommodation") {
      // Simple pricing for whole property
      setTotalPrice(property.pricePerNight * nights);
    } else if (selectedBeds.length > 0) {
      // Per-bed pricing
      const total = selectedBeds.reduce((sum, bedKey) => {
        const bed = availableBeds.find(b => `${b.roomIndex}-${b.bedIndex}` === bedKey);
        return sum + (bed ? bed.pricePerBed : 0);
      }, 0) * nights;
      setTotalPrice(total);
    } else {
      setTotalPrice(0);
    }
  }, [selectedBeds, nights, useSimplePricing, property, availableBeds]);

  // Notify parent component of changes
  useEffect(() => {
    if (useSimplePricing && property.type === "accommodation") {
      // Whole property booking with simple pricing
      onSelectionChange({
        bookedBeds: [],
        guestCount: guestCount,
        totalPrice: totalPrice,
        valid: guestCount > 0 && guestCount <= property.maxGuests
      });
    } else {
      // Per-bed booking
      const bedDetails = selectedBeds.map(bedKey => {
        const [roomIndex, bedIndex] = bedKey.split('-').map(Number);
        const bed = availableBeds.find(b => b.roomIndex === roomIndex && b.bedIndex === bedIndex);
        return {
          roomIndex,
          bedIndex,
          bedLabel: bed?.label || ''
        };
      });

      const allGuestsAssigned = Object.keys(guestBedAssignments).length === guestCount;
      
      onSelectionChange({
        bookedBeds: bedDetails,
        guestCount: guestCount,
        totalPrice: totalPrice,
        valid: selectedBeds.length > 0 && allGuestsAssigned
      });
    }
  }, [selectedBeds, guestCount, guestBedAssignments, totalPrice, useSimplePricing, property, availableBeds, onSelectionChange]);

  const handleBedToggle = (bedKey) => {
    setSelectedBeds(prev => {
      const newSelection = prev.includes(bedKey)
        ? prev.filter(b => b !== bedKey)
        : [...prev, bedKey];
      
      // Reset guest assignments when beds change
      if (newSelection.length < prev.length) {
        // Bed was removed, remove any assignments to it
        const newAssignments = { ...guestBedAssignments };
        Object.keys(newAssignments).forEach(guestNum => {
          if (newAssignments[guestNum] === bedKey) {
            delete newAssignments[guestNum];
          }
        });
        setGuestBedAssignments(newAssignments);
      }
      
      return newSelection;
    });
  };

  const handleGuestBedAssignment = (guestNum, bedKey) => {
    setGuestBedAssignments(prev => ({
      ...prev,
      [guestNum]: bedKey
    }));
  };

  const handleGuestCountChange = (count) => {
    setGuestCount(count);
    // Reset assignments if guest count changes
    setGuestBedAssignments({});
  };

  if (availableBeds.length === 0) {
    return (
      <Alert severity="warning">
        No beds are available for the selected dates. Please choose different dates.
      </Alert>
    );
  }

  // Simple pricing mode (whole property)
  if (useSimplePricing && property.type === "accommodation") {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Book Whole Property</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          This property uses simple pricing at ${property.pricePerNight} per night for the entire accommodation.
        </Alert>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Number of Guests</InputLabel>
          <Select
            value={guestCount}
            onChange={(e) => handleGuestCountChange(e.target.value)}
            label="Number of Guests"
          >
            {[...Array(property.maxGuests)].map((_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {i + 1} {i + 1 === 1 ? 'Guest' : 'Guests'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {totalPrice > 0 && (
          <Card sx={{ p: 2, bgcolor: 'primary.light' }}>
            <Typography variant="h6">
              Total: ${totalPrice} ({nights} {nights === 1 ? 'night' : 'nights'})
            </Typography>
          </Card>
        )}
      </Box>
    );
  }

  // Per-bed selection mode
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Select Beds</Typography>
      
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Number of Guests</InputLabel>
        <Select
          value={guestCount}
          onChange={(e) => handleGuestCountChange(e.target.value)}
          label="Number of Guests"
        >
          {[...Array(Math.min(availableBeds.length, property.maxGuests || 10))].map((_, i) => (
            <MenuItem key={i + 1} value={i + 1}>
              {i + 1} {i + 1 === 1 ? 'Guest' : 'Guests'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="subtitle2" gutterBottom>Available Beds:</Typography>
      <Box sx={{ mb: 3 }}>
        {availableBeds.map((bed) => {
          const bedKey = `${bed.roomIndex}-${bed.bedIndex}`;
          return (
            <Card key={bedKey} sx={{ p: 2, mb: 1, bgcolor: selectedBeds.includes(bedKey) ? 'action.selected' : 'background.paper' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedBeds.includes(bedKey)}
                    onChange={() => handleBedToggle(bedKey)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BedIcon />
                    <Box>
                      <Typography variant="body1">
                        {bed.roomLabel} - {bed.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ${bed.pricePerBed} per night
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Card>
          );
        })}
      </Box>

      {selectedBeds.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>Assign Guests to Beds:</Typography>
          
          {[...Array(guestCount)].map((_, i) => {
            const guestNum = i + 1;
            return (
              <Box key={guestNum} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PersonIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2">Guest {guestNum}</Typography>
                </Box>
                <FormControl fullWidth size="small">
                  <InputLabel>Select a bed</InputLabel>
                  <Select
                    value={guestBedAssignments[guestNum] || ''}
                    onChange={(e) => handleGuestBedAssignment(guestNum, e.target.value)}
                    label="Select a bed"
                  >
                    <MenuItem value="">
                      <em>Select a bed</em>
                    </MenuItem>
                    {selectedBeds.map(bedKey => {
                      const bed = availableBeds.find(b => `${b.roomIndex}-${b.bedIndex}` === bedKey);
                      // Check if this bed is already assigned to another guest
                      const isAssignedToOther = Object.entries(guestBedAssignments).some(
                        ([guest, assignedBed]) => guest !== String(guestNum) && assignedBed === bedKey
                      );
                      
                      return (
                        <MenuItem key={bedKey} value={bedKey} disabled={isAssignedToOther}>
                          {bed?.roomLabel} - {bed?.label}
                          {isAssignedToOther && ' (Assigned)'}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Box>
            );
          })}

          {Object.keys(guestBedAssignments).length < guestCount && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please assign all {guestCount} guests to beds before booking.
            </Alert>
          )}
        </>
      )}

      {totalPrice > 0 && (
        <Card sx={{ 
          p: 2, 
          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1b5e20' : '#e8f5e9',
          border: (theme) => `2px solid ${theme.palette.mode === 'dark' ? '#2e7d32' : '#4caf50'}`,
          mt: 2 
        }}>
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#a5d6a7' : '#2e7d32' }}>
            {selectedBeds.length} {selectedBeds.length === 1 ? 'bed' : 'beds'} × {nights} {nights === 1 ? 'night' : 'nights'}
          </Typography>
          <Typography variant="h6" sx={{ 
            color: (theme) => theme.palette.mode === 'dark' ? '#66bb6a' : '#1b5e20',
            fontWeight: 700 
          }}>
            Total: ${totalPrice}
          </Typography>
        </Card>
      )}
    </Box>
  );
}