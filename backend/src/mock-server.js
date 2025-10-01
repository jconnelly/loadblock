const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

// Blockchain integration
const fabricService = require(path.join(__dirname, 'services', 'fabricService'));

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'mock-jwt-secret-for-testing';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006', 'http://localhost:3007'],
  credentials: true
}));

// Mock user database
const users = [
  {
    id: '1',
    email: 'admin@loadblock.io',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPoyh.VS', // 12345678
    firstName: 'Admin',
    lastName: 'User',
    roles: ['admin'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    email: 'carrier@loadblock.io',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPoyh.VS', // 12345678
    firstName: 'John',
    lastName: 'Carrier',
    roles: ['carrier'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    email: 'shipper@loadblock.io',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPoyh.VS', // 12345678
    firstName: 'Sarah',
    lastName: 'Shipper',
    roles: ['shipper'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    email: 'broker@loadblock.io',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPoyh.VS', // 12345678
    firstName: 'Bob',
    lastName: 'Broker',
    roles: ['broker'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    email: 'consignee@loadblock.io',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPoyh.VS', // 12345678
    firstName: 'Carol',
    lastName: 'Consignee',
    roles: ['consignee'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper function to generate JWT token
const generateToken = (user) => {
  try {
    console.log('Generating token for user:', user.email);
    const payload = {
      id: user.id,
      email: user.email,
      roles: user.roles
    };
    console.log('Token payload:', payload);
    console.log('JWT_SECRET length:', JWT_SECRET.length);

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log('Token generated successfully');
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Token generation failed');
  }
};

// Helper function to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  const user = users.find(u => u.id === decoded.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not found'
    });
  }

  req.user = user;
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'development-mock',
    version: '1.0.0'
  });
});

// Login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;

  console.log('Login attempt:', { email, password });

  // Find user (in real app, we'd hash and compare password)
  const user = users.find(u => u.email === email);
  console.log('User found:', user ? user.email : 'not found');

  if (!user || password !== '12345678') {
    console.log('Login failed: invalid credentials');
    return res.status(400).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  console.log('About to generate token...');
  const token = generateToken(user);
  console.log('Token generated, preparing response...');
  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // Set refresh token as httpOnly cookie
  console.log('Setting refresh token cookie...');
  res.cookie('refreshToken', 'mock-refresh-token', {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  console.log('Sending JSON response...');
  res.json({
    success: true,
    data: {
      user: userResponse,
      token
    },
    message: 'Login successful'
  });
  console.log('Login response sent successfully');
});

// Register endpoint
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, firstName, lastName, roles } = req.body;

  console.log('Register attempt:', { email, firstName, lastName, roles });

  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Create new user
  const newUser = {
    id: String(users.length + 1),
    email,
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VjPoyh.VS', // Mock hash
    firstName,
    lastName,
    roles: roles || ['shipper'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.push(newUser);

  const token = generateToken(newUser);
  const userResponse = {
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    roles: newUser.roles,
    isActive: newUser.isActive,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt
  };

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', 'mock-refresh-token', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(201).json({
    success: true,
    data: {
      user: userResponse,
      token
    },
    message: 'Registration successful'
  });
});

// Get current user
app.get('/api/v1/auth/me', authenticate, (req, res) => {
  const userResponse = {
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    roles: req.user.roles,
    isActive: req.user.isActive,
    createdAt: req.user.createdAt,
    updatedAt: req.user.updatedAt
  };

  res.json({
    success: true,
    data: userResponse
  });
});

// Verify token
app.get('/api/v1/auth/verify-token', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid'
  });
});

// Refresh token
app.post('/api/v1/auth/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken || refreshToken !== 'mock-refresh-token') {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }

  // For mock purposes, assume the refresh token is valid
  const user = users[0]; // Default to admin user
  const token = generateToken(user);

  res.json({
    success: true,
    data: {
      token
    }
  });
});

// Logout
app.post('/api/v1/auth/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Mock BoL database
let bols = [
  {
    id: '1',
    bolNumber: 'BOL-2025-000001',
    status: 'pending',
    shipper: {
      id: '1',
      companyName: 'Acme Manufacturing',
      contactName: 'John Smith',
      email: 'john@acme.com',
      phone: '555-0101',
      address: {
        street: '123 Industrial Blvd',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA'
      },
      dotNumber: 'DOT123456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    consignee: {
      id: '2',
      companyName: 'Global Retailers Inc',
      contactName: 'Jane Doe',
      email: 'jane@globalretailers.com',
      phone: '555-0202',
      address: {
        street: '456 Commerce St',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
        country: 'USA'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    carrier: {
      id: '3',
      companyName: 'Swift Transport LLC',
      contactName: 'Mike Johnson',
      email: 'mike@swifttransport.com',
      phone: '555-0303',
      address: {
        street: '789 Logistics Way',
        city: 'Atlanta',
        state: 'GA',
        zipCode: '30301',
        country: 'USA'
      },
      dotNumber: 'DOT789012',
      mcNumber: 'MC123456',
      scacCode: 'SWFT',
      insurancePolicy: 'Policy #SW-7890-2025, $1,000,000 Liability',
      licenseNumber: 'GA-TL-789012',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    cargoItems: [
      {
        id: '1',
        description: 'Industrial Equipment Parts',
        quantity: 50,
        unit: 'pieces',
        weight: 2500,
        value: 75000,
        packaging: 'Wooden Crates',
        hazmat: false,
        freightClass: '70',
        handlingUnit: 'PLT',
        dimensions: {
          length: 48,
          width: 40,
          height: 36,
          unit: 'in'
        },
        specialInstructions: 'Handle with care - fragile components'
      }
    ],
    totalWeight: 2500,
    totalValue: 75000,
    pickupDate: new Date(Date.now() + 24*60*60*1000).toISOString(),
    freightCharges: {
      baseRate: 2500,
      fuelSurcharge: 200,
      accessorialCharges: 150,
      totalCharges: 2850,
      paymentTerms: 'collect',
      billTo: 'consignee'
    },
    createdBy: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  },
  {
    id: '2',
    bolNumber: 'BOL-2025-000002',
    status: 'assigned',
    shipper: {
      id: '4',
      companyName: 'Tech Solutions Corp',
      contactName: 'Sarah Wilson',
      email: 'sarah@techsolutions.com',
      phone: '555-0404',
      address: {
        street: '321 Tech Park Dr',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        country: 'USA'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    consignee: {
      id: '5',
      companyName: 'West Coast Electronics',
      contactName: 'David Chen',
      email: 'david@westcoast.com',
      phone: '555-0505',
      address: {
        street: '654 Silicon Valley Rd',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'USA'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    carrier: {
      id: '3',
      companyName: 'Swift Transport LLC',
      contactName: 'Mike Johnson',
      email: 'mike@swifttransport.com',
      phone: '555-0303',
      address: {
        street: '789 Logistics Way',
        city: 'Atlanta',
        state: 'GA',
        zipCode: '30301',
        country: 'USA'
      },
      dotNumber: 'DOT789012',
      mcNumber: 'MC123456',
      scacCode: 'SWFT',
      insurancePolicy: 'Policy #SW-7890-2025, $1,000,000 Liability',
      licenseNumber: 'GA-TL-789012',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    cargoItems: [
      {
        id: '2',
        description: 'Server Equipment',
        quantity: 20,
        unit: 'units',
        weight: 1200,
        value: 125000,
        packaging: 'Original Boxes',
        hazmat: false
      }
    ],
    totalWeight: 1200,
    totalValue: 125000,
    pickupDate: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
    freightCharges: {
      baseRate: 1800,
      fuelSurcharge: 150,
      accessorialCharges: 100,
      totalCharges: 2050,
      paymentTerms: 'prepaid',
      billTo: 'shipper'
    },
    createdBy: '2',
    assignedDriver: {
      id: '1',
      name: 'Tom Rodriguez',
      licenseNumber: 'CDL123456789',
      phone: '555-0606',
      email: 'tom@swifttransport.com',
      vehicleInfo: {
        tractorNumber: 'TRC-001',
        trailerNumber: 'TRL-001',
        make: 'Freightliner',
        model: 'Cascadia',
        year: 2022,
        licenseePlate: 'ABC-123'
      }
    },
    createdAt: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
    updatedAt: new Date().toISOString(),
    version: 2
  }
];

let bolCounter = 3;

// Helper function to generate BoL number
const generateBoLNumber = () => {
  const year = new Date().getFullYear();
  const number = String(bolCounter++).padStart(6, '0');
  return `BOL-${year}-${number}`;
};

// BoL CRUD endpoints

// Get all BoLs with filtering and pagination
app.get('/api/v1/bol', authenticate, (req, res) => {
  console.log('Get BoLs request:', req.query);

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status;
  const search = req.query.search;

  let filteredBols = [...bols];

  // Filter by status
  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    filteredBols = filteredBols.filter(bol => statusArray.includes(bol.status));
  }

  // Search functionality
  if (search) {
    const searchLower = search.toLowerCase();
    filteredBols = filteredBols.filter(bol =>
      bol.bolNumber.toLowerCase().includes(searchLower) ||
      bol.shipper.companyName.toLowerCase().includes(searchLower) ||
      bol.consignee.companyName.toLowerCase().includes(searchLower)
    );
  }

  // Role-based filtering
  if (req.user.roles.includes('carrier') && !req.user.roles.includes('admin')) {
    filteredBols = filteredBols.filter(bol => (bol.carrier && bol.carrier.id === req.user.id) || bol.createdBy === req.user.id);
  } else if (req.user.roles.includes('shipper') && !req.user.roles.includes('admin')) {
    filteredBols = filteredBols.filter(bol => (bol.shipper && bol.shipper.id === req.user.id) || bol.createdBy === req.user.id);
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedBols = filteredBols.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      bols: paginatedBols,
      pagination: {
        page,
        limit,
        total: filteredBols.length,
        totalPages: Math.ceil(filteredBols.length / limit)
      }
    }
  });
});

// Get specific BoL
app.get('/api/v1/bol/:id', authenticate, (req, res) => {
  const bol = bols.find(b => b.id === req.params.id);

  if (!bol) {
    return res.status(404).json({
      success: false,
      message: 'BoL not found'
    });
  }

  res.json({
    success: true,
    data: bol
  });
});

// Create new BoL
app.post('/api/v1/bol', authenticate, (req, res) => {
  console.log('Create BoL request:', req.body);

  const newBoL = {
    id: String(bolCounter),
    bolNumber: generateBoLNumber(),
    status: 'pending',
    ...req.body,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  };

  // Calculate totals
  newBoL.totalWeight = newBoL.cargoItems.reduce((sum, item) => sum + item.weight, 0);
  newBoL.totalValue = newBoL.cargoItems.reduce((sum, item) => sum + item.value, 0);

  bols.push(newBoL);

  res.status(201).json({
    success: true,
    data: newBoL,
    message: 'BoL created successfully'
  });
});

// Update BoL
app.put('/api/v1/bol/:id', authenticate, (req, res) => {
  const bolIndex = bols.findIndex(b => b.id === req.params.id);

  if (bolIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'BoL not found'
    });
  }

  const existingBoL = bols[bolIndex];

  // Role-based update permissions
  const canUpdate = req.user.roles.includes('admin') ||
                   req.user.roles.includes('carrier') ||
                   existingBoL.createdBy === req.user.id;

  if (!canUpdate) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to update this BoL'
    });
  }

  const updatedBoL = {
    ...existingBoL,
    ...req.body,
    updatedAt: new Date().toISOString(),
    version: existingBoL.version + 1
  };

  // Recalculate totals if cargo items changed
  if (req.body.cargoItems) {
    updatedBoL.totalWeight = updatedBoL.cargoItems.reduce((sum, item) => sum + item.weight, 0);
    updatedBoL.totalValue = updatedBoL.cargoItems.reduce((sum, item) => sum + item.value, 0);
  }

  bols[bolIndex] = updatedBoL;

  res.json({
    success: true,
    data: updatedBoL,
    message: 'BoL updated successfully'
  });
});

// Update BoL status
app.patch('/api/v1/bol/:id/status', authenticate, async (req, res) => {
  const bolIndex = bols.findIndex(b => b.id === req.params.id);

  if (bolIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'BoL not found'
    });
  }

  const { status, notes } = req.body;
  const existingBoL = bols[bolIndex];

  // Status transition validation
  const validTransitions = {
    'pending': ['approved'],
    'approved': ['assigned'],
    'assigned': ['accepted'],
    'accepted': ['picked_up'],
    'picked_up': ['en_route'],
    'en_route': ['delivered'],
    'delivered': ['unpaid'],
    'unpaid': ['paid']
  };

  if (!validTransitions[existingBoL.status]?.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status transition from ${existingBoL.status} to ${status}`
    });
  }

  const updatedBoL = {
    ...existingBoL,
    status,
    updatedAt: new Date().toISOString(),
    version: existingBoL.version + 1
  };

  // Add note if provided
  if (notes) {
    if (!updatedBoL.notes) updatedBoL.notes = [];
    updatedBoL.notes.push({
      id: String(Date.now()),
      content: notes,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      noteType: 'status_change'
    });
  }

  // Blockchain integration
  try {
    if (existingBoL.status === 'pending' && status === 'approved') {
      // First time approval - create BoL on blockchain
      console.log('Creating BoL on blockchain:', updatedBoL.bolNumber);
      const blockchainBoL = await fabricService.createApprovedBoL(updatedBoL);
      console.log('BoL created on blockchain with txId:', blockchainBoL.blockchainTxId);
      updatedBoL.blockchainTxId = blockchainBoL.blockchainTxId;
    } else if (existingBoL.status !== 'pending') {
      // Check if BoL exists on blockchain
      try {
        await fabricService.getBoL(updatedBoL.bolNumber);
        // BoL exists, update it
        console.log('Updating BoL status on blockchain:', updatedBoL.bolNumber, '→', status);
        const blockchainBoL = await fabricService.updateBoLStatus(
          updatedBoL.bolNumber,
          status,
          req.user.email,
          notes || `Status updated to ${status}`
        );
        console.log('BoL status updated on blockchain, version:', blockchainBoL.version);
      } catch (notFoundError) {
        // BoL doesn't exist on blockchain yet, create it first
        console.log('BoL not found on blockchain, creating it now:', updatedBoL.bolNumber);
        const blockchainBoL = await fabricService.createApprovedBoL(updatedBoL);
        console.log('BoL created on blockchain with txId:', blockchainBoL.blockchainTxId);
        updatedBoL.blockchainTxId = blockchainBoL.blockchainTxId;
      }
    }
  } catch (blockchainError) {
    console.error('Blockchain operation failed:', blockchainError.message);
    // Continue with local update even if blockchain fails
    // In production, you might want to queue this for retry
  }

  bols[bolIndex] = updatedBoL;

  res.json({
    success: true,
    data: updatedBoL,
    message: `BoL status updated to ${status}`
  });
});

// Delete BoL (soft delete by changing status)
app.delete('/api/v1/bol/:id', authenticate, (req, res) => {
  const bolIndex = bols.findIndex(b => b.id === req.params.id);

  if (bolIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'BoL not found'
    });
  }

  const existingBoL = bols[bolIndex];

  // Only admin or creator can delete
  if (!req.user.roles.includes('admin') && existingBoL.createdBy !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to delete this BoL'
    });
  }

  // Only allow deletion if status is pending
  if (existingBoL.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Can only delete BoLs in pending status'
    });
  }

  bols.splice(bolIndex, 1);

  res.json({
    success: true,
    message: 'BoL deleted successfully'
  });
});

// Get BoL statistics
app.get('/api/v1/bol/stats', authenticate, (req, res) => {
  let userBols = bols;

  // Filter by user role
  if (!req.user.roles.includes('admin')) {
    if (req.user.roles.includes('carrier')) {
      userBols = bols.filter(bol => bol.carrier.id === req.user.id);
    } else if (req.user.roles.includes('shipper')) {
      userBols = bols.filter(bol => bol.shipper.id === req.user.id);
    }
  }

  const stats = {
    total: userBols.length,
    byStatus: {
      pending: userBols.filter(b => b.status === 'pending').length,
      approved: userBols.filter(b => b.status === 'approved').length,
      assigned: userBols.filter(b => b.status === 'assigned').length,
      accepted: userBols.filter(b => b.status === 'accepted').length,
      picked_up: userBols.filter(b => b.status === 'picked_up').length,
      en_route: userBols.filter(b => b.status === 'en_route').length,
      delivered: userBols.filter(b => b.status === 'delivered').length,
      unpaid: userBols.filter(b => b.status === 'unpaid').length,
      paid: userBols.filter(b => b.status === 'paid').length,
    },
    totalValue: userBols.reduce((sum, bol) => sum + bol.totalValue, 0),
    totalWeight: userBols.reduce((sum, bol) => sum + bol.totalWeight, 0)
  };

  res.json({
    success: true,
    data: stats
  });
});

// PDF Generation endpoints
const pdfService = require('./services/pdfService');

// Generate PDF from BoL data
app.post('/api/v1/pdf/generate', authenticate, async (req, res) => {
  console.log('PDF generation request:', req.body);

  const { bolData } = req.body;

  if (!bolData || !bolData.bolNumber) {
    return res.status(400).json({
      success: false,
      error: 'Valid BoL data with BoL number is required'
    });
  }

  try {
    // Use the professional PDF service
    const pdfResult = await pdfService.generateBoLPDF(bolData, {
      priority: 'normal',
      includeBlockchainVerification: true
    });

    res.json({
      success: true,
      message: 'Professional BoL PDF generated successfully',
      data: {
        bolNumber: bolData.bolNumber,
        filename: pdfResult.filename,
        filepath: pdfResult.filepath,
        size: pdfResult.size,
        generatedAt: pdfResult.generatedAt,
        downloadUrl: `/api/v1/pdf/download/${bolData.bolNumber}`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF',
      message: error.message
    });
  }
});

// Preview PDF endpoint
app.post('/api/v1/pdf/preview', authenticate, (req, res) => {
  console.log('PDF preview request:', req.body);

  const { bolData } = req.body;

  if (!bolData || !bolData.bolNumber) {
    return res.status(400).json({
      success: false,
      error: 'Valid BoL data with BoL number is required'
    });
  }

  // Mock PDF preview response
  res.json({
    success: true,
    message: 'PDF preview would be generated with real PDF service',
    data: {
      bolNumber: bolData.bolNumber,
      previewUrl: `/api/v1/pdf/preview/${bolData.bolNumber}`
    }
  });
});

// Get PDF from database BoL
app.get('/api/v1/pdf/bol/:bolNumber', authenticate, (req, res) => {
  const { bolNumber } = req.params;
  console.log('Database BoL PDF request:', bolNumber);

  const bol = bols.find(b => b.bolNumber === bolNumber);

  if (!bol) {
    return res.status(404).json({
      success: false,
      error: 'BoL not found'
    });
  }

  // Mock PDF generation from database BoL
  res.json({
    success: true,
    message: 'PDF would be generated from database BoL',
    data: {
      bolNumber: bol.bolNumber,
      filename: `BOL_${bol.bolNumber}_${Date.now()}.pdf`,
      bol: bol
    }
  });
});

// Admin cleanup endpoint
app.post('/api/v1/pdf/cleanup', authenticate, (req, res) => {
  console.log('PDF cleanup request by user:', req.user.email);

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  const maxAge = req.query.maxAge || 24;

  res.json({
    success: true,
    message: `Mock cleanup of files older than ${maxAge} hours completed`,
    data: {
      filesDeleted: 0,
      maxAgeHours: maxAge
    }
  });
});

// Test PDF generation endpoint - Phase 3 Week 9 Implementation
app.get('/api/v1/pdf/test', authenticate, async (req, res) => {
  console.log('PDF test generation request by user:', req.user.email);

  try {
    // Get first sample BoL for testing
    const testBoL = bols[0];

    // Use the professional PDF service
    const pdfResult = await pdfService.generateBoLPDF(testBoL, {
      priority: 'normal',
      includeBlockchainVerification: true
    });

    res.json({
      success: true,
      message: 'Professional BoL PDF generated successfully with Phase 3 enhancements',
      data: {
        bolNumber: testBoL.bolNumber,
        filename: pdfResult.filename,
        filepath: pdfResult.filepath,
        size: pdfResult.size,
        generatedAt: pdfResult.generatedAt,
        downloadUrl: `/api/v1/pdf/download/${testBoL.bolNumber}`,
        phase3Enhancements: {
          regulatoryCompliance: {
            scacCode: testBoL.carrier.scacCode,
            insurancePolicy: testBoL.carrier.insurancePolicy,
            licenseNumber: testBoL.carrier.licenseNumber
          },
          cargoDetails: {
            freightClass: testBoL.cargoItems[0].freightClass,
            handlingUnit: testBoL.cargoItems[0].handlingUnit,
            dimensions: testBoL.cargoItems[0].dimensions,
            specialInstructions: testBoL.cargoItems[0].specialInstructions
          },
          professionalFormatting: true,
          blockchainVerification: true
        }
      }
    });
  } catch (error) {
    console.error('Test PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test PDF',
      message: error.message
    });
  }
});

// Notification System Routes
// Mock notification database
const notifications = [
  {
    id: '1',
    userId: '2', // Carrier user
    type: 'bol_created',
    title: 'New BoL Assignment',
    message: 'New BoL #BOL-2025-000123 assigned from Acme Shipping',
    relatedBoLId: 'bol_123',
    relatedBoLNumber: 'BOL-2025-000123',
    priority: 'high',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    createdBy: {
      id: '3',
      name: 'Sarah Shipper',
      email: 'shipper@loadblock.io',
      role: 'shipper'
    }
  },
  {
    id: '2',
    userId: '3', // Shipper user
    type: 'bol_rejected',
    title: 'BoL Rejected',
    message: 'BoL #BOL-2025-000124 rejected by FastTrack Cargo: Missing unit weight for cargo item 2',
    relatedBoLId: 'bol_124',
    relatedBoLNumber: 'BOL-2025-000124',
    priority: 'high',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    createdBy: {
      id: '2',
      name: 'John Carrier',
      email: 'carrier@loadblock.io',
      role: 'carrier'
    },
    metadata: { rejectionReason: 'Missing unit weight for cargo item 2' }
  },
  {
    id: '3',
    userId: '3', // Shipper user
    type: 'status_updated',
    title: 'BoL Status Updated',
    message: 'BoL #BOL-2025-000125 status changed from pending to approved',
    relatedBoLId: 'bol_125',
    relatedBoLNumber: 'BOL-2025-000125',
    priority: 'medium',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    createdBy: {
      id: '2',
      name: 'John Carrier',
      email: 'carrier@loadblock.io',
      role: 'carrier'
    }
  },
  {
    id: '4',
    userId: '1', // Admin user
    type: 'system_message',
    title: 'System Update',
    message: 'LoadBlock notification system is now active',
    priority: 'low',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  }
];

// Get notifications for authenticated user
app.get('/api/v1/notifications', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const unreadOnly = req.query.unreadOnly === 'true';
  const type = req.query.type;
  const since = req.query.since;

  console.log('Get notifications request:', { userId: req.user.id, page, limit, unreadOnly, type, since });

  // Filter notifications for current user
  let userNotifications = notifications.filter(n => n.userId === req.user.id);

  // Apply filters
  if (unreadOnly) {
    userNotifications = userNotifications.filter(n => !n.isRead);
  }

  if (type) {
    userNotifications = userNotifications.filter(n => n.type === type);
  }

  if (since) {
    const sinceDate = new Date(since);
    userNotifications = userNotifications.filter(n => new Date(n.createdAt) > sinceDate);
  }

  // Sort by created date (newest first)
  userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedNotifications = userNotifications.slice(startIndex, endIndex);

  const totalCount = userNotifications.length;
  const unreadCount = notifications.filter(n => n.userId === req.user.id && !n.isRead).length;

  res.json({
    success: true,
    notifications: paginatedNotifications,
    totalCount,
    unreadCount,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    }
  });
});

// Get notification statistics
app.get('/api/v1/notifications/stats', authenticate, (req, res) => {
  const userNotifications = notifications.filter(n => n.userId === req.user.id);
  const unreadNotifications = userNotifications.filter(n => !n.isRead);

  const byType = {};
  const byPriority = {};

  userNotifications.forEach(n => {
    byType[n.type] = (byType[n.type] || 0) + 1;
    byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
  });

  res.json({
    success: true,
    stats: {
      total: userNotifications.length,
      unread: unreadNotifications.length,
      byType,
      byPriority
    }
  });
});

// Mark notifications as read
app.post('/api/v1/notifications/mark-read', authenticate, (req, res) => {
  const { notificationIds } = req.body;

  console.log('Mark as read request:', { userId: req.user.id, notificationIds });

  if (!Array.isArray(notificationIds)) {
    return res.status(400).json({
      success: false,
      error: 'notificationIds must be an array'
    });
  }

  // Update notifications
  let updatedCount = 0;
  notifications.forEach(notification => {
    if (notification.userId === req.user.id && notificationIds.includes(notification.id)) {
      notification.isRead = true;
      updatedCount++;
    }
  });

  res.json({
    success: true,
    message: `Marked ${updatedCount} notifications as read`,
    updatedCount
  });
});

// Mark all notifications as read
app.post('/api/v1/notifications/mark-all-read', authenticate, (req, res) => {
  console.log('Mark all as read request:', { userId: req.user.id });

  let updatedCount = 0;
  notifications.forEach(notification => {
    if (notification.userId === req.user.id && !notification.isRead) {
      notification.isRead = true;
      updatedCount++;
    }
  });

  res.json({
    success: true,
    message: `Marked ${updatedCount} notifications as read`,
    updatedCount
  });
});

// Delete notification
app.delete('/api/v1/notifications/:id', authenticate, (req, res) => {
  const notificationId = req.params.id;

  console.log('Delete notification request:', { userId: req.user.id, notificationId });

  const notificationIndex = notifications.findIndex(
    n => n.id === notificationId && n.userId === req.user.id
  );

  if (notificationIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found'
    });
  }

  notifications.splice(notificationIndex, 1);

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

// Create notification (for system use)
app.post('/api/v1/notifications', authenticate, (req, res) => {
  const { targetUserIds, type, title, message, relatedBoLId, relatedBoLNumber, priority, metadata } = req.body;

  console.log('Create notification request:', {
    createdBy: req.user.id,
    targetUserIds,
    type,
    title
  });

  if (!targetUserIds || !Array.isArray(targetUserIds) || !type || !title || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: targetUserIds, type, title, message'
    });
  }

  const newNotifications = targetUserIds.map(userId => ({
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title,
    message,
    relatedBoLId,
    relatedBoLNumber,
    priority: priority || 'medium',
    isRead: false,
    createdAt: new Date().toISOString(),
    createdBy: {
      id: req.user.id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      role: req.user.roles[0]
    },
    metadata
  }));

  // Add to notifications array
  notifications.push(...newNotifications);

  res.json({
    success: true,
    message: `Created ${newNotifications.length} notifications`,
    notifications: newNotifications
  });
});

// Simple test endpoint
app.get('/api/v1/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ status: 'ok', message: 'Server is working' });
  console.log('Test response sent');
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock LoadBlock API server running on port ${PORT}`);
  console.log(`Environment: development-mock`);
  console.log('Test users:');
  console.log('- admin@loadblock.io / 12345678 (Admin)');
  console.log('- carrier@loadblock.io / 12345678 (Carrier)');
  console.log('- shipper@loadblock.io / 12345678 (Shipper)');
  console.log('- broker@loadblock.io / 12345678 (Broker)');
  console.log('- consignee@loadblock.io / 12345678 (Consignee)');
  console.log('');
  console.log('BoL API endpoints:');
  console.log('- GET /api/v1/bol - List BoLs with filtering');
  console.log('- GET /api/v1/bol/:id - Get specific BoL');
  console.log('- POST /api/v1/bol - Create new BoL');
  console.log('- PUT /api/v1/bol/:id - Update BoL');
  console.log('- PATCH /api/v1/bol/:id/status - Update BoL status');
  console.log('- DELETE /api/v1/bol/:id - Delete BoL');
  console.log('- GET /api/v1/bol/stats - Get BoL statistics');
  console.log('');
  console.log('PDF API endpoints:');
  console.log('- POST /api/v1/pdf/generate - Generate PDF from BoL data');
  console.log('- POST /api/v1/pdf/preview - Preview PDF from BoL data');
  console.log('- GET /api/v1/pdf/bol/:bolNumber - Generate PDF from database BoL');
  console.log('- POST /api/v1/pdf/cleanup - Admin cleanup of temp files');
  console.log('');
  console.log('Notification API endpoints:');
  console.log('- GET /api/v1/notifications - Get user notifications');
  console.log('- GET /api/v1/notifications/stats - Get notification statistics');
  console.log('- POST /api/v1/notifications/mark-read - Mark notifications as read');
  console.log('- POST /api/v1/notifications/mark-all-read - Mark all as read');
  console.log('- DELETE /api/v1/notifications/:id - Delete notification');
  console.log('- POST /api/v1/notifications - Create notification');
});