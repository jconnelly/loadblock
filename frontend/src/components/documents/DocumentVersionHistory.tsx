import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  History as HistoryIcon,
  Create as CreateIcon,
  Update as UpdateIcon,
  ChangeCircle as ChangeIcon,
  PictureAsPdf as PdfIcon,
  Verified as SignedIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Compare as CompareIcon,
  Visibility as ViewIcon,
  Link as BlockchainIcon,
} from '@mui/icons-material';
import { documentService, DocumentVersion } from '../../services/documentService';

interface DocumentVersionHistoryProps {
  bolId: string;
  open: boolean;
  onClose: () => void;
}

export default function DocumentVersionHistory({
  bolId,
  open,
  onClose,
}: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | false>(false);

  useEffect(() => {
    if (open && bolId) {
      fetchVersionHistory();
    }
  }, [open, bolId]);

  const fetchVersionHistory = async () => {
    try {
      setLoading(true);
      const versionData = await documentService.getDocumentVersions(bolId);
      setVersions(versionData);
    } catch (error) {
      console.error('Failed to fetch version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareVersions = async () => {
    if (selectedVersions.length !== 2) return;

    try {
      const [fromVersion, toVersion] = selectedVersions.sort((a, b) => a - b);
      const comparison = await documentService.compareVersions(bolId, fromVersion, toVersion);
      setComparisonData(comparison);
      setShowComparison(true);
    } catch (error) {
      console.error('Failed to compare versions:', error);
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <CreateIcon color="success" />;
      case 'updated':
        return <UpdateIcon color="primary" />;
      case 'status_changed':
        return <ChangeIcon color="info" />;
      case 'pdf_regenerated':
        return <PdfIcon color="secondary" />;
      case 'signed':
        return <SignedIcon color="warning" />;
      default:
        return <HistoryIcon />;
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return 'success';
      case 'updated':
        return 'primary';
      case 'status_changed':
        return 'info';
      case 'pdf_regenerated':
        return 'secondary';
      case 'signed':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleVersionSelect = (version: number) => {
    setSelectedVersions(prev => {
      if (prev.includes(version)) {
        return prev.filter(v => v !== version);
      } else if (prev.length < 2) {
        return [...prev, version];
      } else {
        return [prev[1], version];
      }
    });
  };

  const handleAccordionChange = (versionId: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedVersion(isExpanded ? versionId : false);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HistoryIcon />
            <Typography variant="h6">
              Document Version History - {bolId}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Box sx={{ py: 4 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Loading version history...
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Version Selection Controls */}
              <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Select two versions to compare:
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<CompareIcon />}
                  onClick={handleCompareVersions}
                  disabled={selectedVersions.length !== 2}
                  size="small"
                >
                  Compare Selected ({selectedVersions.length}/2)
                </Button>
              </Box>

              {/* Version List */}
              <List>
                {versions.map((version, index) => (
                  <Card key={version.id} sx={{ mb: 2, border: selectedVersions.includes(version.version) ? 2 : 1, borderColor: selectedVersions.includes(version.version) ? 'primary.main' : 'divider' }}>
                    <Accordion
                      expanded={expandedVersion === version.id}
                      onChange={handleAccordionChange(version.id)}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <ListItem
                          sx={{ py: 1 }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant={selectedVersions.includes(version.version) ? 'contained' : 'outlined'}
                                onClick={() => handleVersionSelect(version.version)}
                              >
                                {selectedVersions.includes(version.version) ? 'Selected' : 'Select'}
                              </Button>

                              <Tooltip title="Download Version">
                                <IconButton size="small">
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>

                              {version.blockchainTxId && (
                                <Tooltip title="View on Blockchain">
                                  <IconButton size="small">
                                    <BlockchainIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          }
                        >
                          <ListItemIcon>
                            {getChangeTypeIcon(version.changeType)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  Version {version.version}
                                </Typography>
                                <Chip
                                  label={version.changeType.replace('_', ' ').toUpperCase()}
                                  size="small"
                                  color={getChangeTypeColor(version.changeType) as any}
                                />
                                {index === 0 && (
                                  <Chip label="CURRENT" size="small" color="success" variant="outlined" />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(version.createdAt).toLocaleString()} by {version.createdBy}
                                </Typography>
                                {version.fileSize && (
                                  <Typography variant="caption" color="text.secondary">
                                    File size: {formatFileSize(version.fileSize)}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      </AccordionSummary>

                      <AccordionDetails>
                        <Box sx={{ pl: 2 }}>
                          {/* Version Details */}
                          <Typography variant="h6" gutterBottom>
                            Changes Made
                          </Typography>

                          {version.changes.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Field</TableCell>
                                    <TableCell>Previous Value</TableCell>
                                    <TableCell>New Value</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {version.changes.map((change, changeIndex) => (
                                    <TableRow key={changeIndex}>
                                      <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                          {change.field}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" color="error.main">
                                          {change.oldValue || '(empty)'}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" color="success.main">
                                          {change.newValue}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Alert severity="info" sx={{ mb: 2 }}>
                              No detailed changes recorded for this version.
                            </Alert>
                          )}

                          {/* Technical Details */}
                          <Typography variant="h6" gutterBottom>
                            Technical Details
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {version.fileHash && (
                              <Typography variant="body2">
                                <strong>File Hash:</strong> {version.fileHash.substring(0, 20)}...
                              </Typography>
                            )}
                            {version.blockchainTxId && (
                              <Typography variant="body2">
                                <strong>Blockchain TX:</strong> {version.blockchainTxId.substring(0, 20)}...
                              </Typography>
                            )}
                            {version.ipfsHash && (
                              <Typography variant="body2">
                                <strong>IPFS Hash:</strong> {version.ipfsHash.substring(0, 20)}...
                              </Typography>
                            )}
                          </Box>

                          {version.notes && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="h6" gutterBottom>
                                Notes
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {version.notes}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Card>
                ))}
              </List>

              {versions.length === 0 && (
                <Alert severity="info">
                  No version history available for this document.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              // TODO: Implement bulk download of all versions
            }}
          >
            Download All Versions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version Comparison Dialog */}
      <Dialog open={showComparison} onClose={() => setShowComparison(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CompareIcon />
            <Typography variant="h6">
              Version Comparison
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {comparisonData ? (
            <Box>
              <Typography variant="body1" gutterBottom>
                Comparing Version {selectedVersions[0]} with Version {selectedVersions[1]}
              </Typography>
              {/* TODO: Implement detailed comparison view */}
              <Alert severity="info">
                Detailed comparison functionality will be implemented in the next iteration.
              </Alert>
            </Box>
          ) : (
            <Typography>Loading comparison...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowComparison(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}