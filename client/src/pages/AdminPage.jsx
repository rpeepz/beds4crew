import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_URL } from '../utils/api';
import { useSnackbar } from '../components/AppSnackbar';
import { commonStyles } from '../utils/styleConstants';

const ADMIN_ID = '698c112bbc6f9ffd822acf3c';
const ADMIN_EMAIL = 'r.papagna@gmail.com';

export default function AdminPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [currentUser, setCurrentUser] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormData, setUserFormData] = useState({});

  // Listings state
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [editListingOpen, setEditListingOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingFormData, setListingFormData] = useState({});

  // Check authorization and fetch data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(user);

        if (user.id === ADMIN_ID && user.email === ADMIN_EMAIL) {
          setAuthorized(true);
          fetchUsers();
          fetchListings();
        } else {
          setAuthorized(false);
          snackbar('Unauthorized: Admin access denied', 'error');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        snackbar('Authorization failed', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, snackbar]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
      snackbar('Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchListings = async () => {
    setListingsLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/properties`);
      if (!res.ok) throw new Error('Failed to fetch listings');
      const data = await res.json();
      setListings(data);
    } catch (err) {
      console.error('Error fetching listings:', err);
      snackbar('Failed to load listings', 'error');
    } finally {
      setListingsLoading(false);
    }
  };

  // User edit handlers
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || 'guest',
      hasPaid: user.hasPaid || false,
    });
    setEditUserOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData),
      });
      if (!res.ok) throw new Error('Failed to update user');
      snackbar('User updated successfully', 'success');
      setEditUserOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      snackbar('Failed to save user', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete user');
      snackbar('User deleted successfully', 'success');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      snackbar('Failed to delete user', 'error');
    }
  };

  // Listing edit handlers
  const handleEditListing = (listing) => {
    setSelectedListing(listing);
    setListingFormData({
      title: listing.title || '',
      description: listing.description || '',
      pricePerNight: listing.pricePerNight || 0,
      maxGuests: listing.maxGuests || 0,
      category: listing.category || '',
      isActive: listing.isActive || false,
    });
    setEditListingOpen(true);
  };

  const handleSaveListing = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/properties/${selectedListing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingFormData),
      });
      if (!res.ok) throw new Error('Failed to update listing');
      snackbar('Listing updated successfully', 'success');
      setEditListingOpen(false);
      fetchListings();
    } catch (err) {
      console.error('Error saving listing:', err);
      snackbar('Failed to save listing', 'error');
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/admin/properties/${listingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete listing');
      snackbar('Listing deleted successfully', 'success');
      fetchListings();
    } catch (err) {
      console.error('Error deleting listing:', err);
      snackbar('Failed to delete listing', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!authorized) {
    return (
      <Box sx={commonStyles.contentContainer}>
        <Alert severity="error">
          <Typography variant="body1">Unauthorized: Admin access denied</Typography>
          <Typography variant="body2">You are being redirected...</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={commonStyles.contentContainer}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 800 }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage users and listings
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Users" />
          <Tab label="Listings" />
        </Tabs>

        {/* Users Tab */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">All Users ({users.length})</Typography>
              <Button variant="outlined" onClick={fetchUsers} disabled={usersLoading}>
                {usersLoading ? <CircularProgress size={24} /> : 'Refresh'}
              </Button>
            </Box>

            {usersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : users.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell><strong>Role</strong></TableCell>
                      <TableCell><strong>Subscription</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map(user => {
                      const subStatus = user.subscriptionStatus || '';
                      const isActive = ['active', 'trialing'].includes(subStatus);
                      const hasStripe = Boolean(user.stripeCustomerId);
                      
                      let displayLabel = 'No subscription';
                      let displayColor = 'default';
                      
                      if (isActive) {
                        displayLabel = subStatus === 'trialing' ? 'Trial' : 'Active';
                        displayColor = 'success';
                      } else if (hasStripe && subStatus) {
                        displayLabel = subStatus.replace('_', ' ');
                        displayColor = 'warning';
                      } else if (user.hasPaid) {
                        displayLabel = 'Legacy paid';
                        displayColor = 'info';
                      }
                      
                      return (
                        <TableRow key={user._id}>
                          <TableCell>{user.firstName} {user.lastName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip label={user.role} color={user.role === 'host' ? 'primary' : 'default'} size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label={displayLabel} color={displayColor} size="small" />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleEditUser(user)} color="primary">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDeleteUser(user._id)} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No users found
              </Typography>
            )}
          </Box>
        )}

        {/* Listings Tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">All Listings ({listings.length})</Typography>
              <Button variant="outlined" onClick={fetchListings} disabled={listingsLoading}>
                {listingsLoading ? <CircularProgress size={24} /> : 'Refresh'}
              </Button>
            </Box>

            {listingsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : listings.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Title</strong></TableCell>
                      <TableCell><strong>Host</strong></TableCell>
                      <TableCell><strong>Price/Night</strong></TableCell>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Active</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {listings.map(listing => (
                      <TableRow key={listing._id}>
                        <TableCell>{listing.title}</TableCell>
                        <TableCell>{listing.ownerHost?.firstName} {listing.ownerHost?.lastName}</TableCell>
                        <TableCell>${listing.pricePerNight}</TableCell>
                        <TableCell>{listing.category}</TableCell>
                        <TableCell>
                          <Chip label={listing.isActive ? 'Yes' : 'No'} color={listing.isActive ? 'success' : 'error'} size="small" />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleEditListing(listing)} color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteListing(listing._id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No listings found
              </Typography>
            )}
          </Box>
        )}
      </Card>

      {/* User Edit Dialog */}
      <Dialog open={editUserOpen} onClose={() => setEditUserOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="First Name"
            value={userFormData.firstName || ''}
            onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Last Name"
            value={userFormData.lastName || ''}
            onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
            fullWidth
          />
          <TextField
            label="Email"
            value={userFormData.email || ''}
            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
            fullWidth
            disabled
          />
          <TextField
            select
            label="Role"
            value={userFormData.role || 'guest'}
            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
            fullWidth
          >
            <MenuItem value="guest">Guest</MenuItem>
            <MenuItem value="host">Host</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={userFormData.hasPaid || false}
                onChange={(e) => setUserFormData({ ...userFormData, hasPaid: e.target.checked })}
              />
            }
            label="Has Paid (Verified)"
          />
          {selectedUser && (
            <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Subscription Details</Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Stripe Customer:</strong> {selectedUser.stripeCustomerId || 'None'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong> {selectedUser.subscriptionStatus || 'No subscription'}
              </Typography>
              {selectedUser.subscriptionCurrentPeriodEnd && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Period End:</strong> {new Date(selectedUser.subscriptionCurrentPeriodEnd).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Listing Edit Dialog */}
      <Dialog open={editListingOpen} onClose={() => setEditListingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Listing</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Title"
            value={listingFormData.title || ''}
            onChange={(e) => setListingFormData({ ...listingFormData, title: e.target.value })}
            fullWidth
          />
          <TextField
            label="Description"
            value={listingFormData.description || ''}
            onChange={(e) => setListingFormData({ ...listingFormData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
          <TextField
            label="Price Per Night"
            type="number"
            value={listingFormData.pricePerNight || 0}
            onChange={(e) => setListingFormData({ ...listingFormData, pricePerNight: parseFloat(e.target.value) })}
            fullWidth
          />
          <TextField
            label="Max Guests"
            type="number"
            value={listingFormData.maxGuests || 0}
            onChange={(e) => setListingFormData({ ...listingFormData, maxGuests: parseInt(e.target.value) })}
            fullWidth
          />
          <TextField
            label="Category"
            value={listingFormData.category || ''}
            onChange={(e) => setListingFormData({ ...listingFormData, category: e.target.value })}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={listingFormData.isActive || false}
                onChange={(e) => setListingFormData({ ...listingFormData, isActive: e.target.checked })}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditListingOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveListing} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
