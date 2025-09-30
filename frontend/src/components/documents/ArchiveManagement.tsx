import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  Archive as ArchiveIcon,
  Unarchive as RestoreIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Policy as PolicyIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { documentService } from '../../services/documentService';

interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  archiveAfterDays: number;
  deleteAfterDays: number;
  conditions: {
    status?: string[];
    documentType?: string[];
    minValue?: number;
    maxValue?: number;
  };
  lastRun?: string;
  nextRun?: string;
  documentsProcessed: number;
}

interface ArchiveStatistics {
  totalArchived: number;
  archivedThisMonth: number;
  totalSize: string;
  storageUsed: number;
  storageLimit: number;
  retentionPolicies: number;
  nextCleanup: string;
  documentsToArchive: number;
  documentsToDelete: number;
}

export default function ArchiveManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [archivedDocuments, setArchivedDocuments] = useState<any[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [statistics, setStatistics] = useState<ArchiveStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<Partial<RetentionPolicy>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load archived documents
      const archivedResult = await documentService.getArchivedDocuments(1, 50);
      setArchivedDocuments(archivedResult.documents);

      // Load mock retention policies and statistics
      setRetentionPolicies(getMockRetentionPolicies());
      setStatistics(getMockStatistics());
    } catch (error) {
      console.error('Failed to load archive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMockRetentionPolicies = (): RetentionPolicy[] => [
    {
      id: 'policy-1',
      name: 'Standard Document Retention',
      description: 'Archive completed documents after 90 days, delete after 7 years',
      enabled: true,
      archiveAfterDays: 90,
      deleteAfterDays: 2555, // 7 years
      conditions: {
        status: ['delivered', 'paid'],
      },
      lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      documentsProcessed: 156,
    },
    {
      id: 'policy-2',
      name: 'High Value Document Retention',
      description: 'Extended retention for high-value shipments',
      enabled: true,
      archiveAfterDays: 180,
      deleteAfterDays: 3650, // 10 years
      conditions: {
        status: ['delivered', 'paid'],
        minValue: 100000,
      },
      lastRun: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      documentsProcessed: 23,
    },
    {
      id: 'policy-3',
      name: 'Cancelled Document Cleanup',
      description: 'Archive cancelled documents after 30 days, delete after 1 year',
      enabled: true,
      archiveAfterDays: 30,
      deleteAfterDays: 365,
      conditions: {
        status: ['cancelled'],
      },
      lastRun: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      documentsProcessed: 45,
    },
  ];

  const getMockStatistics = (): ArchiveStatistics => ({
    totalArchived: 1456,
    archivedThisMonth: 234,
    totalSize: '12.4 GB',
    storageUsed: 68,
    storageLimit: 100,
    retentionPolicies: 3,
    nextCleanup: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    documentsToArchive: 89,
    documentsToDelete: 12,
  });

  const handleRestoreDocuments = async () => {
    if (selectedDocuments.size === 0) return;

    try {
      await documentService.restoreDocuments(Array.from(selectedDocuments));
      await loadData();
      setSelectedDocuments(new Set());
    } catch (error) {
      console.error('Failed to restore documents:', error);
    }
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleCreatePolicy = () => {
    setCurrentPolicy({
      name: '',
      description: '',
      enabled: true,
      archiveAfterDays: 90,
      deleteAfterDays: 2555,
      conditions: {},
      documentsProcessed: 0,
    });
    setPolicyDialogOpen(true);
  };

  const handleEditPolicy = (policy: RetentionPolicy) => {
    setCurrentPolicy(policy);
    setPolicyDialogOpen(true);
  };

  const handleSavePolicy = () => {
    // TODO: Implement policy save
    console.log('Saving policy:', currentPolicy);
    setPolicyDialogOpen(false);
    setCurrentPolicy({});
  };

  const handleTogglePolicy = (policyId: string) => {
    setRetentionPolicies(prev =>
      prev.map(policy =>
        policy.id === policyId
          ? { ...policy, enabled: !policy.enabled }
          : policy
      )
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      pending: 'warning',
      approved: 'info',
      assigned: 'secondary',
      accepted: 'primary',
      picked_up: 'primary',
      en_route: 'primary',
      delivered: 'success',
      unpaid: 'warning',
      paid: 'success',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const renderArchivedDocuments = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Archived Documents ({archivedDocuments.length})
        </Typography>
        {selectedDocuments.size > 0 && (
          <Button
            variant="contained"
            startIcon={<RestoreIcon />}
            onClick={handleRestoreDocuments}
          >
            Restore ({selectedDocuments.size})
          </Button>
        )}
      </Box>

      {loading ? (
        <LinearProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input type="checkbox" />
                </TableCell>
                <TableCell>BoL Number</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Shipper</TableCell>
                <TableCell>Archived Date</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {archivedDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.has(document.id)}
                      onChange={() => handleDocumentSelect(document.id)}
                    />
                  </TableCell>
                  <TableCell>{document.bolNumber}</TableCell>
                  <TableCell>
                    <Chip
                      label={document.status.replace('_', ' ').toUpperCase()}
                      size="small"
                      color={getStatusColor(document.status)}
                    />
                  </TableCell>
                  <TableCell>{document.shipper.companyName}</TableCell>
                  <TableCell>{formatDate(document.createdAt)}</TableCell>
                  <TableCell>{formatCurrency(document.totalValue)}</TableCell>
                  <TableCell>
                    <Tooltip title="Restore Document">
                      <IconButton
                        size="small"
                        onClick={() => handleDocumentSelect(document.id)}
                      >
                        <RestoreIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderRetentionPolicies = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Retention Policies ({retentionPolicies.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreatePolicy}
        >
          Create Policy
        </Button>
      </Box>

      <Grid container spacing={3}>
        {retentionPolicies.map((policy) => (
          <Grid item xs={12} md={6} key={policy.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {policy.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {policy.description}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={policy.enabled}
                        onChange={() => handleTogglePolicy(policy.id)}
                      />
                    }
                    label="Enabled"
                  />
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {policy.archiveAfterDays}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Days to Archive
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error">
                        {Math.floor(policy.deleteAfterDays / 365)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Years to Delete
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Run:</strong> {policy.lastRun ? formatDate(policy.lastRun) : 'Never'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Next Run:</strong> {policy.nextRun ? formatDate(policy.nextRun) : 'Not scheduled'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Documents Processed:</strong> {policy.documentsProcessed}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditPolicy(policy)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ScheduleIcon />}
                    onClick={() => {
                      // TODO: Run policy now
                    }}
                  >
                    Run Now
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderStatistics = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Archive Statistics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ArchiveIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="primary">
                {statistics?.totalArchived}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Archived
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TimelineIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="secondary">
                {statistics?.archivedThisMonth}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Archived This Month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {statistics?.totalSize}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Storage Used
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PolicyIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" color="warning.main">
                {statistics?.retentionPolicies}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Policies
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={statistics?.storageUsed || 0}
                    color={statistics && statistics.storageUsed > 85 ? 'error' : 'primary'}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body2">
                  {statistics?.storageUsed}% ({statistics?.totalSize})
                </Typography>
              </Box>

              <Alert
                severity={statistics && statistics.storageUsed > 85 ? 'warning' : 'info'}
                sx={{ mb: 2 }}
              >
                {statistics && statistics.storageUsed > 85
                  ? 'Storage usage is high. Consider reviewing retention policies.'
                  : 'Storage usage is within normal limits.'
                }
              </Alert>

              <Typography variant="h6" gutterBottom>
                Upcoming Actions
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${statistics?.documentsToArchive} documents scheduled for archiving`}
                    secondary={`Next cleanup: ${statistics?.nextCleanup ? formatDate(statistics.nextCleanup) : 'Not scheduled'}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <DeleteIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${statistics?.documentsToDelete} documents scheduled for deletion`}
                    secondary="Based on current retention policies"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Archive Management
      </Typography>

      <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Archived Documents" />
        <Tab label="Retention Policies" />
        <Tab label="Statistics" />
      </Tabs>

      {activeTab === 0 && renderArchivedDocuments()}
      {activeTab === 1 && renderRetentionPolicies()}
      {activeTab === 2 && renderStatistics()}

      {/* Policy Dialog */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentPolicy.id ? 'Edit Retention Policy' : 'Create Retention Policy'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Policy Name"
                value={currentPolicy.name || ''}
                onChange={(e) => setCurrentPolicy(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={currentPolicy.description || ''}
                onChange={(e) => setCurrentPolicy(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Archive after (days): {currentPolicy.archiveAfterDays || 90}
              </Typography>
              <Slider
                value={currentPolicy.archiveAfterDays || 90}
                onChange={(event, value) => setCurrentPolicy(prev => ({ ...prev, archiveAfterDays: value as number }))}
                min={1}
                max={365}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Delete after (days): {currentPolicy.deleteAfterDays || 2555}
              </Typography>
              <Slider
                value={currentPolicy.deleteAfterDays || 2555}
                onChange={(event, value) => setCurrentPolicy(prev => ({ ...prev, deleteAfterDays: value as number }))}
                min={365}
                max={3650}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePolicy} variant="contained">
            Save Policy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}