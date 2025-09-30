import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Speed as PerformanceIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Cached as CacheIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { documentService } from '../../services/documentService';

interface PerformanceMetrics {
  averageQueryTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  indexingProgress: number;
  documentsIndexed: number;
  totalDocuments: number;
  searchLatency: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

interface OptimizationSettings {
  enableCaching: boolean;
  cacheSize: number;
  enableLazyLoading: boolean;
  pageSize: number;
  enableVirtualization: boolean;
  indexingBatchSize: number;
  searchTimeout: number;
  enableCompression: boolean;
  enablePrefetching: boolean;
  maxConcurrentRequests: number;
}

interface PerformanceRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: 'query' | 'cache' | 'indexing' | 'ui' | 'network';
  implemented: boolean;
  estimatedImprovement: string;
}

export default function PerformanceOptimization() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [settings, setSettings] = useState<OptimizationSettings>({
    enableCaching: true,
    cacheSize: 100,
    enableLazyLoading: true,
    pageSize: 20,
    enableVirtualization: true,
    indexingBatchSize: 1000,
    searchTimeout: 5000,
    enableCompression: true,
    enablePrefetching: false,
    maxConcurrentRequests: 5,
  });
  const [recommendations, setRecommendations] = useState<PerformanceRecommendation[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadPerformanceData, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadPerformanceData = async () => {
    try {
      // In a real implementation, this would fetch from the backend
      setMetrics(getMockMetrics());
      setRecommendations(getMockRecommendations());
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMockMetrics = (): PerformanceMetrics => ({
    averageQueryTime: 285,
    cacheHitRate: 78.5,
    memoryUsage: 64.2,
    indexingProgress: 92.3,
    documentsIndexed: 11478,
    totalDocuments: 12430,
    searchLatency: 156,
    throughput: 24.7,
    errorRate: 0.12,
    uptime: 99.97,
  });

  const getMockRecommendations = (): PerformanceRecommendation[] => [
    {
      id: 'rec-1',
      title: 'Enable Database Query Optimization',
      description: 'Implement database indexes for frequently searched fields to reduce query time by up to 60%',
      impact: 'high',
      effort: 'medium',
      category: 'query',
      implemented: false,
      estimatedImprovement: '60% faster queries',
    },
    {
      id: 'rec-2',
      title: 'Increase Cache Size',
      description: 'Increase cache size from 100MB to 250MB to improve cache hit rate',
      impact: 'medium',
      effort: 'low',
      category: 'cache',
      implemented: false,
      estimatedImprovement: '15% better cache performance',
    },
    {
      id: 'rec-3',
      title: 'Enable Document Compression',
      description: 'Compress stored documents to reduce storage usage and improve transfer speeds',
      impact: 'medium',
      effort: 'medium',
      category: 'network',
      implemented: true,
      estimatedImprovement: '30% storage reduction',
    },
    {
      id: 'rec-4',
      title: 'Implement Virtual Scrolling',
      description: 'Use virtual scrolling for large document lists to improve UI performance',
      impact: 'high',
      effort: 'high',
      category: 'ui',
      implemented: true,
      estimatedImprovement: '80% faster list rendering',
    },
    {
      id: 'rec-5',
      title: 'Background Indexing Optimization',
      description: 'Optimize indexing batch size and schedule to reduce system load',
      impact: 'medium',
      effort: 'low',
      category: 'indexing',
      implemented: false,
      estimatedImprovement: '25% less CPU usage',
    },
  ];

  const handleSettingChange = (setting: keyof OptimizationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleApplySettings = () => {
    // TODO: Apply settings to backend
    console.log('Applying settings:', settings);
    setSettingsDialogOpen(false);
  };

  const handleImplementRecommendation = (recommendationId: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === recommendationId
          ? { ...rec, implemented: true }
          : rec
      )
    );
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'query': return <PerformanceIcon />;
      case 'cache': return <CacheIcon />;
      case 'indexing': return <StorageIcon />;
      case 'ui': return <TrendingUpIcon />;
      case 'network': return <MemoryIcon />;
      default: return <InfoIcon />;
    }
  };

  const performanceScore = useMemo(() => {
    if (!metrics) return 0;

    // Calculate a composite performance score (0-100)
    const queryScore = Math.max(0, 100 - (metrics.averageQueryTime / 10));
    const cacheScore = metrics.cacheHitRate;
    const memoryScore = Math.max(0, 100 - metrics.memoryUsage);
    const errorScore = Math.max(0, 100 - (metrics.errorRate * 10));
    const uptimeScore = metrics.uptime;

    return Math.round((queryScore + cacheScore + memoryScore + errorScore + uptimeScore) / 5);
  }, [metrics]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Performance Optimization</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Performance Optimization
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadPerformanceData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialogOpen(true)}
          >
            Configure
          </Button>
        </Box>
      </Box>

      {/* Performance Score Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" color={`${getScoreColor(performanceScore)}.main`} fontWeight="bold">
                {performanceScore}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Performance Score
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={performanceScore}
                color={getScoreColor(performanceScore) as any}
                sx={{ height: 12, borderRadius: 6, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Based on query performance, cache efficiency, memory usage, and system uptime
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PerformanceIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary">
                {metrics?.averageQueryTime}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Query Time
              </Typography>
              <Typography variant="caption" color={metrics && metrics.averageQueryTime < 500 ? 'success.main' : 'error.main'}>
                Target: &lt; 500ms
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CacheIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="secondary">
                {metrics?.cacheHitRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cache Hit Rate
              </Typography>
              <Typography variant="caption" color={metrics && metrics.cacheHitRate > 70 ? 'success.main' : 'error.main'}>
                Target: &gt; 70%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <MemoryIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {metrics?.memoryUsage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Memory Usage
              </Typography>
              <Typography variant="caption" color={metrics && metrics.memoryUsage < 80 ? 'success.main' : 'error.main'}>
                Target: &lt; 80%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {metrics?.indexingProgress}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Indexing Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics?.documentsIndexed} / {metrics?.totalDocuments}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Performance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Search Latency
                  </Typography>
                  <Typography variant="h6">
                    {metrics?.searchLatency}ms
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Throughput
                  </Typography>
                  <Typography variant="h6">
                    {metrics?.throughput} req/s
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Error Rate
                  </Typography>
                  <Typography variant="h6" color={metrics && metrics.errorRate < 1 ? 'success.main' : 'error.main'}>
                    {metrics?.errorRate}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Uptime
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {metrics?.uptime}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Clear Cache"
                    secondary="Reset cache to free memory"
                  />
                  <Button size="small" onClick={() => console.log('Clear cache')}>
                    Clear
                  </Button>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Reindex Documents"
                    secondary="Rebuild search indexes"
                  />
                  <Button size="small" onClick={() => console.log('Reindex')}>
                    Reindex
                  </Button>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Optimize Database"
                    secondary="Run database optimization"
                  />
                  <Button size="small" onClick={() => console.log('Optimize')}>
                    Optimize
                  </Button>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Recommendations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance Recommendations
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Recommendation</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Impact</TableCell>
                  <TableCell>Effort</TableCell>
                  <TableCell>Improvement</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recommendations.map((recommendation) => (
                  <TableRow key={recommendation.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {recommendation.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {recommendation.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getCategoryIcon(recommendation.category)}
                        <Typography variant="body2">
                          {recommendation.category}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={recommendation.impact.toUpperCase()}
                        size="small"
                        color={getImpactColor(recommendation.impact) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={recommendation.effort.toUpperCase()}
                        size="small"
                        color={getEffortColor(recommendation.effort) as any}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {recommendation.estimatedImprovement}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {recommendation.implemented ? (
                        <Chip
                          label="IMPLEMENTED"
                          size="small"
                          color="success"
                          icon={<SuccessIcon />}
                        />
                      ) : (
                        <Chip
                          label="PENDING"
                          size="small"
                          color="warning"
                          icon={<WarningIcon />}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {!recommendation.implemented && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleImplementRecommendation(recommendation.id)}
                        >
                          Implement
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TuneIcon />
            <Typography variant="h6">Performance Settings</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableCaching}
                    onChange={(e) => handleSettingChange('enableCaching', e.target.checked)}
                  />
                }
                label="Enable Caching"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableLazyLoading}
                    onChange={(e) => handleSettingChange('enableLazyLoading', e.target.checked)}
                  />
                }
                label="Enable Lazy Loading"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableVirtualization}
                    onChange={(e) => handleSettingChange('enableVirtualization', e.target.checked)}
                  />
                }
                label="Enable Virtualization"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableCompression}
                    onChange={(e) => handleSettingChange('enableCompression', e.target.checked)}
                  />
                }
                label="Enable Compression"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>
                Cache Size: {settings.cacheSize} MB
              </Typography>
              <Slider
                value={settings.cacheSize}
                onChange={(event, value) => handleSettingChange('cacheSize', value)}
                min={50}
                max={500}
                step={25}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>
                Page Size: {settings.pageSize} documents
              </Typography>
              <Slider
                value={settings.pageSize}
                onChange={(event, value) => handleSettingChange('pageSize', value)}
                min={10}
                max={100}
                step={10}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>
                Max Concurrent Requests: {settings.maxConcurrentRequests}
              </Typography>
              <Slider
                value={settings.maxConcurrentRequests}
                onChange={(event, value) => handleSettingChange('maxConcurrentRequests', value)}
                min={1}
                max={20}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Indexing Batch Size"
                type="number"
                value={settings.indexingBatchSize}
                onChange={(e) => handleSettingChange('indexingBatchSize', parseInt(e.target.value))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search Timeout (ms)"
                type="number"
                value={settings.searchTimeout}
                onChange={(e) => handleSettingChange('searchTimeout', parseInt(e.target.value))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleApplySettings} variant="contained">
            Apply Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}