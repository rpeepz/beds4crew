import React, { useMemo } from "react";
import { 
  Box, Typography, Card, Chip, Tooltip, Alert 
} from "@mui/material";
import BedIcon from "@mui/icons-material/Bed";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import BlockIcon from "@mui/icons-material/Block";
import dayjs from "dayjs";

/**
 * BedAvailabilityGrid - Shows a visual grid of all beds with their availability status
 * @param {Object} property - Property object with rooms and beds
 * @param {Array} bookings - Array of bookings for the property
 * @param {Array} blockedPeriods - Array of blocked periods
 * @param {Object} startDate - Start date (dayjs object)
 * @param {Object} endDate - End date (dayjs object)
 * @param {Boolean} isOwner - Whether current user is the owner
 */
export default function BedAvailabilityGrid({ 
  property, 
  bookings = [], 
  blockedPeriods = [],
  startDate = null, 
  endDate = null,
  isOwner = false 
}) {
  // Calculate bed availability for the selected date range
  const bedAvailability = useMemo(() => {
    if (!property?.rooms || !startDate || !endDate) return [];

    const availability = [];
    const start = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).startOf('day');

    // Check if there's a whole-property booking for these dates
    const hasWholePropertyBooking = bookings.some(booking => {
      if (booking.status !== "confirmed" && booking.status !== "pending") return false;
      
      const bookingStart = dayjs(booking.startDate).startOf('day');
      const bookingEnd = dayjs(booking.endDate).startOf('day');
      
      // Check if dates overlap and booking is for whole property (empty bookedBeds)
      if (bookingStart.isBefore(end) && bookingEnd.isAfter(start)) {
        return !booking.bookedBeds || booking.bookedBeds.length === 0;
      }
      return false;
    });

    property.rooms.forEach((room, roomIndex) => {
      room.beds.forEach((bed, bedIndex) => {
        // Check if the bed is blocked during this period
        let isBlocked = false;
        let blockReason = "";
        let isBlockedByHost = false;

        blockedPeriods.forEach((block) => {
          const blockStart = dayjs(block.startDate).startOf('day');
          const blockEnd = dayjs(block.endDate).startOf('day');
          
          // Check if dates overlap
          if (blockStart.isBefore(end) && blockEnd.isAfter(start)) {
            // Check if this bed is affected
            if (block.blockType === "entire" || 
               (block.blockType === "room" && block.roomIndex === roomIndex) ||
               (block.blockType === "bed" && block.roomIndex === roomIndex && block.bedIndex === bedIndex)) {
              isBlocked = true;
              blockReason = block.reason || "Unavailable";
              isBlockedByHost = true;
            }
          }
        });

        // Check if the bed is booked during this period (or whole property is booked)
        let isBooked = hasWholePropertyBooking;
        let bookingIds = [];
        
        if (!hasWholePropertyBooking) {
          bookings.forEach((booking) => {
            if (booking.status !== "confirmed" && booking.status !== "pending") return;
            
            const bookingStart = dayjs(booking.startDate).startOf('day');
            const bookingEnd = dayjs(booking.endDate).startOf('day');
            
            // Check if dates overlap
            if (bookingStart.isBefore(end) && bookingEnd.isAfter(start)) {
              // Check if this specific bed is booked
              const bedBooked = booking.bookedBeds?.some(
                b => b.roomIndex === roomIndex && b.bedIndex === bedIndex
              );
              
              if (bedBooked) {
                isBooked = true;
                bookingIds.push(booking._id);
              }
            }
          });
        }

        availability.push({
          roomIndex,
          bedIndex,
          roomLabel: `Room ${roomIndex + 1}`,
          isPrivate: room.isPrivate,
          bedLabel: bed.label,
          pricePerBed: bed.pricePerBed,
          isAvailable: bed.isAvailable && !isBooked && !isBlocked,
          isBooked,
          isBlocked,
          isBlockedByHost,
          blockReason,
          bookingIds,
          bedDisabled: !bed.isAvailable
        });
      });
    });

    return availability;
  }, [property, bookings, blockedPeriods, startDate, endDate]);

  // Group beds by room
  const roomGroups = useMemo(() => {
    const groups = [];
    let currentRoomIndex = -1;
    let currentGroup = null;

    bedAvailability.forEach((bed) => {
      if (bed.roomIndex !== currentRoomIndex) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          roomIndex: bed.roomIndex,
          roomLabel: bed.roomLabel,
          isPrivate: bed.isPrivate,
          beds: []
        };
        currentRoomIndex = bed.roomIndex;
      }
      currentGroup.beds.push(bed);
    });
    
    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [bedAvailability]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = bedAvailability.length;
    const available = bedAvailability.filter(b => b.isAvailable).length;
    const booked = bedAvailability.filter(b => b.isBooked).length;
    const blocked = bedAvailability.filter(b => b.isBlocked).length;
    const disabled = bedAvailability.filter(b => b.bedDisabled).length;
    
    return { total, available, booked, blocked, disabled };
  }, [bedAvailability]);

  if (!property?.rooms || property.rooms.length === 0) {
    return (
      <Alert severity="info">
        No rooms configured for this property yet.
      </Alert>
    );
  }

  if (!startDate || !endDate) {
    return (
      <Alert severity="info">
        Select check-in and check-out dates to see bed availability.
      </Alert>
    );
  }

  const nights = dayjs(endDate).diff(dayjs(startDate), 'day');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">
          Bed Availability
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {dayjs(startDate).format('MMM D')} - {dayjs(endDate).format('MMM D, YYYY')} ({nights} {nights === 1 ? 'night' : 'nights'})
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip 
          icon={<CheckCircleIcon />}
          label={`${stats.available} Available`} 
          color="success" 
          size="small"
          variant="outlined"
        />
        <Chip 
          icon={<CancelIcon />}
          label={`${stats.booked} Booked`} 
          color="error" 
          size="small"
          variant="outlined"
        />
        {isOwner && stats.blocked > 0 && (
          <Chip 
            icon={<BlockIcon />}
            label={`${stats.blocked} Blocked`} 
            color="warning" 
            size="small"
            variant="outlined"
          />
        )}
        {stats.disabled > 0 && (
          <Chip 
            label={`${stats.disabled} Disabled`} 
            size="small"
            variant="outlined"
          />
        )}
      </Box>

      {/* Bed Grid by Room */}
      {roomGroups.map((room) => (
        <Card 
          key={room.roomIndex}
          sx={{ 
            mb: 2, 
            p: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="600">
              {room.roomLabel}
            </Typography>
            <Chip 
              label={room.isPrivate ? "Private" : "Shared"}
              size="small"
              color={room.isPrivate ? "primary" : "default"}
              variant="outlined"
            />
          </Box>

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(3, 1fr)' 
            }, 
            gap: 2 
          }}>
            {room.beds.map((bed) => {
              const statusColor = bed.bedDisabled 
                ? 'grey.500'
                : bed.isBlocked 
                ? 'warning.main'
                : bed.isBooked 
                ? 'error.main'
                : 'success.main';

              const statusIcon = bed.bedDisabled 
                ? <CancelIcon fontSize="small" />
                : bed.isBlocked 
                ? <BlockIcon fontSize="small" />
                : bed.isBooked 
                ? <CancelIcon fontSize="small" />
                : <CheckCircleIcon fontSize="small" />;

              const statusText = bed.bedDisabled 
                ? 'Disabled'
                : bed.isBlocked 
                ? (isOwner ? `Blocked: ${bed.blockReason}` : 'Unavailable')
                : bed.isBooked 
                ? 'Booked'
                : 'Available';

              return (
                <Tooltip 
                  key={`${bed.roomIndex}-${bed.bedIndex}`}
                  title={
                    <Box>
                      <Typography variant="caption" display="block">
                        {statusText}
                      </Typography>
                      <Typography variant="caption" display="block">
                        ${bed.pricePerBed} per night
                      </Typography>
                    </Box>
                  }
                  arrow
                >
                  <Card 
                    sx={{ 
                      p: 1.5,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'white',
                      border: (theme) => `2px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]}`,
                      '&:hover': {
                        boxShadow: 3
                      },
                      opacity: bed.bedDisabled ? 0.5 : 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BedIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="500">
                          {bed.bedLabel}
                        </Typography>
                      </Box>
                      <Box sx={{ color: statusColor }}>
                        {statusIcon}
                      </Box>
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block">
                      ${bed.pricePerBed}/night
                    </Typography>
                    
                    <Chip 
                      label={statusText}
                      size="small"
                      sx={{ 
                        mt: 1,
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: statusColor,
                        color: 'white',
                        '& .MuiChip-label': {
                          px: 1
                        }
                      }}
                    />
                  </Card>
                </Tooltip>
              );
            })}
          </Box>
        </Card>
      ))}

      {stats.available === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No beds are available for the selected dates. Please choose different dates.
        </Alert>
      )}
    </Box>
  );
}
