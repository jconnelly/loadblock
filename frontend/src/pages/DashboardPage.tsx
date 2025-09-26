import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import AppLayout from '../components/layout/AppLayout';

export default function DashboardPage() {
  const { user } = useAuth();

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
                Welcome to LoadBlock! Your role-specific features will be available based on your permissions.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                {user?.roles.includes('shipper') && (
                  <Button variant="contained" color="primary">
                    Create Bill of Lading
                  </Button>
                )}

                {user?.roles.includes('carrier') && (
                  <Button variant="contained" color="secondary">
                    View Assigned BoLs
                  </Button>
                )}

                {user?.roles.includes('broker') && (
                  <Button variant="outlined" color="primary">
                    Coordinate Shipments
                  </Button>
                )}

                {user?.roles.includes('consignee') && (
                  <Button variant="outlined" color="secondary">
                    Track Deliveries
                  </Button>
                )}

                {user?.roles.includes('admin') && (
                  <Button variant="contained" color="error">
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