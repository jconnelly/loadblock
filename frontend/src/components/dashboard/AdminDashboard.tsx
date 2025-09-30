import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  SupervisorAccount as AdminIcon,
  Assessment as ReportsIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  People as UsersIcon,
  Warning as AlertIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface AdminDashboardProps {
  user: any;
}

interface SystemStats {
  totalUsers: number;
  totalBoLs: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  activeSessionsCount: number;
  recentAlerts: Array<{
    id: string;
    type: 'security' | 'system' | 'performance';
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  performanceMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    apiResponseTime: number;
    errorRate: number;
  };
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        // Mock admin data - replace with actual API call
        const mockStats: SystemStats = {
          totalUsers: 147,
          totalBoLs: 2345,
          systemHealth: 'healthy',
          activeSessionsCount: 23,
          recentAlerts: [
            {
              id: '1',
              type: 'security',
              message: 'Multiple failed login attempts detected from IP 192.168.1.100',
              timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
              severity: 'high'
            },
            {
              id: '2',
              type: 'performance',
              message: 'API response time exceeded 500ms threshold',
              timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
              severity: 'medium'
            },
            {
              id: '3',
              type: 'system',
              message: 'Database connection pool nearing capacity',
              timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
              severity: 'medium'
            }
          ],
          performanceMetrics: {
            cpuUsage: 65,
            memoryUsage: 72,
            apiResponseTime: 280,
            errorRate: 0.8
          }
        };

        setSystemStats(mockStats);
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminStats();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  if (loading || !systemStats) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Admin Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AdminIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
        <Box>
          <Typography variant="h4" component="h2" color="primary">
            System Administration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage the entire LoadBlock platform
          </Typography>
        </Box>
      </Box>

      {/* System Health Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <UsersIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary">
                  Total Users
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {systemStats.totalUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active accounts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SecurityIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="secondary">
                  Active Sessions
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {systemStats.activeSessionsCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current logins
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PerformanceIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  API Response
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {systemStats.performanceMetrics.apiResponseTime}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average response time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AlertIcon color={getHealthColor(systemStats.systemHealth) as any} sx={{ mr: 1 }} />
                <Typography variant="h6" color={`${getHealthColor(systemStats.systemHealth)}.main`}>
                  System Health
                </Typography>
              </Box>
              <Chip
                label={systemStats.systemHealth.toUpperCase()}
                color={getHealthColor(systemStats.systemHealth) as any}
                variant="filled"
              />
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
                System Performance
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">CPU Usage</Typography>
                  <Typography variant="body2">{systemStats.performanceMetrics.cpuUsage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemStats.performanceMetrics.cpuUsage}
                  color={systemStats.performanceMetrics.cpuUsage > 80 ? 'error' : 'primary'}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Memory Usage</Typography>
                  <Typography variant="body2">{systemStats.performanceMetrics.memoryUsage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemStats.performanceMetrics.memoryUsage}
                  color={systemStats.performanceMetrics.memoryUsage > 85 ? 'error' : 'primary'}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Error Rate</Typography>
                  <Typography variant="body2">{systemStats.performanceMetrics.errorRate}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemStats.performanceMetrics.errorRate}
                  color={systemStats.performanceMetrics.errorRate > 5 ? 'error' : 'success'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Admin Actions
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UsersIcon />}
                  onClick={() => navigate('/admin/users')}
                  fullWidth
                >
                  Manage Users
                </Button>

                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ReportsIcon />}
                  onClick={() => navigate('/admin/reports')}
                  fullWidth
                >
                  Generate Reports
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<SecurityIcon />}
                  onClick={() => navigate('/admin/security')}
                  fullWidth
                >
                  Security Center
                </Button>

                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<PerformanceIcon />}
                  onClick={() => navigate('/admin/performance')}
                  fullWidth
                >
                  Performance Metrics
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent System Alerts */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent System Alerts
              </Typography>

              {systemStats.recentAlerts.length === 0 ? (
                <Alert severity="success">
                  No recent alerts. System operating normally.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {systemStats.recentAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <Chip
                              label={alert.type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{alert.message}</TableCell>
                          <TableCell>
                            <Chip
                              label={alert.severity}
                              size="small"
                              color={getSeverityColor(alert.severity) as any}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(alert.timestamp).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}