import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  GetApp as ExportIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Update as UpdateIcon,
  Cancel as CancelIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import {
  documentService,
  BulkOperation,
  DocumentExportOptions,
} from '../../services/documentService';

interface BulkOperationsProps {
  selectedDocuments: string[];
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type OperationType = 'export' | 'archive' | 'delete' | 'update_status';

export default function BulkOperations({
  selectedDocuments,
  open,
  onClose,
  onComplete,
}: BulkOperationsProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [operationType, setOperationType] = useState<OperationType>('export');
  const [operation, setOperation] = useState<BulkOperation | null>(null);
  const [exportOptions, setExportOptions] = useState<DocumentExportOptions>({
    format: 'pdf',
    includeVersionHistory: false,
    fields: [],
  });
  const [archiveReason, setArchiveReason] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [polling, setPolling] = useState(false);

  const steps = [
    'Select Operation',
    'Configure Options',
    'Process Documents',
    'Complete'
  ];

  const statusOptions = [
    'pending', 'approved', 'assigned', 'accepted',
    'picked_up', 'en_route', 'delivered', 'unpaid', 'paid', 'cancelled'
  ];

  const exportFormats = [
    { value: 'pdf', label: 'PDF (Individual Documents)' },
    { value: 'csv', label: 'CSV (Spreadsheet)' },
    { value: 'excel', label: 'Excel (XLSX)' },
    { value: 'json', label: 'JSON (Raw Data)' },
  ];

  const exportFields = [
    'bolNumber', 'status', 'shipper', 'carrier', 'consignee',
    'cargoItems', 'totalValue', 'totalWeight', 'createdAt', 'updatedAt'
  ];

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setOperation(null);
      setPolling(false);
    }
  }, [open]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling && operation) {
      interval = setInterval(async () => {
        try {
          const updatedOperation = await documentService.getBulkOperationStatus(operation.id);
          setOperation(updatedOperation);

          if (updatedOperation.status === 'completed' || updatedOperation.status === 'failed') {
            setPolling(false);
            if (updatedOperation.status === 'completed') {
              setActiveStep(3);
            }
          }
        } catch (error) {
          console.error('Failed to check operation status:', error);
          setPolling(false);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling, operation]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleStartOperation = async () => {
    try {
      let newOperation: BulkOperation;

      switch (operationType) {
        case 'export':
          newOperation = await documentService.exportDocuments(selectedDocuments, exportOptions);
          break;

        case 'archive':
          newOperation = await documentService.archiveDocuments(selectedDocuments, archiveReason);
          break;

        case 'update_status':
          newOperation = await documentService.startBulkOperation(
            'update_status',
            selectedDocuments,
            { newStatus }
          );
          break;

        case 'delete':
          newOperation = await documentService.startBulkOperation(
            'delete',
            selectedDocuments,
            { confirmation: true }
          );
          break;

        default:
          throw new Error('Invalid operation type');
      }

      setOperation(newOperation);
      setPolling(true);
      handleNext();
    } catch (error) {
      console.error('Failed to start operation:', error);
    }
  };

  const handleCancelOperation = async () => {
    if (operation) {
      try {
        await documentService.cancelBulkOperation(operation.id);
        setPolling(false);
        onClose();
      } catch (error) {
        console.error('Failed to cancel operation:', error);
      }
    }
  };

  const handleDownloadResult = async () => {
    if (operation && operation.type === 'export' && operation.status === 'completed') {
      try {
        const blob = await documentService.downloadExport(operation.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bulk-export-${operation.id}.${exportOptions.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download export:', error);
      }
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  const getOperationIcon = (type: OperationType) => {
    switch (type) {
      case 'export': return <ExportIcon />;
      case 'archive': return <ArchiveIcon />;
      case 'delete': return <DeleteIcon />;
      case 'update_status': return <UpdateIcon />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <SuccessIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'processing': return <RefreshIcon color="primary" />;
      default: return <WarningIcon color="warning" />;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              Select the operation you want to perform on {selectedDocuments.length} documents:
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Operation Type</InputLabel>
              <Select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value as OperationType)}
                label="Operation Type"
              >
                <MenuItem value="export">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ExportIcon />
                    Export Documents
                  </Box>
                </MenuItem>
                <MenuItem value="archive">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArchiveIcon />
                    Archive Documents
                  </Box>
                </MenuItem>
                <MenuItem value="update_status">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UpdateIcon />
                    Update Status
                  </Box>
                </MenuItem>
                <MenuItem value="delete">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeleteIcon />
                    Delete Documents
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box>
            {operationType === 'export' && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Export Format</InputLabel>
                    <Select
                      value={exportOptions.format}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        format: e.target.value as any
                      }))}
                      label="Export Format"
                    >
                      {exportFormats.map(format => (
                        <MenuItem key={format.value} value={format.value}>
                          {format.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={exportOptions.includeVersionHistory}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          includeVersionHistory: e.target.checked
                        }))}
                      />
                    }
                    label="Include version history"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Fields to include:
                  </Typography>
                  <FormGroup row>
                    {exportFields.map(field => (
                      <FormControlLabel
                        key={field}
                        control={
                          <Checkbox
                            checked={exportOptions.fields?.includes(field)}
                            onChange={(e) => {
                              const fields = exportOptions.fields || [];
                              if (e.target.checked) {
                                setExportOptions(prev => ({
                                  ...prev,
                                  fields: [...fields, field]
                                }));
                              } else {
                                setExportOptions(prev => ({
                                  ...prev,
                                  fields: fields.filter(f => f !== field)
                                }));
                              }
                            }}
                          />
                        }
                        label={field}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date (Optional)"
                      value={exportOptions.dateRange?.startDate ? new Date(exportOptions.dateRange.startDate) : null}
                      onChange={(date) => {
                        if (date) {
                          setExportOptions(prev => ({
                            ...prev,
                            dateRange: {
                              ...prev.dateRange,
                              startDate: date.toISOString(),
                            }
                          }));
                        }
                      }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="End Date (Optional)"
                      value={exportOptions.dateRange?.endDate ? new Date(exportOptions.dateRange.endDate) : null}
                      onChange={(date) => {
                        if (date) {
                          setExportOptions(prev => ({
                            ...prev,
                            dateRange: {
                              ...prev.dateRange,
                              endDate: date.toISOString(),
                            }
                          }));
                        }
                      }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
            )}

            {operationType === 'archive' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Archive Reason (Optional)"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Enter reason for archiving these documents..."
              />
            )}

            {operationType === 'update_status' && (
              <FormControl fullWidth>
                <InputLabel>New Status</InputLabel>
                <Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  label="New Status"
                >
                  {statusOptions.map(status => (
                    <MenuItem key={status} value={status}>
                      {status.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {operationType === 'delete' && (
              <Alert severity="warning">
                <Typography variant="body1" gutterBottom>
                  <strong>Warning: This action cannot be undone!</strong>
                </Typography>
                <Typography variant="body2">
                  You are about to permanently delete {selectedDocuments.length} documents.
                  This will remove all associated data, version history, and blockchain records.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            {operation ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  {getStatusIcon(operation.status)}
                  <Typography variant="h6">
                    {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
                  </Typography>
                </Box>

                <Typography variant="body1" gutterBottom>
                  Processing {operation.targetDocuments.length} documents...
                </Typography>

                <LinearProgress
                  variant="determinate"
                  value={operation.progress}
                  sx={{ mb: 2 }}
                />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Progress: {operation.progress}%
                </Typography>

                {operation.status === 'processing' && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={handleCancelOperation}
                  >
                    Cancel Operation
                  </Button>
                )}

                {operation.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      {operation.error}
                    </Typography>
                  </Alert>
                )}
              </Box>
            ) : (
              <Typography>Starting operation...</Typography>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            {operation && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <SuccessIcon color="success" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" color="success.main">
                    Operation Completed Successfully!
                  </Typography>
                </Box>

                <Typography variant="body1" gutterBottom>
                  {operation.targetDocuments.length} documents were processed successfully.
                </Typography>

                {operation.type === 'export' && (
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadResult}
                    sx={{ mt: 2 }}
                  >
                    Download Export File
                  </Button>
                )}

                {operation.result && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Operation Summary:
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                      {JSON.stringify(operation.result, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getOperationIcon(operationType)}
          <Typography variant="h6">
            Bulk Operations ({selectedDocuments.length} documents)
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ minHeight: 400 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {activeStep === 3 ? 'Close' : 'Cancel'}
        </Button>

        {activeStep > 0 && activeStep < 2 && (
          <Button onClick={handleBack}>
            Back
          </Button>
        )}

        {activeStep === 0 && (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        )}

        {activeStep === 1 && (
          <Button onClick={handleStartOperation} variant="contained">
            Start {operationType.charAt(0).toUpperCase() + operationType.slice(1)}
          </Button>
        )}

        {activeStep === 3 && (
          <Button onClick={handleComplete} variant="contained">
            Complete
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}