import { CreateBoLRequest, Contact, CargoItem, BoLStatus } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a contact (shipper/consignee/carrier)
 */
export const validateContact = (contact: Partial<Contact>, type: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!contact.companyName?.trim()) {
    errors.push({
      field: `${type}.companyName`,
      message: `${type} company name is required`,
    });
  }

  if (!contact.contactPerson?.trim()) {
    errors.push({
      field: `${type}.contactPerson`,
      message: `${type} contact person is required`,
    });
  }

  if (!contact.email?.trim()) {
    errors.push({
      field: `${type}.email`,
      message: `${type} email is required`,
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push({
      field: `${type}.email`,
      message: `${type} email format is invalid`,
    });
  }

  if (!contact.phone?.trim()) {
    errors.push({
      field: `${type}.phone`,
      message: `${type} phone number is required`,
    });
  } else if (!/^\+?[\d\s\-\(\)]+$/.test(contact.phone)) {
    errors.push({
      field: `${type}.phone`,
      message: `${type} phone number format is invalid`,
    });
  }

  // Address validation
  if (!contact.address) {
    errors.push({
      field: `${type}.address`,
      message: `${type} address is required`,
    });
  } else {
    if (!contact.address.street?.trim()) {
      errors.push({
        field: `${type}.address.street`,
        message: `${type} street address is required`,
      });
    }

    if (!contact.address.city?.trim()) {
      errors.push({
        field: `${type}.address.city`,
        message: `${type} city is required`,
      });
    }

    if (!contact.address.state?.trim()) {
      errors.push({
        field: `${type}.address.state`,
        message: `${type} state is required`,
      });
    } else if (contact.address.state.length !== 2) {
      errors.push({
        field: `${type}.address.state`,
        message: `${type} state must be 2 characters (e.g., CA, TX)`,
      });
    }

    if (!contact.address.zipCode?.trim()) {
      errors.push({
        field: `${type}.address.zipCode`,
        message: `${type} ZIP code is required`,
      });
    } else if (!/^\d{5}(-\d{4})?$/.test(contact.address.zipCode)) {
      errors.push({
        field: `${type}.address.zipCode`,
        message: `${type} ZIP code format is invalid (e.g., 12345 or 12345-6789)`,
      });
    }
  }

  return errors;
};

/**
 * Validates a cargo item
 */
export const validateCargoItem = (item: Partial<CargoItem>, index: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  const prefix = `cargoItems[${index}]`;

  if (!item.description?.trim()) {
    errors.push({
      field: `${prefix}.description`,
      message: `Cargo item ${index + 1} description is required`,
    });
  }

  if (!item.quantity || item.quantity <= 0) {
    errors.push({
      field: `${prefix}.quantity`,
      message: `Cargo item ${index + 1} quantity must be greater than 0`,
    });
  }

  if (!item.weight || item.weight <= 0) {
    errors.push({
      field: `${prefix}.weight`,
      message: `Cargo item ${index + 1} weight must be greater than 0`,
    });
  } else if (item.weight > 80000) {
    errors.push({
      field: `${prefix}.weight`,
      message: `Cargo item ${index + 1} weight exceeds maximum limit (80,000 lbs)`,
    });
  }

  if (!item.value || item.value < 0) {
    errors.push({
      field: `${prefix}.value`,
      message: `Cargo item ${index + 1} value must be 0 or greater`,
    });
  } else if (item.value > 1000000) {
    errors.push({
      field: `${prefix}.value`,
      message: `Cargo item ${index + 1} value exceeds maximum limit ($1,000,000)`,
    });
  }

  if (!item.packageType?.trim()) {
    errors.push({
      field: `${prefix}.packageType`,
      message: `Cargo item ${index + 1} package type is required`,
    });
  }

  if (!item.cargoType?.trim()) {
    errors.push({
      field: `${prefix}.cargoType`,
      message: `Cargo item ${index + 1} cargo type is required`,
    });
  }

  // Validate dimensions if provided
  if (item.dimensions) {
    const { length, width, height } = item.dimensions;

    if (length && length <= 0) {
      errors.push({
        field: `${prefix}.dimensions.length`,
        message: `Cargo item ${index + 1} length must be greater than 0`,
      });
    }

    if (width && width <= 0) {
      errors.push({
        field: `${prefix}.dimensions.width`,
        message: `Cargo item ${index + 1} width must be greater than 0`,
      });
    }

    if (height && height <= 0) {
      errors.push({
        field: `${prefix}.dimensions.height`,
        message: `Cargo item ${index + 1} height must be greater than 0`,
      });
    }

    // Check for oversized cargo
    const maxLength = 53 * 12; // 53 feet in inches
    const maxWidth = 8.5 * 12; // 8.5 feet in inches
    const maxHeight = 13.5 * 12; // 13.5 feet in inches

    if (length && length > maxLength) {
      errors.push({
        field: `${prefix}.dimensions.length`,
        message: `Cargo item ${index + 1} length exceeds standard trailer limit (53 feet)`,
      });
    }

    if (width && width > maxWidth) {
      errors.push({
        field: `${prefix}.dimensions.width`,
        message: `Cargo item ${index + 1} width exceeds standard trailer limit (8.5 feet)`,
      });
    }

    if (height && height > maxHeight) {
      errors.push({
        field: `${prefix}.dimensions.height`,
        message: `Cargo item ${index + 1} height exceeds standard trailer limit (13.5 feet)`,
      });
    }
  }

  return errors;
};

/**
 * Validates the complete BoL creation request
 */
export const validateCreateBoLRequest = (request: Partial<CreateBoLRequest>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Basic information validation
  if (!request.pickupDate) {
    errors.push({
      field: 'pickupDate',
      message: 'Pickup date is required',
    });
  } else {
    const pickupDate = new Date(request.pickupDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (pickupDate < today) {
      errors.push({
        field: 'pickupDate',
        message: 'Pickup date cannot be in the past',
      });
    }
  }

  if (request.deliveryDate) {
    const deliveryDate = new Date(request.deliveryDate);
    const pickupDate = new Date(request.pickupDate || '');

    if (deliveryDate <= pickupDate) {
      errors.push({
        field: 'deliveryDate',
        message: 'Delivery date must be after pickup date',
      });
    }
  }

  // Contact validation
  if (!request.shipper) {
    errors.push({
      field: 'shipper',
      message: 'Shipper information is required',
    });
  } else {
    errors.push(...validateContact(request.shipper, 'Shipper'));
  }

  if (!request.consignee) {
    errors.push({
      field: 'consignee',
      message: 'Consignee information is required',
    });
  } else {
    errors.push(...validateContact(request.consignee, 'Consignee'));
  }

  // Cargo items validation
  if (!request.cargoItems || request.cargoItems.length === 0) {
    errors.push({
      field: 'cargoItems',
      message: 'At least one cargo item is required',
    });
  } else {
    request.cargoItems.forEach((item, index) => {
      errors.push(...validateCargoItem(item, index));
    });

    // Check total weight limits
    const totalWeight = request.cargoItems.reduce(
      (sum, item) => sum + (item.weight || 0),
      0
    );

    if (totalWeight > 80000) {
      errors.push({
        field: 'totalWeight',
        message: 'Total weight exceeds maximum limit (80,000 lbs)',
      });
    }

    // Check total value limits
    const totalValue = request.cargoItems.reduce(
      (sum, item) => sum + (item.value || 0),
      0
    );

    if (totalValue > 100000000) {
      errors.push({
        field: 'totalValue',
        message: 'Total cargo value exceeds maximum limit ($100,000,000)',
      });
    }
  }

  // Freight charges validation
  if (request.freightCharges) {
    const { baseRate, fuelSurcharge, accessorials } = request.freightCharges;

    if (baseRate && baseRate < 0) {
      errors.push({
        field: 'freightCharges.baseRate',
        message: 'Base rate cannot be negative',
      });
    }

    if (fuelSurcharge && fuelSurcharge < 0) {
      errors.push({
        field: 'freightCharges.fuelSurcharge',
        message: 'Fuel surcharge cannot be negative',
      });
    }

    if (accessorials && accessorials < 0) {
      errors.push({
        field: 'freightCharges.accessorials',
        message: 'Accessorials cannot be negative',
      });
    }

    const total = (baseRate || 0) + (fuelSurcharge || 0) + (accessorials || 0);
    if (total > 1000000) {
      errors.push({
        field: 'freightCharges.total',
        message: 'Total freight charges exceed maximum limit ($1,000,000)',
      });
    }
  }

  // HAZMAT validation
  if (request.hazmatInfo?.isHazmat) {
    if (!request.hazmatInfo.hazmatClass?.trim()) {
      errors.push({
        field: 'hazmatInfo.hazmatClass',
        message: 'HAZMAT class is required for hazardous materials',
      });
    }

    if (!request.hazmatInfo.unNumber?.trim()) {
      errors.push({
        field: 'hazmatInfo.unNumber',
        message: 'UN Number is required for hazardous materials',
      });
    }

    if (!request.hazmatInfo.properShippingName?.trim()) {
      errors.push({
        field: 'hazmatInfo.properShippingName',
        message: 'Proper shipping name is required for hazardous materials',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Business rules for status transitions
 */
export const validateStatusTransition = (
  currentStatus: BoLStatus,
  newStatus: BoLStatus,
  userRoles: string[]
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Define valid status transitions
  const validTransitions: Record<BoLStatus, BoLStatus[]> = {
    pending: ['approved'],
    approved: ['assigned'],
    assigned: ['accepted'],
    accepted: ['picked_up'],
    picked_up: ['en_route'],
    en_route: ['delivered'],
    delivered: ['unpaid'],
    unpaid: ['paid'],
    paid: [], // Final status
  };

  // Check if transition is valid
  const allowedNextStatuses = validTransitions[currentStatus];
  if (!allowedNextStatuses.includes(newStatus)) {
    errors.push({
      field: 'status',
      message: `Cannot transition from ${currentStatus} to ${newStatus}`,
    });
  }

  // Role-based permissions for status changes
  const statusPermissions: Record<BoLStatus, string[]> = {
    pending: ['admin', 'shipper'],
    approved: ['admin', 'shipper', 'broker'],
    assigned: ['admin', 'carrier'],
    accepted: ['admin', 'carrier'],
    picked_up: ['admin', 'carrier'],
    en_route: ['admin', 'carrier'],
    delivered: ['admin', 'carrier', 'consignee'],
    unpaid: ['admin', 'shipper', 'broker'],
    paid: ['admin', 'shipper', 'broker'],
  };

  const requiredRoles = statusPermissions[newStatus];
  const hasPermission = userRoles.some(role => requiredRoles.includes(role));

  if (!hasPermission) {
    errors.push({
      field: 'permission',
      message: `You do not have permission to set status to ${newStatus}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get validation error message for a specific field
 */
export const getFieldError = (
  errors: ValidationError[],
  fieldName: string
): string | undefined => {
  const error = errors.find(err => err.field === fieldName);
  return error?.message;
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: ValidationError[]): string => {
  return errors.map(error => error.message).join('\n');
};

/**
 * Business logic constants
 */
export const BOL_BUSINESS_RULES = {
  MAX_CARGO_WEIGHT: 80000, // lbs
  MAX_CARGO_VALUE: 100000000, // dollars
  MAX_FREIGHT_CHARGES: 1000000, // dollars
  MAX_TRAILER_LENGTH: 53 * 12, // inches
  MAX_TRAILER_WIDTH: 8.5 * 12, // inches
  MAX_TRAILER_HEIGHT: 13.5 * 12, // inches
  MIN_PICKUP_DATE_OFFSET: 0, // days from today
  BOL_NUMBER_FORMAT: /^BOL-\d{4}-\d{6}$/,
  VALID_PACKAGE_TYPES: [
    'Box',
    'Pallet',
    'Crate',
    'Barrel',
    'Bag',
    'Roll',
    'Bundle',
    'Other',
  ],
  VALID_CARGO_TYPES: [
    'General Freight',
    'Electronics',
    'Food Products',
    'Automotive Parts',
    'Machinery',
    'Chemicals',
    'Textiles',
    'Construction Materials',
    'Medical Supplies',
    'Other',
  ],
  HAZMAT_CLASSES: [
    'Class 1 - Explosives',
    'Class 2 - Gases',
    'Class 3 - Flammable Liquids',
    'Class 4 - Flammable Solids',
    'Class 5 - Oxidizers',
    'Class 6 - Toxic Materials',
    'Class 7 - Radioactive Materials',
    'Class 8 - Corrosive Materials',
    'Class 9 - Miscellaneous',
  ],
};