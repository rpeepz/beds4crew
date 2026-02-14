// filepath: /Users/cross/Desktop/property-rental-platform/client/src/components/RoomBedsConfigurator.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Typography,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

export default function RoomBedsConfigurator({
  rooms,
  onChange,
  propertyType = "accommodation",
  simplePrice = "",
  onSimplePriceChange,
  disableAutoReset = false,
}) {
  const [bedOptions, setBedOptions] = useState([]);
  const [openRoomDialog, setOpenRoomDialog] = useState(false);
  const [openBedDialog, setOpenBedDialog] = useState(false);
  const [currentRoomIdx, setCurrentRoomIdx] = useState(null);
  const [newRoom, setNewRoom] = useState({ isPrivate: true, beds: [] });
  const [newBed, setNewBed] = useState({ label: "", pricePerBed: "" });
  const [useSimplePricing, setUseSimplePricing] = useState(false);
  const [simplePricePerNight, setSimplePricePerNight] = useState("");

  useEffect(() => {
    fetch("/beds.json")
      .then((res) => res.json())
      .then((data) => {
        const allBeds = [
          ...data.most_common,
          ...data.structural_and_frame,
          ...data.sofa_and_convertible,
          ...data.portable_and_temporary,
        ];
        setBedOptions(allBeds);
      })
      .catch((err) => console.error("Failed to load beds.json:", err));
  }, []);

  const hasInitialized = useRef(false);

  // Reset rooms and pricing mode when property type changes
  useEffect(() => {
    if (disableAutoReset) {
      return;
    }
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (rooms?.length) {
        return;
      }
    }
    onChange([]);
    setUseSimplePricing(false);
    setSimplePricePerNight("");
  }, [propertyType, disableAutoReset]);

  // Sync external simplePrice prop with internal state
  useEffect(() => {
    if (useSimplePricing && simplePrice !== simplePricePerNight) {
      setSimplePricePerNight(simplePrice);
      if (rooms.length > 0 && rooms[0].beds.length > 0) {
        const updatedRooms = [...rooms];
        updatedRooms[0].beds[0].pricePerBed = parseFloat(simplePrice) || 0;
        onChange(updatedRooms);
      }
    }
  }, [simplePrice]);

  // Get type-specific constraints
  const getTypeConstraints = () => {
    switch (propertyType) {
      case "private":
        return {
          maxRooms: 1,
          isPrivateOnly: true,
          description: "Private Room - Limited to 1 room with configurable beds"
        };
      case "bed":
        return {
          maxRooms: 1,
          maxBedsPerRoom: 1,
          isPrivateOnly: true,
          description: "Individual Bed - Limited to 1 room with 1 bed"
        };
      case "accommodation":
      default:
        return {
          maxRooms: null,
          description: "Accommodation - Configure multiple rooms and beds"
        };
    }
  };

  const constraints = getTypeConstraints();

  // Generate simple pricing room when toggling accommodation mode
  const handleToggleSimplePricing = (checked) => {
    setUseSimplePricing(checked);
    if (checked) {
      // Create a simple single room with single bed
      onChange([
        {
          isPrivate: true,
          beds: [
            {
              label: "Standard Bed",
              pricePerBed: 0,
              isAvailable: true,
            }
          ]
        }
      ]);
    } else {
      onChange([]);
      setSimplePricePerNight("");
    }
  };

  const handleUpdateSimplePrice = (price) => {
    setSimplePricePerNight(price);
    if (rooms.length > 0 && rooms[0].beds.length > 0) {
      const updatedRooms = [...rooms];
      updatedRooms[0].beds[0].pricePerBed = parseFloat(price) || 0;
      onChange(updatedRooms);
    }
    // Notify parent component of the price change
    if (onSimplePriceChange) {
      onSimplePriceChange(price);
    }
  };

  const handleAddRoom = () => {
    // Check if max rooms constraint violated
    if (constraints.maxRooms && rooms.length >= constraints.maxRooms) {
      return;
    }
    setNewRoom({ 
      isPrivate: constraints.isPrivateOnly !== false ? true : true, 
      beds: [] 
    });
    setCurrentRoomIdx(null);
    setOpenRoomDialog(true);
  };

  const handleSaveRoom = () => {
    if (currentRoomIdx !== null) {
      const updatedRooms = [...rooms];
      updatedRooms[currentRoomIdx] = newRoom;
      onChange(updatedRooms);
    } else {
      onChange([...rooms, newRoom]);
    }
    setOpenRoomDialog(false);
  };

  const handleDeleteRoom = (idx) => {
    onChange(rooms.filter((_, i) => i !== idx));
  };

  const handleEditRoom = (idx) => {
    setCurrentRoomIdx(idx);
    setNewRoom(JSON.parse(JSON.stringify(rooms[idx])));
    setOpenRoomDialog(true);
  };

  const handleAddBedToRoom = () => {
    // Check bed constraint for individual bed type
    if (constraints.maxBedsPerRoom === 1 && newRoom.beds.length >= 1) {
      return;
    }
    setNewBed({ label: "", pricePerBed: "" });
    setOpenBedDialog(true);
  };

  const handleSaveBed = () => {
    if (newBed.label && newBed.pricePerBed) {
      const bedToAdd = {
        label: newBed.label,
        pricePerBed: parseFloat(newBed.pricePerBed),
        isAvailable: true,
      };
      setNewRoom((prev) => ({
        ...prev,
        beds: [...prev.beds, bedToAdd],
      }));
      setOpenBedDialog(false);
    }
  };

  const handleDeleteBed = (bedIdx) => {
    setNewRoom((prev) => ({
      ...prev,
      beds: prev.beds.filter((_, i) => i !== bedIdx),
    }));
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" mb={2}>
        Configure Rooms & Beds
      </Typography>

      {/* Accommodation simple pricing mode */}
      {propertyType === "accommodation" && (
        <Card sx={{ mb: 3, bgcolor: "#f0f7ff" }}>
          <CardContent>
            <FormControlLabel
              control={
                <Checkbox
                  checked={useSimplePricing}
                  onChange={(e) => handleToggleSimplePricing(e.target.checked)}
                />
              }
              label="Use simple pricing for entire place"
            />
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1, ml: 4 }}>
              Enable this to set a single price per night for your entire property instead of configuring individual rooms and beds.
            </Typography>
            {useSimplePricing && (
              <TextField
                fullWidth
                type="number"
                label="Price per Night (entire property)"
                value={simplePricePerNight}
                onChange={(e) => handleUpdateSimplePrice(e.target.value)}
                inputProps={{ step: "0.01", min: "0" }}
                sx={{ mt: 2 }}
                required
              />
            )}
          </CardContent>
        </Card>
      )}

      {!useSimplePricing && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {constraints.description}
            </Typography>
          </Alert>

          {/* Display existing rooms */}
          {rooms.map((room, roomIdx) => (
            <Card key={roomIdx} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    {room.isPrivate ? "🔒 Private Room" : "🔓 Shared Room"} #{roomIdx + 1}
                  </Typography>
                  <Box>
                    <Button size="small" onClick={() => handleEditRoom(roomIdx)} sx={{ mr: 1 }}>
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRoom(roomIdx)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" mb={1}>
                  Beds in this room:
                </Typography>
                {room.beds.length > 0 ? (
                  <Box sx={{ pl: 2 }}>
                    {room.beds.map((bed, bedIdx) => (
                      <Box
                        key={bedIdx}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1, p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}
                      >
                        <Typography variant="body2">
                          {bed.label} - ${bed.pricePerBed}/night
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="caption" color="textSecondary" sx={{ pl: 2 }}>
                    No beds configured for this room yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRoom}
            disabled={constraints.maxRooms && rooms.length >= constraints.maxRooms}
            sx={{ mb: 3 }}
          >
            {propertyType === "private" ? "Add Room (max 1)" : propertyType === "bed" ? "Add Room (max 1)" : "Add Room"}
          </Button>

          {/* Room Dialog */}
          <Dialog open={openRoomDialog} onClose={() => setOpenRoomDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              {currentRoomIdx !== null ? "Edit Room" : "Add New Room"}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {propertyType === "accommodation" && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newRoom.isPrivate}
                      onChange={(e) =>
                        setNewRoom((prev) => ({ ...prev, isPrivate: e.target.checked }))
                      }
                    />
                  }
                  label="Private Room (not shared with other guests)"
                />
              )}
              {(propertyType === "private" || propertyType === "bed") && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    {propertyType === "private" ? "This is a private room - guests cannot share with others" : "This is an individual bed - only 1 bed allowed"}
                  </Typography>
                </Alert>
              )}

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                Beds in this room: {newRoom.beds.length} {constraints.maxBedsPerRoom && `/ ${constraints.maxBedsPerRoom}`}
              </Typography>
              {newRoom.beds.map((bed, bedIdx) => (
                <Box
                  key={bedIdx}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1, p: 1, bgcolor: "#f5f5f5", borderRadius: 1 }}
                >
                  <Typography variant="body2">
                    {bed.label} - ${bed.pricePerBed}/night
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteBed(bedIdx)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddBedToRoom}
                disabled={constraints.maxBedsPerRoom && newRoom.beds.length >= constraints.maxBedsPerRoom}
                sx={{ mt: 1, mb: 2 }}
                fullWidth
              >
                {constraints.maxBedsPerRoom === 1 ? "Add Bed (max 1)" : "Add Bed to Room"}
              </Button>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenRoomDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSaveRoom}
                variant="contained"
                disabled={newRoom.beds.length === 0}
              >
                Save Room
              </Button>
            </DialogActions>
          </Dialog>

          {/* Bed Dialog */}
          <Dialog 
            open={openBedDialog} 
            onClose={() => setOpenBedDialog(false)} 
            maxWidth="sm" 
            fullWidth
            disableRestoreFocus
          >
            <DialogTitle>Add Bed to Room</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Select
                fullWidth
                autoFocus
                displayEmpty
                label="Bed Type"
                value={newBed.label}
                onChange={(e) => setNewBed((prev) => ({ ...prev, label: e.target.value }))}
                sx={{ mb: 2 }}
                renderValue={(value) => {
                  if (value === "") {
                    return <em>Select bed type</em>;
                  }
                  return value;
                }}
              >
                <MenuItem value="">Select bed type</MenuItem>
                {bedOptions.map((bed) => (
                  <MenuItem key={bed.id} value={bed.name}>
                    {bed.name}
                  </MenuItem>
                ))}
              </Select>

              <TextField
                fullWidth
                type="number"
                label="Price per Bed (per night)"
                value={newBed.pricePerBed}
                onChange={(e) =>
                  setNewBed((prev) => ({ ...prev, pricePerBed: e.target.value }))
                }
                inputProps={{ step: "0.01", min: "0" }}
                required
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenBedDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveBed} variant="contained">
                Add Bed
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}
