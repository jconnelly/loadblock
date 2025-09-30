import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  LocalShipping as CarrierIcon,
  Assignment as AssignedIcon,
  DirectionsCar as EnRouteIcon,
  CheckCircle as DeliveredIcon,
  Schedule as PendingIcon,
  AttachMoney as PaymentIcon,
  Route as RouteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface CarrierDashboardProps {
  user: any;
}

interface CarrierStats {
  assignedBoLs: number;
  inTransitBoLs: number;
  completedThisMonth: number;
  pendingPayments: number;
  totalRevenue: number;
  activeCargo: {
    id: string;
    bolNumber: string;
    origin: string;
    destination: string;
    status: string;
    estimatedDelivery: string;
    cargoValue: number;
  }[];
  recentDeliveries: {
    id: string;
    bolNumber: string;
    deliveredAt: string;
    destination: string;
    value: number;
  }[];
}

export default function CarrierDashboard({ user }: CarrierDashboardProps) {
  const navigate = useNavigate();
  const [carrierStats, setCarrierStats] = useState<CarrierStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCarrierStats = async () => {
      try {
        // Mock carrier data - replace with actual API call
        const mockStats: CarrierStats = {
          assignedBoLs: 12,
          inTransitBoLs: 8,
          completedThisMonth: 23,
          pendingPayments: 5,
          totalRevenue: 147500,
          activeCargo: [
            {
              id: 'bol-001',
              bolNumber: 'BOL-2024-000123',
              origin: 'Los Angeles, CA',
              destination: 'Phoenix, AZ',
              status: 'en_route',
              estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              cargoValue: 25000
            },
            {
              id: 'bol-002',
              bolNumber: 'BOL-2024-000124',
              origin: 'Seattle, WA',
              destination: 'Portland, OR',
              status: 'picked_up',
              estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
              cargoValue: 15000
            },
            {
              id: 'bol-003',
              bolNumber: 'BOL-2024-000125',
              origin: 'Denver, CO',
              destination: 'Salt Lake City, UT',
              status: 'assigned',
              estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              cargoValue: 32000
            }
          ],
          recentDeliveries: [
            {
              id: 'bol-delivery-001',
              bolNumber: 'BOL-2024-000120',
              deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              destination: 'Las Vegas, NV',
              value: 18500
            },
            {
              id: 'bol-delivery-002',
              bolNumber: 'BOL-2024-000119',
              deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              destination: 'San Francisco, CA',
              value: 28000
            }
          ]
        };

        setCarrierStats(mockStats);
      } catch (error) {
        console.error('Failed to fetch carrier stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCarrierStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'warning';
      case 'picked_up': return 'info';
      case 'en_route': return 'primary';
      case 'delivered': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <AssignedIcon />;
      case 'picked_up': return <CarrierIcon />;
      case 'en_route': return <EnRouteIcon />;
      case 'delivered': return <DeliveredIcon />;
      default: return <PendingIcon />;
    }
  };

  if (loading || !carrierStats) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Carrier Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CarrierIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
        <Box>
          <Typography variant="h4" component="h2" color="primary">
            Carrier Operations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your shipments and deliveries efficiently
          </Typography>
        </Box>
      </Box>

      {/* Key Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssignedIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Assigned
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {carrierStats.assignedBoLs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending pickup
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EnRouteIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  In Transit
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {carrierStats.inTransitBoLs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently shipping
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DeliveredIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Completed
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {carrierStats.completedThisMonth}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PaymentIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="secondary">
                  Revenue
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(carrierStats.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Cargo and Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Cargo
              </Typography>

              {carrierStats.activeCargo.length === 0 ? (
                <Alert severity="info">
                  No active cargo at the moment. Check for new assignments.
                </Alert>
              ) : (
                <List>
                  {carrierStats.activeCargo.map((cargo, index) => (
                    <React.Fragment key={cargo.id}>
                      <ListItem
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        onClick={() => navigate(`/bol/${cargo.id}`)}
                      >
                        <ListItemIcon>
                          {getStatusIcon(cargo.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {cargo.bolNumber}
                              </Typography>
                              <Chip
                                label={cargo.status.replace('_', ' ').toUpperCase()}
                                size="small"
                                color={getStatusColor(cargo.status) as any}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {cargo.origin} → {cargo.destination}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Est. Delivery: {new Date(cargo.estimatedDelivery).toLocaleDateString()}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Value: {formatCurrency(cargo.cargoValue)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < carrierStats.activeCargo.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Carrier Actions
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<AssignedIcon />}
                  onClick={() => navigate('/bol?status=assigned')}
                  fullWidth
                >
                  View Assigned BoLs ({carrierStats.assignedBoLs})
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<EnRouteIcon />}
                  onClick={() => navigate('/bol?status=en_route')}
                  fullWidth
                >
                  Track In-Transit ({carrierStats.inTransitBoLs})
                </Button>

                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<DeliveredIcon />}
                  onClick={() => navigate('/bol?status=delivered')}
                  fullWidth
                >
                  View Completed
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<PaymentIcon />}
                  onClick={() => navigate('/bol?status=unpaid')}
                  fullWidth
                >
                  Pending Payments ({carrierStats.pendingPayments})
                </Button>

                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<RouteIcon />}
                  onClick={() => navigate('/routes')}
                  fullWidth
                >
                  Route Planning
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Deliveries */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Deliveries
              </Typography>

              {carrierStats.recentDeliveries.length === 0 ? (
                <Alert severity="info">
                  No recent deliveries to display.
                </Alert>
              ) : (
                <List>
                  {carrierStats.recentDeliveries.map((delivery, index) => (
                    <React.Fragment key={delivery.id}>
                      <ListItem>
                        <ListItemIcon>
                          <DeliveredIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {delivery.bolNumber}
                              </Typography>
                              <Typography variant="subtitle1" color="success.main" fontWeight="bold">
                                {formatCurrency(delivery.value)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                Delivered to: {delivery.destination}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(delivery.deliveredAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < carrierStats.recentDeliveries.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}