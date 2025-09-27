import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { bolService } from './bolService';
import { BoL, CreateBoLRequest, BoLFilters, BoLListResponse } from '../types';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    })),
    post: vi.fn(),
  },
}));

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  },
};

// Mock axios.create to return our mock API
(axios.create as any).mockReturnValue(mockApi);

describe('BoL Service', () => {
  const mockBoL: BoL = {
    id: 'bol-1',
    bolNumber: 'BOL-2024-000001',
    status: 'pending',
    shipper: {
      id: '1',
      companyName: 'Shipper Co',
      contactPerson: 'John Shipper',
      email: 'john@shipper.com',
      phone: '555-123-4567',
      address: {
        street: '123 Shipper St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'USA',
      },
    },
    consignee: {
      id: '2',
      companyName: 'Consignee Co',
      contactPerson: 'Jane Consignee',
      email: 'jane@consignee.com',
      phone: '555-987-6543',
      address: {
        street: '456 Consignee Ave',
        city: 'Another City',
        state: 'TX',
        zipCode: '67890',
        country: 'USA',
      },
    },
    carrier: {
      id: '3',
      companyName: 'Carrier LLC',
      contactPerson: 'Bob Carrier',
      email: 'bob@carrier.com',
      phone: '555-555-5555',
      address: {
        street: '789 Carrier Blvd',
        city: 'Carrier City',
        state: 'FL',
        zipCode: '54321',
        country: 'USA',
      },
    },
    pickupDate: '2024-01-15',
    deliveryDate: '2024-01-20',
    cargoItems: [
      {
        description: 'Test cargo',
        quantity: 10,
        packageType: 'Box',
        weight: 1000,
        dimensions: { length: 48, width: 40, height: 36 },
        value: 5000,
        cargoType: 'General Freight',
      },
    ],
    totalWeight: 1000,
    totalValue: 5000,
    totalQuantity: 10,
    freightCharges: {
      baseRate: 1000,
      fuelSurcharge: 100,
      accessorials: 50,
      total: 1150,
    },
    specialInstructions: 'Handle with care',
    hazmatInfo: {
      isHazmat: false,
      hazmatClass: '',
      unNumber: '',
      properShippingName: '',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
  };

  const mockCreateRequest: CreateBoLRequest = {
    pickupDate: '2024-01-15',
    deliveryDate: '2024-01-20',
    shipper: mockBoL.shipper,
    consignee: mockBoL.consignee,
    cargoItems: mockBoL.cargoItems,
    totalWeight: 1000,
    totalValue: 5000,
    totalQuantity: 10,
    freightCharges: mockBoL.freightCharges,
    specialInstructions: 'Handle with care',
    hazmatInfo: mockBoL.hazmatInfo,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBols', () => {
    it('should fetch BoLs successfully', async () => {
      const mockResponse: BoLListResponse = {
        bols: [mockBoL],
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 1,
          totalItems: 1,
        },
      };

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      const result = await bolService.getBols();

      expect(mockApi.get).toHaveBeenCalledWith('/bol?');
      expect(result).toEqual(mockResponse);
    });

    it('should handle filters and pagination', async () => {
      const filters: BoLFilters & { page?: number; limit?: number } = {
        page: 2,
        limit: 20,
        status: ['pending', 'approved'],
        search: 'test',
        carrierIds: ['carrier-1'],
        shipperIds: ['shipper-1'],
      };

      const mockResponse: BoLListResponse = {
        bols: [],
        pagination: {
          page: 2,
          limit: 20,
          totalPages: 5,
          totalItems: 100,
        },
      };

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: mockResponse,
        },
      });

      await bolService.getBols(filters);

      const expectedUrl = '/bol?page=2&limit=20&status=pending&status=approved&search=test&carrierId=carrier-1&shipperId=shipper-1';
      expect(mockApi.get).toHaveBeenCalledWith(expectedUrl);
    });

    it('should throw error on API failure', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: false,
          message: 'Failed to fetch BoLs',
        },
      });

      await expect(bolService.getBols()).rejects.toThrow('Failed to fetch BoLs');
    });
  });

  describe('getBoL', () => {
    it('should fetch a specific BoL successfully', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: mockBoL,
        },
      });

      const result = await bolService.getBoL('bol-1');

      expect(mockApi.get).toHaveBeenCalledWith('/bol/bol-1');
      expect(result).toEqual(mockBoL);
    });

    it('should throw error for non-existent BoL', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: false,
          message: 'BoL not found',
        },
      });

      await expect(bolService.getBoL('invalid-id')).rejects.toThrow('BoL not found');
    });
  });

  describe('createBoL', () => {
    it('should create BoL successfully', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          success: true,
          data: mockBoL,
        },
      });

      const result = await bolService.createBoL(mockCreateRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/bol', mockCreateRequest);
      expect(result).toEqual(mockBoL);
    });

    it('should throw error on creation failure', async () => {
      mockApi.post.mockResolvedValue({
        data: {
          success: false,
          message: 'Validation failed',
        },
      });

      await expect(bolService.createBoL(mockCreateRequest)).rejects.toThrow('Validation failed');
    });
  });

  describe('updateBoL', () => {
    it('should update BoL successfully', async () => {
      const updateData = { specialInstructions: 'Updated instructions' };
      const updatedBoL = { ...mockBoL, ...updateData };

      mockApi.put.mockResolvedValue({
        data: {
          success: true,
          data: updatedBoL,
        },
      });

      const result = await bolService.updateBoL('bol-1', updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/bol/bol-1', updateData);
      expect(result).toEqual(updatedBoL);
    });

    it('should throw error on update failure', async () => {
      mockApi.put.mockResolvedValue({
        data: {
          success: false,
          message: 'Update failed',
        },
      });

      await expect(bolService.updateBoL('bol-1', {})).rejects.toThrow('Update failed');
    });
  });

  describe('updateBoLStatus', () => {
    it('should update BoL status successfully', async () => {
      const updatedBoL = { ...mockBoL, status: 'approved' as const };

      mockApi.patch.mockResolvedValue({
        data: {
          success: true,
          data: updatedBoL,
        },
      });

      const result = await bolService.updateBoLStatus('bol-1', 'approved', 'Approved by manager');

      expect(mockApi.patch).toHaveBeenCalledWith('/bol/bol-1/status', {
        status: 'approved',
        notes: 'Approved by manager',
      });
      expect(result).toEqual(updatedBoL);
    });

    it('should handle status update without notes', async () => {
      const updatedBoL = { ...mockBoL, status: 'approved' as const };

      mockApi.patch.mockResolvedValue({
        data: {
          success: true,
          data: updatedBoL,
        },
      });

      await bolService.updateBoLStatus('bol-1', 'approved');

      expect(mockApi.patch).toHaveBeenCalledWith('/bol/bol-1/status', {
        status: 'approved',
        notes: undefined,
      });
    });
  });

  describe('deleteBoL', () => {
    it('should delete BoL successfully', async () => {
      mockApi.delete.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await bolService.deleteBoL('bol-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/bol/bol-1');
    });

    it('should throw error on deletion failure', async () => {
      mockApi.delete.mockResolvedValue({
        data: {
          success: false,
          message: 'Deletion failed',
        },
      });

      await expect(bolService.deleteBoL('bol-1')).rejects.toThrow('Deletion failed');
    });
  });

  describe('getBolStats', () => {
    it('should fetch BoL statistics successfully', async () => {
      const mockStats = {
        total: 100,
        byStatus: {
          pending: 10,
          approved: 20,
          assigned: 15,
          accepted: 10,
          picked_up: 15,
          en_route: 20,
          delivered: 10,
        },
        totalValue: 1000000,
        totalWeight: 50000,
      };

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: mockStats,
        },
      });

      const result = await bolService.getBolStats();

      expect(mockApi.get).toHaveBeenCalledWith('/bol/stats');
      expect(result).toEqual(mockStats);
    });

    it('should throw error on stats fetch failure', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: false,
          message: 'Stats fetch failed',
        },
      });

      await expect(bolService.getBolStats()).rejects.toThrow('Stats fetch failed');
    });
  });

  describe('API interceptors', () => {
    it('should set up request interceptor for auth token', () => {
      expect(mockApi.interceptors.request.use).toHaveBeenCalled();
    });

    it('should set up response interceptor for token refresh', () => {
      expect(mockApi.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('URL parameter building', () => {
    it('should handle multiple status filters', async () => {
      const filters = {
        status: ['pending', 'approved', 'assigned'],
      };

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: { bols: [], pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 } },
        },
      });

      await bolService.getBols(filters);

      expect(mockApi.get).toHaveBeenCalledWith('/bol?status=pending&status=approved&status=assigned');
    });

    it('should handle multiple carrier IDs', async () => {
      const filters = {
        carrierIds: ['carrier-1', 'carrier-2'],
      };

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: { bols: [], pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 } },
        },
      });

      await bolService.getBols(filters);

      expect(mockApi.get).toHaveBeenCalledWith('/bol?carrierId=carrier-1&carrierId=carrier-2');
    });

    it('should handle empty filters', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: { bols: [], pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 0 } },
        },
      });

      await bolService.getBols({});

      expect(mockApi.get).toHaveBeenCalledWith('/bol?');
    });
  });
});