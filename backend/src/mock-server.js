const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'mock-jwt-secret-for-testing';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
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
  }
];

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      roles: user.roles
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
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
  if (!user || password !== '12345678') {
    return res.status(400).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const token = generateToken(user);
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
  res.cookie('refreshToken', 'mock-refresh-token', {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    data: {
      user: userResponse,
      token
    },
    message: 'Login successful'
  });
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

// Start server
app.listen(PORT, () => {
  console.log(`Mock LoadBlock API server running on port ${PORT}`);
  console.log(`Environment: development-mock`);
  console.log('Test users:');
  console.log('- admin@loadblock.io / 12345678 (Admin)');
  console.log('- carrier@loadblock.io / 12345678 (Carrier)');
});