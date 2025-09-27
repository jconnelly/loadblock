import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Grid,
  TextField,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { CreateBoLRequest, Contact, CargoItem } from '../types';
import { bolService } from '../services/bolService';
import { useAuth } from '../hooks/useAuth';
import {
  validateCreateBoLRequest,
  validateContact,
  validateCargoItem,
  getFieldError,
  BOL_BUSINESS_RULES,
  ValidationError
} from '../utils/bolValidation';

const steps = [
  'Basic Information',
  'Shipper & Consignee',
  'Cargo Details',
  'Review & Submit',
];

const CARGO_TYPES = BOL_BUSINESS_RULES.VALID_CARGO_TYPES;
const PACKAGE_TYPES = BOL_BUSINESS_RULES.VALID_PACKAGE_TYPES;
const HAZMAT_CLASSES = BOL_BUSINESS_RULES.HAZMAT_CLASSES;

export default function CreateBoLPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Form data state
  const [formData, setFormData] = useState<Partial<CreateBoLRequest>>(() => {
    const today = new Date().toISOString().split('T')[0];
    console.log('DEBUG: Initializing form with pickup date:', today);
    return {
      pickupDate: today,
      deliveryDate: '',
      freightCharges: {
        baseRate: 0,
        fuelSurcharge: 0,
        accessorials: 0,
        total: 0,
      },
      cargoItems: [],
      specialInstructions: '',
      hazmatInfo: {
        isHazmat: false,
        hazmatClass: '',
        unNumber: '',
        properShippingName: '',
      },
    };
  });

  const [shipper, setShipper] = useState<Partial<Contact>>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
  });

  const [consignee, setConsignee] = useState<Partial<Contact>>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
  });

  const [cargoItems, setCargoItems] = useState<Partial<CargoItem>[]>([
    {
      description: '',
      quantity: 1,
      packageType: 'Box',
      weight: 0,
      dimensions: { length: 0, width: 0, height: 0 },
      value: 0,
      cargoType: 'General Freight',
    },
  ]);

  const validateCurrentStep = (): boolean => {
    console.log('DEBUG: Validating step:', activeStep);
    console.log('DEBUG: Current form data:', formData);

    const errors: ValidationError[] = [];

    switch (activeStep) {
      case 0: // Basic Information
        console.log('DEBUG: Validating Basic Information');
        console.log('Pickup date:', formData.pickupDate);
        console.log('Delivery date:', formData.deliveryDate);

        if (!formData.pickupDate) {
          console.log('ERROR: Pickup date missing');
          errors.push({ field: 'pickupDate', message: 'Pickup date is required' });
        } else {
          const pickupDate = new Date(formData.pickupDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          console.log('Pickup date parsed:', pickupDate);
          console.log('Today:', today);
          console.log('Is pickup date in past?', pickupDate < today);

          if (pickupDate < today) {
            console.log('ERROR: Pickup date is in the past');
            errors.push({ field: 'pickupDate', message: 'Pickup date cannot be in the past' });
          }
        }

        if (formData.deliveryDate) {
          const deliveryDate = new Date(formData.deliveryDate);
          const pickupDate = new Date(formData.pickupDate || '');
          console.log('Delivery date parsed:', deliveryDate);
          console.log('Pickup date for comparison:', pickupDate);
          console.log('Is delivery before/equal pickup?', deliveryDate <= pickupDate);

          if (deliveryDate <= pickupDate) {
            console.log('ERROR: Delivery date is not after pickup date');
            errors.push({ field: 'deliveryDate', message: 'Delivery date must be after pickup date' });
          }
        }
        break;

      case 1: // Shipper & Consignee
        errors.push(...validateContact(shipper, 'Shipper'));
        errors.push(...validateContact(consignee, 'Consignee'));
        break;

      case 2: // Cargo Details
        if (cargoItems.length === 0) {
          errors.push({ field: 'cargoItems', message: 'At least one cargo item is required' });
        } else {
          cargoItems.forEach((item, index) => {
            errors.push(...validateCargoItem(item, index));
          });
        }
        break;
    }

    console.log('DEBUG: Validation errors found:', errors);
    console.log('DEBUG: Validation passed:', errors.length === 0);

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    console.log('DEBUG: Next button clicked, current step:', activeStep);
    console.log('DEBUG: Steps length:', steps.length);

    if (activeStep < steps.length - 1) {
      console.log('DEBUG: Validating current step before proceeding...');
      const isValid = validateCurrentStep();
      console.log('DEBUG: Step validation result:', isValid);

      if (isValid) {
        console.log('SUCCESS: Moving to next step');
        setActiveStep((prevStep) => prevStep + 1);
      } else {
        console.log('ERROR: Step validation failed, staying on current step');
      }
    } else {
      console.log('DEBUG: Final step reached, submitting...');
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Calculate totals
      const totalWeight = cargoItems.reduce((sum, item) => sum + (item.weight || 0), 0);
      const totalValue = cargoItems.reduce((sum, item) => sum + (item.value || 0), 0);
      const totalQuantity = cargoItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Calculate freight charges
      const baseRate = formData.freightCharges?.baseRate || 0;
      const fuelSurcharge = formData.freightCharges?.fuelSurcharge || 0;
      const accessorials = formData.freightCharges?.accessorials || 0;
      const total = baseRate + fuelSurcharge + accessorials;

      const bolData: CreateBoLRequest = {
        pickupDate: formData.pickupDate!,
        deliveryDate: formData.deliveryDate || '',
        shipper: shipper as Contact,
        consignee: consignee as Contact,
        cargoItems: cargoItems as CargoItem[],
        totalWeight,
        totalValue,
        totalQuantity,
        freightCharges: {
          baseRate,
          fuelSurcharge,
          accessorials,
          total,
        },
        specialInstructions: formData.specialInstructions || '',
        hazmatInfo: formData.hazmatInfo!,
      };

      // Comprehensive validation before submission
      const validation = validateCreateBoLRequest(bolData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setError('Please fix the validation errors before submitting.');
        return;
      }

      const newBoL = await bolService.createBoL(bolData);
      navigate(`/bol/${newBoL.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create BoL');
    } finally {
      setLoading(false);
    }
  };

  const addCargoItem = () => {
    setCargoItems([
      ...cargoItems,
      {
        description: '',
        quantity: 1,
        packageType: 'Box',
        weight: 0,
        dimensions: { length: 0, width: 0, height: 0 },
        value: 0,
        cargoType: 'General Freight',
      },
    ]);
  };

  const removeCargoItem = (index: number) => {
    if (cargoItems.length > 1) {
      setCargoItems(cargoItems.filter((_, i) => i !== index));
    }
  };

  const updateCargoItem = (index: number, field: string, value: any) => {
    const updatedItems = [...cargoItems];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedItems[index] = {
        ...updatedItems[index],
        [parent]: {
          ...updatedItems[index][parent as keyof CargoItem],
          [child]: value,
        },
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }
    setCargoItems(updatedItems);
  };

  const canCreateBoL = user?.roles.some(role => ['admin', 'shipper', 'broker'].includes(role));

  if (!canCreateBoL) {
    return (
      <AppLayout>
        <Alert severity="error">
          You do not have permission to create Bills of Lading.
        </Alert>
      </AppLayout>
    );
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pickup Date"
                type="date"
                value={formData.pickupDate}
                onChange={(e) => {
                  console.log('DEBUG: Pickup date changed to:', e.target.value);
                  setFormData({ ...formData, pickupDate: e.target.value });
                }}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Delivery Date"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => {
                  console.log('DEBUG: Delivery date changed to:', e.target.value);
                  setFormData({ ...formData, deliveryDate: e.target.value });
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Special Instructions"
                multiline
                rows={4}
                value={formData.specialInstructions}
                onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                placeholder="Any special handling instructions, delivery requirements, or additional notes..."
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Shipper Information
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={shipper.companyName}
                onChange={(e) => setShipper({ ...shipper, companyName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={shipper.contactPerson}
                onChange={(e) => setShipper({ ...shipper, contactPerson: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={shipper.email}
                onChange={(e) => setShipper({ ...shipper, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={shipper.phone}
                onChange={(e) => setShipper({ ...shipper, phone: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={shipper.address?.street}
                onChange={(e) => setShipper({
                  ...shipper,
                  address: { ...shipper.address!, street: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                value={shipper.address?.city}
                onChange={(e) => setShipper({
                  ...shipper,
                  address: { ...shipper.address!, city: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State"
                value={shipper.address?.state}
                onChange={(e) => setShipper({
                  ...shipper,
                  address: { ...shipper.address!, state: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="ZIP Code"
                value={shipper.address?.zipCode}
                onChange={(e) => setShipper({
                  ...shipper,
                  address: { ...shipper.address!, zipCode: e.target.value }
                })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                Consignee Information
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={consignee.companyName}
                onChange={(e) => setConsignee({ ...consignee, companyName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={consignee.contactPerson}
                onChange={(e) => setConsignee({ ...consignee, contactPerson: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={consignee.email}
                onChange={(e) => setConsignee({ ...consignee, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={consignee.phone}
                onChange={(e) => setConsignee({ ...consignee, phone: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={consignee.address?.street}
                onChange={(e) => setConsignee({
                  ...consignee,
                  address: { ...consignee.address!, street: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                value={consignee.address?.city}
                onChange={(e) => setConsignee({
                  ...consignee,
                  address: { ...consignee.address!, city: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State"
                value={consignee.address?.state}
                onChange={(e) => setConsignee({
                  ...consignee,
                  address: { ...consignee.address!, state: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="ZIP Code"
                value={consignee.address?.zipCode}
                onChange={(e) => setConsignee({
                  ...consignee,
                  address: { ...consignee.address!, zipCode: e.target.value }
                })}
                required
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" color="primary">
                Cargo Items
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={addCargoItem}
              >
                Add Item
              </Button>
            </Box>

            {cargoItems.map((item, index) => (
              <Card key={index} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Item {index + 1}
                    </Typography>
                    {cargoItems.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeCargoItem(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        value={item.description}
                        onChange={(e) => updateCargoItem(index, 'description', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateCargoItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Package Type</InputLabel>
                        <Select
                          value={item.packageType}
                          label="Package Type"
                          onChange={(e) => updateCargoItem(index, 'packageType', e.target.value)}
                        >
                          {PACKAGE_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>Cargo Type</InputLabel>
                        <Select
                          value={item.cargoType}
                          label="Cargo Type"
                          onChange={(e) => updateCargoItem(index, 'cargoType', e.target.value)}
                        >
                          {CARGO_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Weight (lbs)"
                        type="number"
                        value={item.weight}
                        onChange={(e) => updateCargoItem(index, 'weight', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Length (in)"
                        type="number"
                        value={item.dimensions?.length}
                        onChange={(e) => updateCargoItem(index, 'dimensions.length', parseFloat(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Width (in)"
                        type="number"
                        value={item.dimensions?.width}
                        onChange={(e) => updateCargoItem(index, 'dimensions.width', parseFloat(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Height (in)"
                        type="number"
                        value={item.dimensions?.height}
                        onChange={(e) => updateCargoItem(index, 'dimensions.height', parseFloat(e.target.value) || 0)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Value ($)"
                        type="number"
                        value={item.value}
                        onChange={(e) => updateCargoItem(index, 'value', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom color="primary">
              Freight Charges
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Base Rate ($)"
                  type="number"
                  value={formData.freightCharges?.baseRate}
                  onChange={(e) => setFormData({
                    ...formData,
                    freightCharges: {
                      ...formData.freightCharges!,
                      baseRate: parseFloat(e.target.value) || 0,
                    }
                  })}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Fuel Surcharge ($)"
                  type="number"
                  value={formData.freightCharges?.fuelSurcharge}
                  onChange={(e) => setFormData({
                    ...formData,
                    freightCharges: {
                      ...formData.freightCharges!,
                      fuelSurcharge: parseFloat(e.target.value) || 0,
                    }
                  })}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Accessorials ($)"
                  type="number"
                  value={formData.freightCharges?.accessorials}
                  onChange={(e) => setFormData({
                    ...formData,
                    freightCharges: {
                      ...formData.freightCharges!,
                      accessorials: parseFloat(e.target.value) || 0,
                    }
                  })}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Total ($)"
                  type="number"
                  value={(formData.freightCharges?.baseRate || 0) +
                        (formData.freightCharges?.fuelSurcharge || 0) +
                        (formData.freightCharges?.accessorials || 0)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        const totalWeight = cargoItems.reduce((sum, item) => sum + (item.weight || 0), 0);
        const totalValue = cargoItems.reduce((sum, item) => sum + (item.value || 0), 0);
        const totalQuantity = cargoItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalCharges = (formData.freightCharges?.baseRate || 0) +
                           (formData.freightCharges?.fuelSurcharge || 0) +
                           (formData.freightCharges?.accessorials || 0);

        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Review Your Bill of Lading
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Pickup Date:</strong> {new Date(formData.pickupDate!).toLocaleDateString()}
                  </Typography>
                  {formData.deliveryDate && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Delivery Date:</strong> {new Date(formData.deliveryDate).toLocaleDateString()}
                    </Typography>
                  )}
                  {formData.specialInstructions && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      <strong>Special Instructions:</strong> {formData.specialInstructions}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Summary
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Total Items:</strong> {totalQuantity}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Total Weight:</strong> {totalWeight.toLocaleString()} lbs
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Total Value:</strong> ${totalValue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Freight Charges:</strong> ${totalCharges.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Shipper
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{shipper.companyName}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {shipper.contactPerson}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {shipper.email} • {shipper.phone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {shipper.address?.street}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {shipper.address?.city}, {shipper.address?.state} {shipper.address?.zipCode}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Consignee
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{consignee.companyName}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {consignee.contactPerson}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {consignee.email} • {consignee.phone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {consignee.address?.street}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {consignee.address?.city}, {consignee.address?.state} {consignee.address?.zipCode}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Cargo Items ({cargoItems.length})
                  </Typography>
                  {cargoItems.map((item, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {item.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 3, mt: 1, flexWrap: 'wrap' }}>
                        <Chip label={`Qty: ${item.quantity}`} size="small" />
                        <Chip label={`${item.packageType}`} size="small" />
                        <Chip label={`${item.weight} lbs`} size="small" />
                        <Chip label={`$${item.value?.toLocaleString()}`} size="small" />
                        <Chip label={item.cargoType} size="small" color="primary" />
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <AppLayout>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton
            onClick={() => navigate('/bol')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" color="primary">
            Create Bill of Lading
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Please fix the following issues:
            </Typography>
            {validationErrors.map((err, index) => (
              <Typography key={index} variant="body2">
                • {err.message}
              </Typography>
            ))}
          </Alert>
        )}

        <Paper sx={{ p: 4 }}>
          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={20} />
                ) : activeStep === steps.length - 1 ? (
                  <SaveIcon />
                ) : undefined
              }
            >
              {loading
                ? 'Creating...'
                : activeStep === steps.length - 1
                ? 'Create BoL'
                : 'Next'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </AppLayout>
  );
}