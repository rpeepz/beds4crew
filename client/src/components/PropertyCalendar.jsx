import React, { useMemo } from "react";
import { Box, Typography, Paper, Grid, Tooltip } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export default function PropertyCalendar({ 
  bookings = [], 
  blockedPeriods = [], 
  monthsToShow = 3, 
  isOwner = false,
  property = null,
  pendingBookings = []
}) {
  // Generate calendar data with bed-level availability
  const calendarData = useMemo(() => {
    const today = dayjs();
    const months = [];

    // Create bed availability map per date
    const bedAvailabilityByDate = new Map();
    const occupiedDates = new Set();
    const blockedDates = new Set();
    const pendingDates = new Set();
    
    // Calculate total beds if property is provided
    const bedsFromRooms = property?.rooms?.reduce((sum, room) => {
      const beds = room.beds || [];
      const availableBeds = beds.filter(bed => bed.isAvailable !== false);
      const count = availableBeds.length > 0 ? availableBeds.length : beds.length;
      return sum + count;
    }, 0) || 0;
    const totalBeds = Math.max(bedsFromRooms, property?.maxGuests || 0);

    // Calculate bed availability for each date
    if (property?.rooms) {
      // Initialize bed availability for all dates we'll show
      const startRange = today;
      const endRange = today.add(monthsToShow, 'month').endOf('month');
      let current = startRange;
      
      while (current.isBefore(endRange) || current.isSame(endRange, 'day')) {
        const dateStr = current.format("YYYY-MM-DD");
        // Start with all available beds
        const availableBedsForDate = {
          total: totalBeds,
          available: totalBeds,
          booked: 0,
          pending: 0,
          blocked: 0
        };
        bedAvailabilityByDate.set(dateStr, availableBedsForDate);
        current = current.add(1, 'day');
      }

      // Track confirmed booked beds per date
      bookings.forEach((booking) => {
        const start = dayjs.utc(booking.startDate);
        const end = dayjs.utc(booking.endDate);
        let current = start;
        
        while (current.isBefore(end) || current.isSame(end, "day")) {
          const dateStr = current.format("YYYY-MM-DD");
          const availability = bedAvailabilityByDate.get(dateStr);
          
          if (availability) {
            // Count how many beds are booked
            const bedCount = (booking.bookedBeds && booking.bookedBeds.length > 0) 
              ? booking.bookedBeds.length 
              : totalBeds;
            
            availability.booked += bedCount;
            occupiedDates.add(dateStr);
            availability.available = Math.max(0, availability.total - availability.booked - availability.pending - availability.blocked);
          }
          
          current = current.add(1, "day");
        }
      });
      
      // Track pending booked beds per date
      pendingBookings.forEach((booking) => {
        const start = dayjs.utc(booking.startDate);
        const end = dayjs.utc(booking.endDate);
        let current = start;
        
        while (current.isBefore(end) || current.isSame(end, "day")) {
          const dateStr = current.format("YYYY-MM-DD");
          const availability = bedAvailabilityByDate.get(dateStr);
          
          if (availability) {
            // Count how many beds are pending
            const bedCount = (booking.bookedBeds && booking.bookedBeds.length > 0) 
              ? booking.bookedBeds.length 
              : totalBeds;
            
            availability.pending += bedCount;
            pendingDates.add(dateStr);
            availability.available = Math.max(0, availability.total - availability.booked - availability.pending - availability.blocked);
          }
          
          current = current.add(1, "day");
        }
      });
      
      // Track blocked beds per date
      blockedPeriods.forEach((block) => {
        const start = dayjs.utc(block.startDate + 1);
        const end = dayjs.utc(block.endDate);
        let current = start;
        
        while (current.isBefore(end) || current.isSame(end, "day")) {
          const dateStr = current.format("YYYY-MM-DD");
          const availability = bedAvailabilityByDate.get(dateStr);
          
          if (availability) {
            // Count how many beds are blocked
            let blockedBedCount = 0;
            if (block.blockType === "entire") {
              blockedBedCount = totalBeds;
            } else if (block.blockType === "room" && property.rooms[block.roomIndex]) {
              blockedBedCount = property.rooms[block.roomIndex].beds.filter(b => b.isAvailable).length;
            } else if (block.blockType === "bed") {
              blockedBedCount = 1;
            }
            
            availability.blocked += blockedBedCount;
            availability.available = Math.max(0, availability.total - availability.booked - availability.blocked);
          }
          
          blockedDates.add(dateStr);
          occupiedDates.add(dateStr); // Also mark as occupied for guests
          current = current.add(1, "day");
        }
      });
    } else {
      // Fallback to old behavior if no property data
      bookings.forEach((booking) => {
        const start = dayjs(booking.startDate);
        const end = dayjs(booking.endDate);
        let current = start;
        
        while (current.isBefore(end) || current.isSame(end, "day")) {
          occupiedDates.add(current.format("YYYY-MM-DD"));
          current = current.add(1, "day");
        }
      });
      
      blockedPeriods.forEach((block) => {
        const start = dayjs(block.startDate);
        const end = dayjs(block.endDate);
        let current = start;
        
        while (current.isBefore(end) || current.isSame(end, "day")) {
          const dateStr = current.format("YYYY-MM-DD");
          blockedDates.add(dateStr);
          occupiedDates.add(dateStr);
          current = current.add(1, "day");
        }
      });
    }

    // Generate months
    for (let i = 0; i < monthsToShow; i++) {
      const monthDate = today.add(i, "month");
      const firstDay = monthDate.startOf("month");
      const daysInMonth = monthDate.daysInMonth();
      const startDayOfWeek = firstDay.day(); // 0 = Sunday

      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let j = 0; j < startDayOfWeek; j++) {
        days.push(null);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = monthDate.date(day);
        const dateStr = date.format("YYYY-MM-DD");
        const isPast = date.isBefore(today, "day");
        const isBlocked = blockedDates.has(dateStr);
        const isBooked = occupiedDates.has(dateStr) && !isBlocked;
        const bedAvailability = bedAvailabilityByDate.get(dateStr);
        
        days.push({
          day,
          date: dateStr,
          isPast,
          isBlocked,
          isBooked,
          isFree: !isPast && !occupiedDates.has(dateStr),
          bedAvailability: bedAvailability || null
        });
      }

      months.push({
        name: monthDate.format("MMMM YYYY"),
        days,
      });
    }

    return months;
  }, [bookings, blockedPeriods, monthsToShow, property]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Availability Calendar
      </Typography>
      
      <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: "#4caf50", borderRadius: 1 }} />
          <Typography variant="caption">All Beds Free</Typography>
        </Box>
        {property && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: "#ffeb3b", borderRadius: 1 }} />
            <Typography variant="caption">Some Beds Available</Typography>
          </Box>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: "#2196f3", borderRadius: 1 }} />
          <Typography variant="caption">Pending Request</Typography>
        </Box>
        {isOwner && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: "#ff9800", borderRadius: 1 }} />
            <Typography variant="caption">Blocked</Typography>
          </Box>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: "#f44336", borderRadius: 1 }} />
          <Typography variant="caption">{isOwner ? "All Beds Booked" : "Fully Booked"}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: "#e0e0e0", borderRadius: 1 }} />
          <Typography variant="caption">Past</Typography>
        </Box>
      </Box>

      <Box sx={{ 
        display: "flex", 
        gap: 2, 
        overflowX: "auto", 
        pb: 1, 
        scrollBehavior: "smooth",
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": {
          height: 8
        },
        "&::-webkit-scrollbar-track": {
          bgcolor: "transparent"
        },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: "divider",
          borderRadius: 1,
          "&:hover": {
            bgcolor: "action.disabled"
          }
        }
      }}>
        {calendarData.map((month, idx) => (
          <Paper key={idx} elevation={2} sx={{ p: { xs: 1.5, sm: 2 }, minWidth: { xs: "100%", sm: "calc(50% - 8px)", md: "calc(33.333% - 11px)" }, flex: "0 0 auto" }}>
              <Typography variant="subtitle1" align="center" gutterBottom fontWeight="bold">
                {month.name}
              </Typography>
              
              {/* Week day headers */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1 }}>
                {weekDays.map((day) => (
                  <Typography
                    key={day}
                    variant="caption"
                    align="center"
                    fontWeight="bold"
                    color="text.secondary"
                  >
                    {day}
                  </Typography>
                ))}
              </Box>

              {/* Calendar days */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: { xs: 0.35, sm: 0.5 } }}>
                {month.days.map((day, dayIdx) => {
                  const hasPartialAvailability = day?.bedAvailability && 
                    day.bedAvailability.available > 0 && 
                    day.bedAvailability.available < day.bedAvailability.total &&
                    !day.bedAvailability.pending;
                  
                  const tooltipContent = day?.bedAvailability ? (
                    <Box>
                      <Typography variant="caption" display="block" fontWeight="bold">
                        {dayjs(day.date).format('MMM D, YYYY')}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Available: {day.bedAvailability.available}/{day.bedAvailability.total} beds
                      </Typography>
                      {day.bedAvailability.booked > 0 && (
                        <Typography variant="caption" display="block">
                          Booked: {day.bedAvailability.booked} beds
                        </Typography>
                      )}
                      {day.bedAvailability.pending > 0 && (
                        <Typography variant="caption" display="block">
                          Pending: {day.bedAvailability.pending} beds
                        </Typography>
                      )}
                      {day.bedAvailability.blocked > 0 && isOwner && (
                        <Typography variant="caption" display="block">
                          Blocked: {day.bedAvailability.blocked} beds
                        </Typography>
                      )}
                    </Box>
                  ) : null;
                  return (                    <Tooltip key={dayIdx} title={tooltipContent || ""} arrow>
                      <Box
                        sx={{
                          aspectRatio: "1",
                          minHeight: { xs: 32, sm: 38 },
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 1,
                          bgcolor: day
                            ? day.isPast
                              ? "#e0e0e0"
                              : day.isBooked || (day.isBlocked && !isOwner)
                              ? "#f44336"
                              : day.bedAvailability?.pending && day.bedAvailability.pending > 0
                              ? "#2196f3"
                              : hasPartialAvailability && !day.bedAvailability?.pending
                              ? "#ffeb3b"
                              : day.isBlocked && isOwner
                              ? "#ff9800"
                              : "#4caf50"
                            : "transparent",
                          color: day ? (
                            day.isPast 
                              ? "#757575" 
                              : (day.bedAvailability?.pending && day.bedAvailability.pending > 0) || hasPartialAvailability
                              ? "#000" 
                              : "white"
                          ) : "transparent",
                          fontSize: { xs: "0.7rem", sm: "0.8rem" },
                          fontWeight: day?.isFree ? "bold" : "normal",
                          cursor: day && !day.isPast ? "pointer" : "default",
                          position: "relative",
                          transition: "transform 0.15s ease",
                          "&:hover": day && !day.isPast ? {
                            boxShadow: 2,
                            transform: "scale(1.03)"
                          } : {}
                        }}
                      >
                        <Typography variant="caption" fontWeight="inherit">
                          {day?.day || ""}
                        </Typography>
                        {day?.bedAvailability && !day.isPast && property && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: { xs: "0.55rem", sm: "0.65rem" },
                              lineHeight: 1,
                              fontWeight: "bold"
                            }}
                          >
                            {day.bedAvailability.available}/{day.bedAvailability.total}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
