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
  AccountBalance as BrokerIcon,
  Assignment as MatchingIcon,
  LocalShipping as CarrierIcon,
  TrendingUp as CommissionIcon,
  Notifications as NotificationsIcon,
  Assessment as AnalyticsIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface BrokerDashboardProps {
  user: any;
}

interface BrokerStats {
  activeMatches: number;
  monthlyCommission: number;
  totalManagedValue: number;
  carrierNetwork: number;
  pendingAssignments: {
    id: string;
    bolNumber: string;
    shipper: string;
    origin: string;
    destination: string;
    cargoValue: number;
    deadlineHours: number;
  }[];
  recentMatches: {
    id: string;
    bolNumber: string;
    shipper: string;
    carrier: string;
    matchedAt: string;
    commission: number;
  }[];
  performanceMetrics: {
    successfulMatches: number;
    avgMatchTime: number;
    carrierSatisfaction: number;
    onTimeDelivery: number;
  };
}

export default function BrokerDashboard({ user }: BrokerDashboardProps) {
  const navigate = useNavigate();
  const [brokerStats, setBrokerStats] = useState<BrokerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrokerStats = async () => {
      try {
        // Mock broker data - replace with actual API call
        const mockStats: BrokerStats = {
          activeMatches: 18,
          monthlyCommission: 34750,
          totalManagedValue: 1250000,
          carrierNetwork: 127,
          pendingAssignments: [
            {
              id: 'bol-pending-001',
              bolNumber: 'BOL-2024-000301',
              shipper: 'TechCorp Industries',
              origin: 'San Francisco, CA',
              destination: 'Austin, TX',
              cargoValue: 75000,
              deadlineHours: 6
            },
            {
              id: 'bol-pending-002',
              bolNumber: 'BOL-2024-000302',
              shipper: 'Manufacturing Plus',
              origin: 'Detroit, MI',
              destination: 'Chicago, IL',
              cargoValue: 42000,
              deadlineHours: 12
            },
            {
              id: 'bol-pending-003',
              bolNumber: 'BOL-2024-000303',
              shipper: 'Global Supplies',
              origin: 'Miami, FL',
              destination: 'Atlanta, GA',
              cargoValue: 28500,
              deadlineHours: 24
            }
          ],
          recentMatches: [
            {
              id: 'match-001',
              bolNumber: 'BOL-2024-000298',
              shipper: 'Electronics Direct',
              carrier: 'Premier Logistics',
              matchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              commission: 2850
            },
            {
              id: 'match-002',
              bolNumber: 'BOL-2024-000297',
              shipper: 'Auto Parts Co.',
              carrier: 'Reliable Transport',
              matchedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              commission: 1925
            }
          ],
          performanceMetrics: {
            successfulMatches: 156,
            avgMatchTime: 4.2,
            carrierSatisfaction: 94.5,
            onTimeDelivery: 97.8
          }
        };

        setBrokerStats(mockStats);
      } catch (error) {
        console.error('Failed to fetch broker stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrokerStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getUrgencyColor = (hours: number) => {
    if (hours <= 6) return 'error';
    if (hours <= 12) return 'warning';
    return 'info';
  };

  const formatHoursToDeadline = (hours: number) => {
    if (hours < 24) {
      return `${hours}h remaining`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h remaining`;
  };

  if (loading || !brokerStats) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Broker Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BrokerIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
        <Box>
          <Typography variant="h4" component="h2" color="primary">
            Freight Brokerage Hub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect shippers with carriers and optimize freight matching
          </Typography>
        </Box>
      </Box>

      {/* Key Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MatchingIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Active Matches
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {brokerStats.activeMatches}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CommissionIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Commission
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(brokerStats.monthlyCommission)}
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
                <CarrierIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="secondary">
                  Carrier Network
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {brokerStats.carrierNetwork}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active carriers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AnalyticsIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Managed Value
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(brokerStats.totalManagedValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total cargo value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Broker Performance Metrics
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="primary" fontWeight="bold">
                      {brokerStats.performanceMetrics.successfulMatches}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Successful Matches
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="secondary" fontWeight="bold">
                      {brokerStats.performanceMetrics.avgMatchTime}h
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Match Time
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="success.main" fontWeight="bold">
                      {brokerStats.performanceMetrics.carrierSatisfaction}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Carrier Satisfaction
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="info.main" fontWeight="bold">
                      {brokerStats.performanceMetrics.onTimeDelivery}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      On-Time Delivery
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Broker Actions
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AssignmentIcon />}
                  onClick={() => navigate('/broker/assignments')}
                  fullWidth
                >
                  View Pending Assignments ({brokerStats.pendingAssignments.length})
                </Button>

                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<CarrierIcon />}
                  onClick={() => navigate('/broker/carriers')}
                  fullWidth
                >
                  Manage Carrier Network
                </Button>

                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<CommissionIcon />}
                  onClick={() => navigate('/broker/earnings')}
                  fullWidth
                >
                  View Earnings Report
                </Button>

                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<AnalyticsIcon />}
                  onClick={() => navigate('/broker/analytics')}
                  fullWidth
                >
                  Performance Analytics
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Assignments */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Urgent Assignments Awaiting Match
              </Typography>

              {brokerStats.pendingAssignments.length === 0 ? (
                <Alert severity="success">
                  All assignments have been matched! Great work.
                </Alert>
              ) : (
                <List>
                  {brokerStats.pendingAssignments.map((assignment, index) => (
                    <React.Fragment key={assignment.id}>
                      <ListItem
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        onClick={() => navigate(`/broker/assign/${assignment.id}`)}
                      >
                        <ListItemIcon>
                          <NotificationsIcon color={getUrgencyColor(assignment.deadlineHours) as any} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {assignment.bolNumber}
                              </Typography>
                              <Chip
                                label={formatHoursToDeadline(assignment.deadlineHours)}
                                size="small"
                                color={getUrgencyColor(assignment.deadlineHours) as any}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Shipper:</strong> {assignment.shipper}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Route:</strong> {assignment.origin} → {assignment.destination}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Cargo Value:</strong> {formatCurrency(assignment.cargoValue)}
                              </Typography>
                            </Box>
                          }
                        />
                        <Button
                          variant="contained"
                          size="small"
                          color={getUrgencyColor(assignment.deadlineHours) as any}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/broker/assign/${assignment.id}`);
                          }}
                        >
                          Match Carrier
                        </Button>
                      </ListItem>
                      {index < brokerStats.pendingAssignments.length - 1 && <Divider />}
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
                Recent Successful Matches
              </Typography>

              {brokerStats.recentMatches.length === 0 ? (
                <Alert severity="info">
                  No recent matches to display.
                </Alert>
              ) : (
                <List dense>
                  {brokerStats.recentMatches.map((match, index) => (
                    <React.Fragment key={match.id}>
                      <ListItem
                        sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                        onClick={() => navigate(`/bol/${match.id}`)}
                      >
                        <ListItemIcon>
                          <MatchingIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2">
                              {match.bolNumber}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {match.shipper} → {match.carrier}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="success.main" fontWeight="bold">
                                {formatCurrency(match.commission)} commission
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(match.matchedAt).toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < brokerStats.recentMatches.length - 1 && <Divider />}
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