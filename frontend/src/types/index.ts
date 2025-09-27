// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'carrier' | 'shipper' | 'broker' | 'consignee';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Bill of Lading Types
export interface BoL {
  id: string;
  bolNumber: string;
  status: BoLStatus;
  shipper: Contact;
  consignee: Contact;
  carrier: Contact;
  broker?: Contact;
  cargoItems: CargoItem[];
  totalWeight: number;
  totalValue: number;
  specialInstructions?: string;
  hazmatInfo?: HazmatInfo;
  pickupDate: string;
  deliveryDate?: string;
  freightCharges: FreightCharges;
  createdBy: string;
  assignedDriver?: Driver;
  documentUrls?: string[];
  notes?: BoLNote[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type BoLStatus =
  | 'pending'
  | 'approved'
  | 'assigned'
  | 'accepted'
  | 'picked_up'
  | 'en_route'
  | 'delivered'
  | 'unpaid'
  | 'paid';

export interface Contact {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: Address;
  dotNumber?: string;
  mcNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CargoItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // 'pieces', 'pallets', 'tons', etc.
  weight: number;
  dimensions?: Dimensions;
  value: number;
  packaging?: string;
  hazmat: boolean;
  hazmatClass?: string;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: 'in' | 'ft' | 'cm' | 'm';
}

export interface HazmatInfo {
  unNumber: string;
  properShippingName: string;
  hazardClass: string;
  packingGroup: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export interface FreightCharges {
  baseRate: number;
  fuelSurcharge: number;
  accessorialCharges: number;
  totalCharges: number;
  paymentTerms: 'prepaid' | 'collect' | 'third_party';
  billTo: 'shipper' | 'consignee' | 'third_party';
}

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  email?: string;
  vehicleInfo: VehicleInfo;
}

export interface VehicleInfo {
  tractorNumber: string;
  trailerNumber: string;
  make: string;
  model: string;
  year: number;
  licenseePlate: string;
}

export interface BoLNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  noteType: 'general' | 'status_change' | 'issue' | 'delivery';
}

// BoL Creation and Update Types
export interface CreateBoLRequest {
  shipper: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> | string; // ID if existing contact
  consignee: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> | string;
  carrier?: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> | string;
  broker?: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> | string;
  cargoItems: Omit<CargoItem, 'id'>[];
  pickupDate: string;
  specialInstructions?: string;
  hazmatInfo?: HazmatInfo;
  freightCharges: FreightCharges;
}

export interface UpdateBoLRequest {
  status?: BoLStatus;
  assignedDriver?: Driver;
  deliveryDate?: string;
  specialInstructions?: string;
  notes?: string;
  freightCharges?: Partial<FreightCharges>;
}

// BoL Filtering and Search Types
export interface BoLFilters {
  status?: BoLStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  carrierIds?: string[];
  shipperIds?: string[];
  consigneeIds?: string[];
  search?: string; // Search in BoL number, shipper, consignee
}

export interface BoLListResponse {
  bols: BoL[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: BoLFilters;
}