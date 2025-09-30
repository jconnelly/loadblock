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
  CardActions,
} from '@mui/material';
import {
  Business as ShipperIcon,
  Add as CreateIcon,
  Pending as PendingIcon,
  CheckCircle as ApprovedIcon,
  LocalShipping as ShippingIcon,
  Timeline as TrackingIcon,
  Assessment as ReportsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ShipperDashboardProps {
  user: any;
}

interface ShipperStats {
  totalBoLsCreated: number;
  pendingApproval: number;
  inProgress: number;
  delivered: number;
  monthlyShippingCost: number;
  activeShipments: {
    id: string;
    bolNumber: string;
    consignee: string;
    carrier: string;
    status: string;
    createdAt: string;
    estimatedDelivery?: string;
    totalValue: number;
  }[];
  recentlyCreated: {
    id: string;
    bolNumber: string;
    consignee: string;
    status: string;
    createdAt: string;
    totalValue: number;
  }[];
}

export default function ShipperDashboard({ user }: ShipperDashboardProps) {
  const navigate = useNavigate();
  const [shipperStats, setShipperStats] = useState<ShipperStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipperStats = async () => {
      try {
        // Mock shipper data - replace with actual API call
        const mockStats: ShipperStats = {
          totalBoLsCreated: 45,
          pendingApproval: 3,
          inProgress: 12,
          delivered: 28,
          monthlyShippingCost: 89750,
          activeShipments: [
            {
              id: 'bol-001',
              bolNumber: 'BOL-2024-000201',
              consignee: 'XYZ Logistics LLC',
              carrier: 'Fast Transport Inc.',
              status: 'en_route',
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              totalValue: 32500
            },
            {
              id: 'bol-002',
              bolNumber: 'BOL-2024-000202',
              consignee: 'Metro Distribution',
              carrier: 'Reliable Carriers',
              status: 'picked_up',
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
              totalValue: 18750
            },
            {
              id: 'bol-003',
              bolNumber: 'BOL-2024-000203',
              consignee: 'Warehouse Solutions',
              carrier: 'Swift Delivery Co.',
              status: 'assigned',
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              totalValue: 24000
            }
          ],
          recentlyCreated: [
            {
              id: 'bol-recent-001',
              bolNumber: 'BOL-2024-000204',
              consignee: 'Industrial Supply Co.',
              status: 'pending',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              totalValue: 15000
            },
            {
              id: 'bol-recent-002',
              bolNumber: 'BOL-2024-000205',
              consignee: 'Tech Components Ltd.',
              status: 'approved',
              createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              totalValue: 42000
            }
          ]
        };

        setShipperStats(mockStats);
      } catch (error) {
        console.error('Failed to fetch shipper stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipperStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'assigned': return 'secondary';
      case 'picked_up': return 'primary';
      case 'en_route': return 'primary';
      case 'delivered': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <PendingIcon />;
      case 'approved': return <ApprovedIcon />;
      case 'assigned':
      case 'picked_up':
      case 'en_route': return <ShippingIcon />;
      case 'delivered': return <ApprovedIcon />;
      default: return <PendingIcon />;
    }
  };

  if (loading || !shipperStats) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Shipper Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ShipperIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
        <Box>
          <Typography variant="h4" component="h2" color="primary">
            Shipper Control Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create, track, and manage your shipments with ease
          </Typography>
        </Box>
      </Box>

      {/* Key Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CreateIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Total Created
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {shipperStats.totalBoLsCreated}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bills of Lading
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Pending
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {shipperStats.pendingApproval}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Awaiting approval
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShippingIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  In Progress
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {shipperStats.inProgress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Being transported
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ApprovedIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Delivered
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {shipperStats.delivered}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Successfully completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Cost and Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="secondary">
                  Monthly Shipping Cost
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="secondary">
                {formatCurrency(shipperStats.monthlyShippingCost)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current month expenses
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/reports/shipping-costs')}>
                View Details
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shipper Actions
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CreateIcon />}
                    onClick={() => navigate('/bol/create')}
                    fullWidth
                  >
                    Create New BoL
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<PendingIcon />}
                    onClick={() => navigate('/bol?status=pending')}
                    fullWidth
                  >
                    Review Pending ({shipperStats.pendingApproval})
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={<TrackingIcon />}
                    onClick={() => navigate('/bol?status=en_route')}
                    fullWidth
                  >
                    Track Shipments
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<ReportsIcon />}
                    onClick={() => navigate('/reports')}
                    fullWidth
                  >
                    View Reports
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Shipments */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Shipments
              </Typography>

              {shipperStats.activeShipments.length === 0 ? (
                <Alert severity="info">
                  No active shipments at the moment. Create a new BoL to get started.
                </Alert>
              ) : (
                <List>
                  {shipperStats.activeShipments.map((shipment, index) => (
                    <React.Fragment key={shipment.id}>
                      <ListItem
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        onClick={() => navigate(`/bol/${shipment.id}`)}
                      >
                        <ListItemIcon>
                          {getStatusIcon(shipment.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {shipment.bolNumber}
                              </Typography>
                              <Chip
                                label={shipment.status.replace('_', ' ').toUpperCase()}
                                size="small"
                                color={getStatusColor(shipment.status) as any}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                <strong>To:</strong> {shipment.consignee}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Carrier:</strong> {shipment.carrier}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Value:</strong> {formatCurrency(shipment.totalValue)}
                              </Typography>
                              {shipment.estimatedDelivery && (
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Est. Delivery:</strong> {new Date(shipment.estimatedDelivery).toLocaleDateString()}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < shipperStats.activeShipments.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recently Created
              </Typography>

              {shipperStats.recentlyCreated.length === 0 ? (
                <Alert severity="info">
                  No recent BoLs created.
                </Alert>
              ) : (
                <List dense>
                  {shipperStats.recentlyCreated.map((bol, index) => (
                    <React.Fragment key={bol.id}>
                      <ListItem
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        onClick={() => navigate(`/bol/${bol.id}`)}
                      >
                        <ListItemIcon>
                          {getStatusIcon(bol.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2">
                              {bol.bolNumber}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {bol.consignee}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {formatCurrency(bol.totalValue)}
                              </Typography>
                              <br />
                              <Chip
                                label={bol.status}
                                size="small"
                                color={getStatusColor(bol.status) as any}
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < shipperStats.recentlyCreated.length - 1 && <Divider />}
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