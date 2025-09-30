// BoL Rejection Modal with Mandatory Note
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Divider
} from '@mui/material';
import {
  Warning as WarningIcon,
  Cancel as RejectIcon
} from '@mui/icons-material';

interface BoLRejectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, category: string) => Promise<void>;
  bolNumber: string;
  bolData?: {
    shipper?: { companyName: string };
    carrier?: { companyName: string };
    totalValue?: number;
    cargoItems?: Array<{ description: string; quantity: number; weight?: number }>;
  };
  isLoading?: boolean;
}

const REJECTION_CATEGORIES = [
  {
    value: 'missing_information',
    label: 'Missing Information',
    description: 'Required fields are empty or incomplete'
  },
  {
    value: 'incorrect_details',
    label: 'Incorrect Details',
    description: 'Information provided is inaccurate'
  },
  {
    value: 'cargo_issues',
    label: 'Cargo Issues',
    description: 'Problems with cargo description, weight, or classification'
  },
  {
    value: 'regulatory_compliance',
    label: 'Regulatory Compliance',
    description: 'Missing regulatory information or compliance issues'
  },
  {
    value: 'pricing_terms',
    label: 'Pricing & Terms',
    description: 'Issues with pricing, payment terms, or contract details'
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other reasons not listed above'
  }
];

const COMMON_REJECTION_REASONS = {
  missing_information: [
    'Missing unit weight for cargo items',
    'Missing pickup/delivery addresses',
    'Missing contact information',
    'Missing special handling instructions',
    'Missing hazmat documentation'
  ],
  incorrect_details: [
    'Incorrect shipper information',
    'Incorrect consignee information',
    'Wrong pickup/delivery dates',
    'Incorrect cargo dimensions',
    'Wrong freight class'
  ],
  cargo_issues: [
    'Cargo description too vague',
    'Weight exceeds vehicle capacity',
    'Hazmat classification required',
    'Special equipment needed',
    'Temperature requirements not specified'
  ],
  regulatory_compliance: [
    'Missing DOT compliance information',
    'Insurance coverage insufficient',
    'Missing permits for oversized load',
    'Hazmat shipping papers incomplete',
    'Missing customs documentation'
  ],
  pricing_terms: [
    'Rate not agreed upon',
    'Payment terms unclear',
    'Additional charges not specified',
    'Fuel surcharge missing',
    'Detention fees not defined'
  ],
  other: [
    'Route not feasible',
    'Scheduling conflict',
    'Equipment not available',
    'Service area restriction'
  ]
};

const BoLRejectionModal: React.FC<BoLRejectionModalProps> = ({
  open,
  onClose,
  onConfirm,
  bolNumber,
  bolData,
  isLoading = false
}) => {
  const [category, setCategory] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errors, setErrors] = useState<{ category?: string; reason?: string }>({});

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newCategory = event.target.value;
    setCategory(newCategory);
    setReason(''); // Clear reason when category changes
    setErrors({});
  };

  const handleReasonSelect = (selectedReason: string) => {
    setReason(selectedReason);
    setErrors({});
  };

  const handleCustomReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setReason(event.target.value);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { category?: string; reason?: string } = {};

    if (!category) {
      newErrors.category = 'Please select a rejection category';
    }

    if (!reason.trim()) {
      newErrors.reason = 'Please provide a detailed reason for rejection';
    } else if (reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters long';
    } else if (reason.trim().length > 500) {
      newErrors.reason = 'Reason must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    try {
      const fullReason = `[${REJECTION_CATEGORIES.find(c => c.value === category)?.label}] ${reason.trim()}`;
      await onConfirm(fullReason, category);
      handleReset();
    } catch (error) {
      console.error('Failed to reject BoL:', error);
    }
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCategory('');
    setReason('');
    setErrors({});
  };

  const selectedCategory = REJECTION_CATEGORIES.find(c => c.value === category);
  const commonReasons = category ? COMMON_REJECTION_REASONS[category as keyof typeof COMMON_REJECTION_REASONS] || [] : [];

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RejectIcon color="error" />
          <Box>
            <Typography variant="h6">
              Reject Bill of Lading
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              BoL #{bolNumber}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              <WarningIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Rejection Notice Required
            </Typography>
            <Typography variant="body2">
              You must provide a detailed reason for rejecting this BoL.
              This information will be sent to the shipper to help them correct any issues.
            </Typography>
          </Box>
        </Alert>

        {/* BoL Summary */}
        {bolData && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              BoL Summary
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Typography variant="body2">
                <strong>Shipper:</strong> {bolData.shipper?.companyName || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Carrier:</strong> {bolData.carrier?.companyName || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Total Value:</strong> ${bolData.totalValue?.toLocaleString() || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Items:</strong> {bolData.cargoItems?.length || 0} cargo items
              </Typography>
            </Box>
          </Box>
        )}

        {/* Rejection Category */}
        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              Rejection Category *
            </Typography>
          </FormLabel>
          <RadioGroup
            value={category}
            onChange={handleCategoryChange}
          >
            {REJECTION_CATEGORIES.map((cat) => (
              <FormControlLabel
                key={cat.value}
                value={cat.value}
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">{cat.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cat.description}
                    </Typography>
                  </Box>
                }
                sx={{
                  mb: 1,
                  p: 1,
                  border: 1,
                  borderColor: category === cat.value ? 'primary.main' : 'grey.300',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'grey.50' }
                }}
              />
            ))}
          </RadioGroup>
          {errors.category && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {errors.category}
            </Typography>
          )}
        </FormControl>

        {/* Common Reasons (if category selected) */}
        {selectedCategory && commonReasons.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Common reasons for {selectedCategory.label.toLowerCase()}:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {commonReasons.map((commonReason) => (
                <Chip
                  key={commonReason}
                  label={commonReason}
                  variant={reason === commonReason ? 'filled' : 'outlined'}
                  color={reason === commonReason ? 'primary' : 'default'}
                  clickable
                  onClick={() => handleReasonSelect(commonReason)}
                  size="small"
                />
              ))}
            </Box>
            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">
                OR
              </Typography>
            </Divider>
          </Box>
        )}

        {/* Custom Reason */}
        <TextField
          label="Detailed Reason for Rejection *"
          multiline
          rows={4}
          fullWidth
          value={reason}
          onChange={handleCustomReasonChange}
          placeholder={selectedCategory
            ? `Provide specific details about the ${selectedCategory.label.toLowerCase()} issue...`
            : "Describe the specific issues that need to be addressed..."
          }
          error={!!errors.reason}
          helperText={errors.reason || `${reason.length}/500 characters`}
          InputProps={{
            inputProps: { maxLength: 500 }
          }}
          sx={{ mb: 2 }}
        />

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> This rejection notice will be sent to the shipper with instructions
            to correct the issues and resubmit the BoL. Please be specific to help them resolve
            the problems quickly.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={handleCancel}
          disabled={isLoading}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={isLoading || !category || !reason.trim()}
          startIcon={<RejectIcon />}
        >
          {isLoading ? 'Rejecting...' : 'Reject BoL'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BoLRejectionModal;