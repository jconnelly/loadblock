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
  Badge,
} from '@mui/material';
import {
  Inventory as ConsigneeIcon,
  LocalShipping as IncomingIcon,
  Schedule as ScheduledIcon,
  CheckCircle as ReceivedIcon,
  Notifications as NotificationIcon,
  LocationOn as TrackingIcon,
  Receipt as PODIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ConsigneeDashboardProps {
  user: any;
}

interface ConsigneeStats {
  expectedDeliveries: number;
  inTransitToday: number;
  receivedThisMonth: number;
  totalValue: number;
  incomingShipments: {
    id: string;
    bolNumber: string;
    shipper: string;
    carrier: string;
    status: string;
    expectedDelivery: string;
    currentLocation: string;
    cargoValue: number;
    requiresSignature: boolean;
  }[];
  recentDeliveries: {
    id: string;
    bolNumber: string;
    shipper: string;
    deliveredAt: string;
    signedBy: string;
    cargoValue: number;
  }[];
  notifications: {
    id: string;
    type: 'delivery_update' | 'signature_required' | 'delay_alert';
    message: string;
    bolNumber: string;
    timestamp: string;
    read: boolean;
  }[];
}

export default function ConsigneeDashboard({ user }: ConsigneeDashboardProps) {
  const navigate = useNavigate();
  const [consigneeStats, setConsigneeStats] = useState<ConsigneeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConsigneeStats = async () => {
      try {
        // Mock consignee data - replace with actual API call
        const mockStats: ConsigneeStats = {
          expectedDeliveries: 7,
          inTransitToday: 3,
          receivedThisMonth: 34,
          totalValue: 425000,
          incomingShipments: [
            {
              id: 'bol-incoming-001',
              bolNumber: 'BOL-2024-000401',
              shipper: 'Industrial Supplies Inc.',
              carrier: 'Express Logistics',
              status: 'en_route',
              expectedDelivery: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
              currentLocation: 'Highway 95, 15 miles out',
              cargoValue: 28500,
              requiresSignature: true
            },
            {
              id: 'bol-incoming-002',
              bolNumber: 'BOL-2024-000402',
              shipper: 'TechParts Direct',
              carrier: 'Reliable Transport',
              status: 'en_route',
              expectedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
              currentLocation: 'Distribution Center, 50 miles out',
              cargoValue: 67500,
              requiresSignature: true
            },
            {
              id: 'bol-incoming-003',
              bolNumber: 'BOL-2024-000403',
              shipper: 'Manufacturing Solutions',
              carrier: 'Swift Delivery',
              status: 'picked_up',
              expectedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
              currentLocation: 'Phoenix, AZ Distribution Center',
              cargoValue: 45000,
              requiresSignature: false
            }
          ],
          recentDeliveries: [
            {
              id: 'bol-delivered-001',
              bolNumber: 'BOL-2024-000398',
              shipper: 'AutoParts Plus',
              deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
              signedBy: user?.firstName + ' ' + user?.lastName,
              cargoValue: 18500
            },
            {
              id: 'bol-delivered-002',
              bolNumber: 'BOL-2024-000397',
              shipper: 'Electronics Wholesale',
              deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
              signedBy: 'Reception Desk',
              cargoValue: 32000
            }
          ],
          notifications: [
            {
              id: 'notif-001',
              type: 'delivery_update',
              message: 'Your shipment BOL-2024-000401 is now 15 minutes away',
              bolNumber: 'BOL-2024-000401',
              timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
              read: false
            },
            {
              id: 'notif-002',
              type: 'signature_required',
              message: 'Signature required for incoming delivery BOL-2024-000402',
              bolNumber: 'BOL-2024-000402',
              timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
              read: false
            },
            {
              id: 'notif-003',
              type: 'delay_alert',
              message: 'Delivery of BOL-2024-000404 delayed by 2 hours due to weather',
              bolNumber: 'BOL-2024-000404',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              read: true
            }
          ]
        };

        setConsigneeStats(mockStats);
      } catch (error) {
        console.error('Failed to fetch consignee stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsigneeStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'picked_up': return 'info';
      case 'en_route': return 'primary';
      case 'delivered': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'picked_up': return <ScheduledIcon />;
      case 'en_route': return <IncomingIcon />;
      case 'delivered': return <ReceivedIcon />;
      default: return <ScheduledIcon />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'delivery_update': return <TrackingIcon color="primary" />;
      case 'signature_required': return <PODIcon color="warning" />;
      case 'delay_alert': return <NotificationIcon color="error" />;
      default: return <NotificationIcon />;
    }
  };

  const formatTimeUntilDelivery = (timestamp: string) => {
    const now = new Date();
    const deliveryTime = new Date(timestamp);
    const diffMs = deliveryTime.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours <= 0) return 'Arriving now';
    if (diffHours < 24) return `${diffHours}h away`;
    const days = Math.floor(diffHours / 24);
    return `${days}d ${diffHours % 24}h away`;
  };

  if (loading || !consigneeStats) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Consignee Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  const unreadNotifications = consigneeStats.notifications.filter(n => !n.read).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ConsigneeIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
        <Box>
          <Typography variant="h4" component="h2" color="primary">
            Delivery Management Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track incoming shipments and manage deliveries
          </Typography>
        </Box>
      </Box>

      {/* Key Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ScheduledIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="warning.main">
                  Expected
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {consigneeStats.expectedDeliveries}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending deliveries
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <IncomingIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  In Transit Today
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {consigneeStats.inTransitToday}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Arriving today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ReceivedIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Received
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {consigneeStats.receivedThisMonth}
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
                <ConsigneeIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="secondary">
                  Total Value
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(consigneeStats.totalValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cargo received
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Notifications and Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Recent Notifications
                </Typography>
                {unreadNotifications > 0 && (
                  <Badge badgeContent={unreadNotifications} color="error">
                    <NotificationIcon />
                  </Badge>
                )}
              </Box>

              {consigneeStats.notifications.length === 0 ? (
                <Alert severity="info">
                  No recent notifications.
                </Alert>
              ) : (
                <List dense>
                  {consigneeStats.notifications.slice(0, 3).map((notification) => (
                    <ListItem key={notification.id} sx={{
                      pl: 0,
                      backgroundColor: !notification.read ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                      mb: 1
                    }}>
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={notification.read ? 'normal' : 'bold'}>
                            {notification.message}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {new Date(notification.timestamp).toLocaleString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              <Button
                size="small"
                onClick={() => navigate('/notifications')}
                sx={{ mt: 1 }}
              >
                View All Notifications
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consignee Actions
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<IncomingIcon />}
                    onClick={() => navigate('/bol?status=en_route')}
                    fullWidth
                  >
                    Track Incoming ({consigneeStats.inTransitToday})
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<ScheduledIcon />}
                    onClick={() => navigate('/bol?status=assigned,picked_up')}
                    fullWidth
                  >
                    View Expected
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<ReceivedIcon />}
                    onClick={() => navigate('/bol?status=delivered')}
                    fullWidth
                  >
                    Delivery History
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<PODIcon />}
                    onClick={() => navigate('/pod/manage')}
                    fullWidth
                  >
                    Manage PODs
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={<TrackingIcon />}
                    onClick={() => navigate('/tracking')}
                    fullWidth
                  >
                    Real-time Tracking
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    variant="outlined"
                    startIcon={<NotificationIcon />}
                    onClick={() => navigate('/notifications')}
                    fullWidth
                    {...(unreadNotifications > 0 && {
                      color: 'error',
                      endIcon: <Badge badgeContent={unreadNotifications} color="error" />
                    })}
                  >
                    Notifications
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Incoming Shipments */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Incoming Shipments
              </Typography>

              {consigneeStats.incomingShipments.length === 0 ? (
                <Alert severity="info">
                  No incoming shipments at the moment.
                </Alert>
              ) : (
                <List>
                  {consigneeStats.incomingShipments.map((shipment, index) => (
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
                              {shipment.requiresSignature && (
                                <Chip
                                  label="Signature Required"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                <strong>From:</strong> {shipment.shipper}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Carrier:</strong> {shipment.carrier}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Location:</strong> {shipment.currentLocation}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Value:</strong> {formatCurrency(shipment.cargoValue)}
                              </Typography>
                              <Typography variant="body2" color="primary" fontWeight="bold">
                                <strong>ETA:</strong> {formatTimeUntilDelivery(shipment.expectedDelivery)}
                              </Typography>
                            </Box>
                          }
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tracking/${shipment.id}`);
                          }}
                        >
                          Track
                        </Button>
                      </ListItem>
                      {index < consigneeStats.incomingShipments.length - 1 && <Divider />}
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
                Recent Deliveries
              </Typography>

              {consigneeStats.recentDeliveries.length === 0 ? (
                <Alert severity="info">
                  No recent deliveries to display.
                </Alert>
              ) : (
                <List dense>
                  {consigneeStats.recentDeliveries.map((delivery, index) => (
                    <React.Fragment key={delivery.id}>
                      <ListItem
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        onClick={() => navigate(`/bol/${delivery.id}`)}
                      >
                        <ListItemIcon>
                          <ReceivedIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2">
                              {delivery.bolNumber}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                From: {delivery.shipper}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                Signed by: {delivery.signedBy}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="success.main" fontWeight="bold">
                                {formatCurrency(delivery.cargoValue)}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(delivery.deliveredAt).toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < consigneeStats.recentDeliveries.length - 1 && <Divider />}
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