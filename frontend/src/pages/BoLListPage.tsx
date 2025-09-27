import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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

export default function BoLListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bols, setBols] = useState<BoL[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Pagination and filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BoLStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Statistics
  const [stats, setStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
    totalWeight: number;
  } | null>(null);

  const fetchBoLs = async () => {
    try {
      setLoading(true);
      setError('');

      const filters = {
        page,
        limit: 10,
        ...(statusFilter && { status: [statusFilter] }),
        ...(searchTerm && { search: searchTerm }),
      };

      const response = await bolService.getBols(filters);
      setBols(response.bols);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch BoLs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await bolService.getBolStats();
      setStats(statsData);
    } catch (err) {
      console.warn('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchBoLs();
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleStatusFilter = (status: BoLStatus | '') => {
    setStatusFilter(status);
    setPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
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

  const canCreateBoL = user?.roles.some(role => ['admin', 'shipper', 'broker'].includes(role));

  return (
    <AppLayout>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" color="primary">
            Bills of Lading
          </Typography>
          {canCreateBoL && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/bol/create')}
              size="large"
            >
              Create BoL
            </Button>
          )}
        </Box>

        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    Total BoLs
                  </Typography>
                  <Typography variant="h4">
                    {stats.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="secondary">
                    Total Value
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats.totalValue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="info.main">
                    Total Weight
                  </Typography>
                  <Typography variant="h4">
                    {formatWeight(stats.totalWeight)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success.main">
                    En Route
                  </Typography>
                  <Typography variant="h4">
                    {stats.byStatus.en_route || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Search BoLs"
            variant="outlined"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search by BoL number, shipper, or consignee"
            sx={{ minWidth: 300 }}
          />

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              label="Status Filter"
              onChange={(e) => handleStatusFilter(e.target.value as BoLStatus | '')}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <MenuItem key={status} value={status}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* BoL Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>BoL Number</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Shipper</TableCell>
                  <TableCell>Consignee</TableCell>
                  <TableCell>Pickup Date</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bols.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body1" color="text.secondary" sx={{ py: 3 }}>
                        No Bills of Lading found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  bols.map((bol) => (
                    <TableRow key={bol.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {bol.bolNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[bol.status]}
                          color={STATUS_COLORS[bol.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {bol.shipper.companyName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {bol.shipper.address.city}, {bol.shipper.address.state}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {bol.consignee.companyName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {bol.consignee.address.city}, {bol.consignee.address.state}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(bol.pickupDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatCurrency(bol.totalValue)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatWeight(bol.totalWeight)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/bol/${bol.id}`)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>

                          {user?.roles.some(role => ['admin', 'carrier'].includes(role)) && (
                            <Tooltip title="Edit BoL">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/bol/${bol.id}/edit`)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}

                          {bol.status === 'assigned' && (
                            <Tooltip title="Track Shipment">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => navigate(`/bol/${bol.id}/track`)}
                              >
                                <ShippingIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}
    </AppLayout>
  );
}