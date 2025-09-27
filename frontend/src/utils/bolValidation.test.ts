import { describe, it, expect } from 'vitest';
import {
  validateContact,
  validateCargoItem,
  validateCreateBoLRequest,
  validateStatusTransition,
  getFieldError,
  formatValidationErrors,
  BOL_BUSINESS_RULES,
} from './bolValidation';
import { Contact, CargoItem, CreateBoLRequest, BoLStatus } from '../types';

describe('BoL Validation', () => {
  describe('validateContact', () => {
    const validContact: Contact = {
      id: '1',
      companyName: 'Test Company',
      contactPerson: 'John Doe',
      email: 'john@test.com',
      phone: '555-123-4567',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'USA',
      },
    };

    it('should pass validation for valid contact', () => {
      const errors = validateContact(validContact, 'Shipper');
      expect(errors).toHaveLength(0);
    });

    it('should require company name', () => {
      const invalidContact = { ...validContact, companyName: '' };
      const errors = validateContact(invalidContact, 'Shipper');
      expect(errors).toContainEqual({
        field: 'Shipper.companyName',
        message: 'Shipper company name is required',
      });
    });

    it('should require contact person', () => {
      const invalidContact = { ...validContact, contactPerson: '' };
      const errors = validateContact(invalidContact, 'Shipper');
      expect(errors).toContainEqual({
        field: 'Shipper.contactPerson',
        message: 'Shipper contact person is required',
      });
    });

    it('should validate email format', () => {
      const invalidContact = { ...validContact, email: 'invalid-email' };
      const errors = validateContact(invalidContact, 'Shipper');
      expect(errors).toContainEqual({
        field: 'Shipper.email',
        message: 'Shipper email format is invalid',
      });
    });

    it('should validate phone format', () => {
      const invalidContact = { ...validContact, phone: 'invalid-phone' };
      const errors = validateContact(invalidContact, 'Shipper');
      expect(errors).toContainEqual({
        field: 'Shipper.phone',
        message: 'Shipper phone number format is invalid',
      });
    });

    it('should validate state length', () => {
      const invalidContact = {
        ...validContact,
        address: { ...validContact.address, state: 'California' },
      };
      const errors = validateContact(invalidContact, 'Shipper');
      expect(errors).toContainEqual({
        field: 'Shipper.address.state',
        message: 'Shipper state must be 2 characters (e.g., CA, TX)',
      });
    });

    it('should validate ZIP code format', () => {
      const invalidContact = {
        ...validContact,
        address: { ...validContact.address, zipCode: '1234' },
      };
      const errors = validateContact(invalidContact, 'Shipper');
      expect(errors).toContainEqual({
        field: 'Shipper.address.zipCode',
        message: 'Shipper ZIP code format is invalid (e.g., 12345 or 12345-6789)',
      });
    });

    it('should accept extended ZIP code format', () => {
      const validContactWithExtendedZip = {
        ...validContact,
        address: { ...validContact.address, zipCode: '12345-6789' },
      };
      const errors = validateContact(validContactWithExtendedZip, 'Shipper');
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateCargoItem', () => {
    const validCargoItem: CargoItem = {
      description: 'Test cargo',
      quantity: 10,
      packageType: 'Box',
      weight: 1000,
      dimensions: {
        length: 48,
        width: 40,
        height: 36,
      },
      value: 5000,
      cargoType: 'General Freight',
    };

    it('should pass validation for valid cargo item', () => {
      const errors = validateCargoItem(validCargoItem, 0);
      expect(errors).toHaveLength(0);
    });

    it('should require description', () => {
      const invalidItem = { ...validCargoItem, description: '' };
      const errors = validateCargoItem(invalidItem, 0);
      expect(errors).toContainEqual({
        field: 'cargoItems[0].description',
        message: 'Cargo item 1 description is required',
      });
    });

    it('should require positive quantity', () => {
      const invalidItem = { ...validCargoItem, quantity: 0 };
      const errors = validateCargoItem(invalidItem, 0);
      expect(errors).toContainEqual({
        field: 'cargoItems[0].quantity',
        message: 'Cargo item 1 quantity must be greater than 0',
      });
    });

    it('should require positive weight', () => {
      const invalidItem = { ...validCargoItem, weight: 0 };
      const errors = validateCargoItem(invalidItem, 0);
      expect(errors).toContainEqual({
        field: 'cargoItems[0].weight',
        message: 'Cargo item 1 weight must be greater than 0',
      });
    });

    it('should enforce maximum weight limit', () => {
      const invalidItem = { ...validCargoItem, weight: 90000 };
      const errors = validateCargoItem(invalidItem, 0);
      expect(errors).toContainEqual({
        field: 'cargoItems[0].weight',
        message: 'Cargo item 1 weight exceeds maximum limit (80,000 lbs)',
      });
    });

    it('should enforce maximum value limit', () => {
      const invalidItem = { ...validCargoItem, value: 2000000 };
      const errors = validateCargoItem(invalidItem, 0);
      expect(errors).toContainEqual({
        field: 'cargoItems[0].value',
        message: 'Cargo item 1 value exceeds maximum limit ($1,000,000)',
      });
    });

    it('should validate dimensions if provided', () => {
      const invalidItem = {
        ...validCargoItem,
        dimensions: { length: 0, width: 40, height: 36 },
      };
      const errors = validateCargoItem(invalidItem, 0);
      expect(errors).toContainEqual({
        field: 'cargoItems[0].dimensions.length',
        message: 'Cargo item 1 length must be greater than 0',
      });
    });

    it('should enforce trailer size limits', () => {
      const invalidItem = {
        ...validCargoItem,
        dimensions: { length: 54 * 12, width: 40, height: 36 }, // 54 feet
      };
      const errors = validateCargoItem(invalidItem, 0);
      expect(errors).toContainEqual({
        field: 'cargoItems[0].dimensions.length',
        message: 'Cargo item 1 length exceeds standard trailer limit (53 feet)',
      });
    });
  });

  describe('validateCreateBoLRequest', () => {
    const validRequest: CreateBoLRequest = {
      pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
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
    };

    it('should pass validation for valid request', () => {
      const result = validateCreateBoLRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require pickup date', () => {
      const invalidRequest = { ...validRequest, pickupDate: '' };
      const result = validateCreateBoLRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'pickupDate',
        message: 'Pickup date is required',
      });
    });

    it('should not allow pickup date in the past', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const invalidRequest = {
        ...validRequest,
        pickupDate: yesterday.toISOString().split('T')[0],
      };
      const result = validateCreateBoLRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'pickupDate',
        message: 'Pickup date cannot be in the past',
      });
    });

    it('should require delivery date after pickup date', () => {
      const invalidRequest = {
        ...validRequest,
        deliveryDate: validRequest.pickupDate, // Same day
      };
      const result = validateCreateBoLRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'deliveryDate',
        message: 'Delivery date must be after pickup date',
      });
    });

    it('should require at least one cargo item', () => {
      const invalidRequest = { ...validRequest, cargoItems: [] };
      const result = validateCreateBoLRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'cargoItems',
        message: 'At least one cargo item is required',
      });
    });

    it('should enforce total weight limit', () => {
      const heavyItem = {
        ...validRequest.cargoItems[0],
        weight: 90000,
      };
      const invalidRequest = {
        ...validRequest,
        cargoItems: [heavyItem],
      };
      const result = validateCreateBoLRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'totalWeight',
        message: 'Total weight exceeds maximum limit (80,000 lbs)',
      });
    });

    it('should validate HAZMAT information when isHazmat is true', () => {
      const hazmatRequest = {
        ...validRequest,
        hazmatInfo: {
          isHazmat: true,
          hazmatClass: '',
          unNumber: '',
          properShippingName: '',
        },
      };
      const result = validateCreateBoLRequest(hazmatRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'hazmatInfo.hazmatClass',
        message: 'HAZMAT class is required for hazardous materials',
      });
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid status transitions', () => {
      const result = validateStatusTransition('pending', 'approved', ['admin']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid status transitions', () => {
      const result = validateStatusTransition('pending', 'delivered', ['admin']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'Cannot transition from pending to delivered',
      });
    });

    it('should enforce role-based permissions', () => {
      const result = validateStatusTransition('pending', 'approved', ['carrier']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'permission',
        message: 'You do not have permission to set status to approved',
      });
    });

    it('should allow admins to make any valid transition', () => {
      const result = validateStatusTransition('assigned', 'accepted', ['admin']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow carriers to update transport statuses', () => {
      const result = validateStatusTransition('assigned', 'accepted', ['carrier']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('utility functions', () => {
    it('should get field error by name', () => {
      const errors = [
        { field: 'field1', message: 'Error 1' },
        { field: 'field2', message: 'Error 2' },
      ];
      expect(getFieldError(errors, 'field1')).toBe('Error 1');
      expect(getFieldError(errors, 'field3')).toBeUndefined();
    });

    it('should format validation errors', () => {
      const errors = [
        { field: 'field1', message: 'Error 1' },
        { field: 'field2', message: 'Error 2' },
      ];
      expect(formatValidationErrors(errors)).toBe('Error 1\nError 2');
    });
  });

  describe('business rules constants', () => {
    it('should have correct maximum values', () => {
      expect(BOL_BUSINESS_RULES.MAX_CARGO_WEIGHT).toBe(80000);
      expect(BOL_BUSINESS_RULES.MAX_CARGO_VALUE).toBe(100000000);
      expect(BOL_BUSINESS_RULES.MAX_FREIGHT_CHARGES).toBe(1000000);
    });

    it('should have valid trailer dimensions', () => {
      expect(BOL_BUSINESS_RULES.MAX_TRAILER_LENGTH).toBe(53 * 12);
      expect(BOL_BUSINESS_RULES.MAX_TRAILER_WIDTH).toBe(8.5 * 12);
      expect(BOL_BUSINESS_RULES.MAX_TRAILER_HEIGHT).toBe(13.5 * 12);
    });

    it('should have valid package and cargo types', () => {
      expect(BOL_BUSINESS_RULES.VALID_PACKAGE_TYPES).toContain('Box');
      expect(BOL_BUSINESS_RULES.VALID_PACKAGE_TYPES).toContain('Pallet');
      expect(BOL_BUSINESS_RULES.VALID_CARGO_TYPES).toContain('General Freight');
      expect(BOL_BUSINESS_RULES.VALID_CARGO_TYPES).toContain('Electronics');
    });

    it('should have HAZMAT classes', () => {
      expect(BOL_BUSINESS_RULES.HAZMAT_CLASSES).toContain('Class 1 - Explosives');
      expect(BOL_BUSINESS_RULES.HAZMAT_CLASSES).toContain('Class 9 - Miscellaneous');
    });
  });
});