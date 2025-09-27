import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { BoL, BoLStatus } from '../types';
import { bolService } from '../services/bolService';
import { useAuth } from '../hooks/useAuth';

const STATUS_COLORS: Record<BoLStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning',
  approved: 'info',
  assigned: 'primary',
  accepted: 'primary',
  picked_up: 'secondary',
  en_route: 'secondary',
  delivered: 'success',
  unpaid: 'warning',
  paid: 'success',
};

const STATUS_LABELS: Record<BoLStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  assigned: 'Assigned',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  en_route: 'En Route',
  delivered: 'Delivered',
  unpaid: 'Unpaid',
  paid: 'Paid',
};

const STATUS_PROGRESSION: Record<BoLStatus, BoLStatus[]> = {
  pending: ['approved'],
  approved: ['assigned'],
  assigned: ['accepted'],
  accepted: ['picked_up'],
  picked_up: ['en_route'],
  en_route: ['delivered'],
  delivered: ['unpaid'],
  unpaid: ['paid'],
  paid: [],
};

export default function BoLDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bol, setBol] = useState<BoL | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<BoLStatus>('pending');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBoL();
    }
  }, [id]);

  const fetchBoL = async () => {
    try {
      setLoading(true);
      setError('');
      const bolData = await bolService.getBoL(id!);
      setBol(bolData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch BoL');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!bol) return;

    try {
      setUpdatingStatus(true);
      const updatedBoL = await bolService.updateBoLStatus(bol.id, newStatus, statusNotes);
      setBol(updatedBoL);
      setStatusDialogOpen(false);
      setStatusNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatWeight = (weight: number) => {
    return `${weight.toLocaleString()} lbs`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: BoLStatus) => {
    switch (status) {
      case 'pending':
        return <ScheduleIcon />;
      case 'approved':
        return <CheckCircleIcon />;
      case 'assigned':
      case 'accepted':
        return <ShippingIcon />;
      case 'picked_up':
      case 'en_route':
        return <LocationIcon />;
      case 'delivered':
        return <CheckCircleIcon />;
      case 'unpaid':
      case 'paid':
        return <ReceiptIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  const canUpdateStatus = (status: BoLStatus) => {
    if (!user || !bol) return false;

    const hasPermission = user.roles.some(role => ['admin', 'carrier'].includes(role));
    const nextStatuses = STATUS_PROGRESSION[status];

    return hasPermission && nextStatuses.length > 0;
  };

  const canEdit = user?.roles.some(role => ['admin', 'shipper', 'broker'].includes(role));

  if (loading) {
    return (
      <AppLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error || !bol) {
    return (
      <AppLayout>
        <Alert severity="error">
          {error || 'BoL not found'}
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={() => navigate('/bol')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" color="primary">
                {bol.bolNumber}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {getStatusIcon(bol.status)}
                <Chip
                  label={STATUS_LABELS[bol.status]}
                  color={STATUS_COLORS[bol.status]}
                  sx={{ ml: 1 }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {canUpdateStatus(bol.status) && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<ShippingIcon />}
                onClick={() => {
                  const nextStatuses = STATUS_PROGRESSION[bol.status];
                  if (nextStatuses.length > 0) {
                    setNewStatus(nextStatuses[0]);
                    setStatusDialogOpen(true);
                  }
                }}
              >
                Update Status
              </Button>
            )}

            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/bol/${bol.id}/edit`)}
              >
                Edit BoL
              </Button>
            )}
          </Box>
        </Box>

        {/* Key Information Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Pickup Date
                </Typography>
                <Typography variant="h6">
                  {formatDate(bol.pickupDate)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {bol.deliveryDate && (
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Delivery Date
                  </Typography>
                  <Typography variant="h6">
                    {formatDate(bol.deliveryDate)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Weight
                </Typography>
                <Typography variant="h6">
                  {formatWeight(bol.totalWeight)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(bol.totalValue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Shipper and Consignee Information */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Shipper Information
                </Typography>
                <Typography variant="subtitle1" fontWeight="medium">
                  {bol.shipper.companyName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bol.shipper.contactPerson}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bol.shipper.email} • {bol.shipper.phone}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {bol.shipper.address.street}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bol.shipper.address.city}, {bol.shipper.address.state} {bol.shipper.address.zipCode}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Consignee Information
                </Typography>
                <Typography variant="subtitle1" fontWeight="medium">
                  {bol.consignee.companyName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bol.consignee.contactPerson}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bol.consignee.email} • {bol.consignee.phone}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {bol.consignee.address.street}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {bol.consignee.address.city}, {bol.consignee.address.state} {bol.consignee.address.zipCode}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Carrier Information */}
        {bol.carrier && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Carrier Information
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {bol.carrier.companyName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bol.carrier.contactPerson}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bol.carrier.email} • {bol.carrier.phone}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {bol.driverInfo && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      Driver Information
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {bol.driverInfo.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      License: {bol.driverInfo.licenseNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Phone: {bol.driverInfo.phone}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {/* Cargo Items */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Cargo Items ({bol.cargoItems.length})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Package Type</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>Dimensions</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bol.cargoItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.description}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.packageType}</TableCell>
                      <TableCell>{formatWeight(item.weight)}</TableCell>
                      <TableCell>
                        {item.dimensions?.length && item.dimensions?.width && item.dimensions?.height
                          ? `${item.dimensions.length}" × ${item.dimensions.width}" × ${item.dimensions.height}"`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{formatCurrency(item.value)}</TableCell>
                      <TableCell>
                        <Chip label={item.cargoType} size="small" color="primary" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Freight Charges */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Freight Charges
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Base Rate
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(bol.freightCharges.baseRate)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Fuel Surcharge
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(bol.freightCharges.fuelSurcharge)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Accessorials
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(bol.freightCharges.accessorials)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(bol.freightCharges.total)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Special Instructions */}
        {bol.specialInstructions && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Special Instructions
              </Typography>
              <Typography variant="body1">
                {bol.specialInstructions}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Timeline
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {formatDateTime(bol.createdAt)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body1">
                  {formatDateTime(bol.updatedAt)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update BoL Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Status: <strong>{STATUS_LABELS[bol.status]}</strong>
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={newStatus}
              label="New Status"
              onChange={(e) => setNewStatus(e.target.value as BoLStatus)}
            >
              {STATUS_PROGRESSION[bol.status].map((status) => (
                <MenuItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Notes (Optional)"
            multiline
            rows={3}
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="Add any notes about this status change..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={updatingStatus}
            startIcon={updatingStatus ? <CircularProgress size={20} /> : undefined}
          >
            {updatingStatus ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}