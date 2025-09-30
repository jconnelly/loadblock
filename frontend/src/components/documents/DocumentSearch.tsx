import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  DatePicker,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Pagination,
  CircularProgress,
  Alert,
  Fab,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker as MuiDatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  documentService,
  DocumentSearchFilters,
  DocumentSearchResult,
  DocumentExportOptions,
} from '../../services/documentService';
import { debounce } from 'lodash';

interface DocumentSearchProps {
  onDocumentSelect?: (documentId: string) => void;
  allowBulkOperations?: boolean;
  defaultFilters?: Partial<DocumentSearchFilters>;
}

export default function DocumentSearch({
  onDocumentSelect,
  allowBulkOperations = true,
  defaultFilters = {},
}: DocumentSearchProps) {
  const [searchResults, setSearchResults] = useState<DocumentSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Search Filters State
  const [filters, setFilters] = useState<DocumentSearchFilters>({
    query: '',
    statuses: [],
    dateRange: undefined,
    shippers: [],
    carriers: [],
    consignees: [],
    valueRange: undefined,
    tags: [],
    archived: false,
    ...defaultFilters,
  });

  // Available Options
  const [availableStatuses] = useState([
    'pending', 'approved', 'assigned', 'accepted', 'picked_up',
    'en_route', 'delivered', 'unpaid', 'paid', 'cancelled'
  ]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableTags();
    performSearch();
  }, []);

  useEffect(() => {
    if (Object.keys(filters).some(key => filters[key as keyof DocumentSearchFilters])) {
      debouncedSearch();
    }
  }, [filters, currentPage, pageSize]);

  const loadAvailableTags = async () => {
    try {
      const tags = await documentService.getDocumentTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const performSearch = async () => {
    try {
      setLoading(true);
      const results = await documentService.searchDocuments(filters, currentPage, pageSize);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce(() => {
      setCurrentPage(1);
      performSearch();
    }, 500),
    [filters, pageSize]
  );

  const handleFilterChange = (filterKey: keyof DocumentSearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      statuses: [],
      dateRange: undefined,
      shippers: [],
      carriers: [],
      consignees: [],
      valueRange: undefined,
      tags: [],
      archived: false,
    });
    setCurrentPage(1);
  };

  const handleDocumentSelect = (documentId: string) => {
    if (allowBulkOperations) {
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(documentId)) {
          newSet.delete(documentId);
        } else {
          newSet.add(documentId);
        }
        return newSet;
      });
    }

    if (onDocumentSelect) {
      onDocumentSelect(documentId);
    }
  };

  const handleSelectAll = () => {
    if (!searchResults) return;

    const allIds = searchResults.documents.map(doc => doc.id);
    setSelectedDocuments(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedDocuments(new Set());
  };

  const handleBulkExport = async () => {
    if (selectedDocuments.size === 0) return;

    try {
      const exportOptions: DocumentExportOptions = {
        format: 'pdf',
        includeVersionHistory: true,
      };

      const operation = await documentService.exportDocuments(
        Array.from(selectedDocuments),
        exportOptions
      );

      // TODO: Handle export operation monitoring
      console.log('Export started:', operation.id);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedDocuments.size === 0) return;

    try {
      const operation = await documentService.archiveDocuments(
        Array.from(selectedDocuments),
        'Bulk archive operation'
      );

      // Refresh search results
      performSearch();
      setSelectedDocuments(new Set());

      console.log('Archive operation started:', operation.id);
    } catch (error) {
      console.error('Archive failed:', error);
    }
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Search Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search by BoL number, shipper, carrier, or consignee..."
                  value={filters.query}
                  onChange={(e) => handleFilterChange('query', e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'inherit'}
                >
                  Advanced Filters
                </Button>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
              </Grid>
            </Grid>

            {/* Advanced Filters */}
            <Accordion expanded={showFilters} sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Advanced Search Filters</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Status Filter */}
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        multiple
                        value={filters.statuses || []}
                        onChange={(e) => handleFilterChange('statuses', e.target.value)}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as string[]).map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {availableStatuses.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status.replace('_', ' ').toUpperCase()}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Date Range */}
                  <Grid item xs={12} md={4}>
                    <MuiDatePicker
                      label="Start Date"
                      value={filters.dateRange?.startDate ? new Date(filters.dateRange.startDate) : null}
                      onChange={(date) => {
                        if (date) {
                          handleFilterChange('dateRange', {
                            ...filters.dateRange,
                            startDate: date.toISOString(),
                          });
                        }
                      }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <MuiDatePicker
                      label="End Date"
                      value={filters.dateRange?.endDate ? new Date(filters.dateRange.endDate) : null}
                      onChange={(date) => {
                        if (date) {
                          handleFilterChange('dateRange', {
                            ...filters.dateRange,
                            endDate: date.toISOString(),
                          });
                        }
                      }}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>

                  {/* Tags */}
                  <Grid item xs={12} md={6}>
                    <Autocomplete
                      multiple
                      options={availableTags}
                      value={filters.tags || []}
                      onChange={(event, newValue) => handleFilterChange('tags', newValue)}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Tags" placeholder="Select tags" />
                      )}
                    />
                  </Grid>

                  {/* Value Range */}
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>
                      Cargo Value Range: ${filters.valueRange?.min || 0} - ${filters.valueRange?.max || 1000000}
                    </Typography>
                    <Slider
                      value={[filters.valueRange?.min || 0, filters.valueRange?.max || 1000000]}
                      onChange={(event, newValue) => {
                        const [min, max] = newValue as number[];
                        handleFilterChange('valueRange', { min, max });
                      }}
                      valueLabelDisplay="auto"
                      min={0}
                      max={1000000}
                      step={1000}
                      valueLabelFormat={(value) => `$${value.toLocaleString()}`}
                    />
                  </Grid>

                  {/* Archive Filter */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filters.archived || false}
                          onChange={(e) => handleFilterChange('archived', e.target.checked)}
                        />
                      }
                      label="Include archived documents"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card>
          <CardContent>
            {/* Results Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Search Results
                {searchResults && (
                  <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    ({searchResults.totalCount} documents found)
                  </Typography>
                )}
              </Typography>

              {allowBulkOperations && selectedDocuments.size > 0 && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ExportIcon />}
                    onClick={handleBulkExport}
                  >
                    Export ({selectedDocuments.size})
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<ArchiveIcon />}
                    onClick={handleBulkArchive}
                  >
                    Archive ({selectedDocuments.size})
                  </Button>
                </Box>
              )}
            </Box>

            {/* Bulk Selection Controls */}
            {allowBulkOperations && searchResults && searchResults.documents.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Button size="small" onClick={handleSelectAll}>
                  Select All on Page
                </Button>
              </Box>
            )}

            {/* Results List */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : searchResults ? (
              <>
                {searchResults.documents.length > 0 ? (
                  <List>
                    {searchResults.documents.map((document) => (
                      <ListItem
                        key={document.id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          backgroundColor: selectedDocuments.has(document.id) ? 'action.selected' : 'transparent',
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'action.hover' },
                        }}
                        onClick={() => handleDocumentSelect(document.id)}
                      >
                        {allowBulkOperations && (
                          <Checkbox
                            checked={selectedDocuments.has(document.id)}
                            onChange={() => handleDocumentSelect(document.id)}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ mr: 1 }}
                          />
                        )}
                        <ListItemIcon>
                          <DocumentIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {document.bolNumber}
                              </Typography>
                              <Chip
                                label={document.status.replace('_', ' ').toUpperCase()}
                                size="small"
                                color={getStatusColor(document.status)}
                              />
                              {document.archived && (
                                <Chip label="ARCHIVED" size="small" color="default" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Shipper:</strong> {document.shipper.companyName} |
                                <strong> Carrier:</strong> {document.carrier.companyName} |
                                <strong> Consignee:</strong> {document.consignee.companyName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Created:</strong> {new Date(document.createdAt).toLocaleDateString()} |
                                <strong> Value:</strong> {formatCurrency(document.totalValue)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    No documents found matching your search criteria.
                  </Alert>
                )}

                {/* Pagination */}
                {searchResults.pagination.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={searchResults.pagination.totalPages}
                      page={currentPage}
                      onChange={(event, page) => setCurrentPage(page)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="info">
                Use the search box above to find documents.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Floating Action Button for Selected Items */}
        {allowBulkOperations && selectedDocuments.size > 0 && (
          <Tooltip title={`${selectedDocuments.size} documents selected`}>
            <Fab
              color="primary"
              sx={{ position: 'fixed', bottom: 16, right: 16 }}
              onClick={() => {
                // Show bulk operations menu
              }}
            >
              <Badge badgeContent={selectedDocuments.size} color="secondary">
                <ExportIcon />
              </Badge>
            </Fab>
          </Tooltip>
        )}
      </Box>
    </LocalizationProvider>
  );
}