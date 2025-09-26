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

// Bill of Lading Types (for future use)
export interface BoL {
  id: string;
  bolNumber: string;
  status: BoLStatus;
  shipper: Contact;
  consignee: Contact;
  carrier: Contact;
  createdAt: string;
  updatedAt: string;
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
  address: string;
}