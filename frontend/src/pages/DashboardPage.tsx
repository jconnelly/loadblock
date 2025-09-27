import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  CardActions,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AppLayout from '../components/layout/AppLayout';
import { bolService } from '../services/bolService';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    totalValue: number;
    totalWeight: number;
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await bolService.getBolStats();
        setStats(statsData);
      } catch (err) {
        console.warn('Failed to fetch stats:', err);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatWeight = (weight: number) => {
    return `${weight.toLocaleString()} lbs`;
  };

  const canCreateBoL = user?.roles.some(role => ['admin', 'shipper', 'broker'].includes(role));

  return (
    <AppLayout>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" color="primary">
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.firstName}! Here's your overview.
        </Typography>
      </Box>

      {/* Statistics Overview */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="primary">
                    Total BoLs
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.total}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => navigate('/bol')}>
                  View All BoLs
                </Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="secondary">
                    Total Value
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(stats.totalValue)}
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
                    Total Weight
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatWeight(stats.totalWeight)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocalShippingIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="success.main">
                    En Route
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.byStatus.en_route || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Welcome Back!
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user?.email}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Your Roles:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {user?.roles.map((role) => (
                    <Chip
                      key={role}
                      label={role.charAt(0).toUpperCase() + role.slice(1)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Manage your Bills of Lading and shipments efficiently with LoadBlock.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DescriptionIcon />}
                  onClick={() => navigate('/bol')}
                >
                  View All BoLs
                </Button>

                {canCreateBoL && (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/bol/create')}
                  >
                    Create New BoL
                  </Button>
                )}

                {user?.roles.includes('carrier') && (
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ShippingIcon />}
                    onClick={() => navigate('/bol?status=assigned')}
                  >
                    Assigned BoLs
                  </Button>
                )}

                {user?.roles.includes('admin') && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => navigate('/admin')}
                  >
                    Admin Panel
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Typography variant="body2" color="success.main">
                ✅ Frontend: React application running
              </Typography>
              <Typography variant="body2" color="success.main">
                ✅ Backend: Authentication API ready
              </Typography>
              <Typography variant="body2" color="warning.main">
                ⏳ Blockchain: Coming in Phase 2
              </Typography>
              <Typography variant="body2" color="warning.main">
                ⏳ IPFS: Coming in Phase 2
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AppLayout>
  );
}