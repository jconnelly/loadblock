# LoadBlock Development Standards

**Version:** 1.0
**Last Updated:** September 24, 2025
**Status:** Active

---

## Overview

This document establishes coding standards, development practices, and quality guidelines for the LoadBlock project to ensure consistency, maintainability, and high code quality across the entire development team.

## Table of Contents

1. [General Principles](#general-principles)
2. [Code Style & Formatting](#code-style--formatting)
3. [Git Workflow](#git-workflow)
4. [Testing Standards](#testing-standards)
5. [Documentation Requirements](#documentation-requirements)
6. [Security Guidelines](#security-guidelines)
7. [Performance Standards](#performance-standards)
8. [Code Review Process](#code-review-process)

---

## General Principles

### 1. Code Quality
- **Readability First**: Write code that tells a story
- **Single Responsibility**: Each function/class should have one clear purpose
- **DRY Principle**: Don't Repeat Yourself - extract common functionality
- **YAGNI**: You Aren't Gonna Need It - avoid over-engineering
- **Fail Fast**: Validate inputs early and provide clear error messages

### 2. Consistency
- Follow established patterns within the codebase
- Use consistent naming conventions across all components
- Maintain consistent file and folder structures
- Apply consistent error handling patterns

### 3. Maintainability
- Write self-documenting code with clear variable and function names
- Add comments for complex business logic, not obvious code
- Keep functions small and focused (max 50 lines recommended)
- Use meaningful commit messages that explain the "why"

---

## Code Style & Formatting

### JavaScript/TypeScript Standards

#### Naming Conventions
```javascript
// Variables and functions: camelCase
const userName = 'john_doe';
const calculateTotalWeight = (items) => { ... };

// Constants: UPPER_SNAKE_CASE
const MAX_CARGO_WEIGHT = 80000;
const API_BASE_URL = 'https://api.loadblock.io';

// Classes and Components: PascalCase
class BillOfLading { ... }
const UserDashboard = () => { ... };

// Private methods: underscore prefix
class BolService {
  _validateBoLData(data) { ... }
}

// Boolean variables: descriptive prefixes
const isAuthenticated = true;
const hasPermission = false;
const canUpdateStatus = user.role === 'carrier';
```

#### Function Structure
```javascript
// Good: Clear, single responsibility
const createBoL = async (bolData, userRoles) => {
  validateBolData(bolData);
  const pdf = await generateBoLPDF(bolData);
  const ipfsHash = await uploadToIPFS(pdf);
  return await saveBolToBlockchain(bolData, ipfsHash);
};

// Bad: Multiple responsibilities, unclear purpose
const processBoL = async (data, user) => {
  // Mixed validation, business logic, and side effects
};
```

#### Error Handling
```javascript
// Good: Specific error types with context
class BolValidationError extends Error {
  constructor(field, message) {
    super(`BoL validation failed for ${field}: ${message}`);
    this.name = 'BolValidationError';
    this.field = field;
  }
}

// Usage
if (!bolData.carrierInfo.name) {
  throw new BolValidationError('carrierInfo.name', 'Carrier name is required');
}

// Good: Proper async error handling
try {
  const result = await blockchainService.submitTransaction(data);
  return result;
} catch (error) {
  logger.error('Blockchain transaction failed', {
    error: error.message,
    bolId: data.bolId,
    userId: user.id
  });
  throw new BlockchainError('Transaction submission failed', error);
}
```

### React Component Standards

#### Component Structure
```jsx
// Good: Functional component with clear structure
import React, { useState, useEffect } from 'react';
import { Typography, Card, Button } from '@mui/material';
import { useBolContext } from '../context/BolContext';
import { validateBoLData } from '../utils/validation';

/**
 * BolForm component for creating and editing Bills of Lading
 * @param {Object} props - Component properties
 * @param {Object} props.initialData - Initial BoL data for editing
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {boolean} props.isEditing - Whether component is in edit mode
 */
const BolForm = ({ initialData = null, onSubmit, isEditing = false }) => {
  const [formData, setFormData] = useState(initialData || getDefaultFormData());
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { createBoL, updateBoL } = useBolContext();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateBoLData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const result = isEditing
        ? await updateBoL(formData.id, formData)
        : await createBoL(formData);

      onSubmit(result);
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      {/* Component JSX */}
    </Card>
  );
};

export default BolForm;
```

#### Hooks Usage
```jsx
// Good: Custom hooks for reusable logic
const useBoLValidation = (bolData) => {
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validationErrors = validateBoLData(bolData);
    setErrors(validationErrors);
    setIsValid(Object.keys(validationErrors).length === 0);
  }, [bolData]);

  return { errors, isValid };
};

// Usage in component
const { errors, isValid } = useBoLValidation(formData);
```

### CSS/Styling Standards

#### Material-UI Theme Usage
```javascript
// Theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#0D47A1', // LoadBlock Blue
    },
    secondary: {
      main: '#FF9800', // Orange accent
    },
    text: {
      primary: '#212121', // Dark gray
    },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
  },
});

// Component styling with sx prop
const StyledCard = (
  <Card
    sx={{
      p: 3,
      mb: 2,
      boxShadow: 2,
      '&:hover': {
        boxShadow: 4,
      },
    }}
  >
    Content
  </Card>
);
```

---

## Git Workflow

### Branch Strategy
```
main
├── develop
│   ├── feature/user-authentication
│   ├── feature/bol-creation-form
│   └── feature/status-workflow
├── release/v1.0.0
└── hotfix/security-patch
```

### Branch Naming
- **Features**: `feature/short-description` (e.g., `feature/user-authentication`)
- **Bug fixes**: `bugfix/short-description` (e.g., `bugfix/login-validation`)
- **Hotfixes**: `hotfix/short-description` (e.g., `hotfix/security-patch`)
- **Releases**: `release/version` (e.g., `release/v1.0.0`)

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): add JWT token refresh mechanism

- Implement automatic token refresh before expiration
- Add refresh token storage in httpOnly cookies
- Update API client to handle token refresh seamlessly

Closes #123

fix(bol): resolve status validation error

- Fix status transition validation logic
- Add proper error messages for invalid transitions
- Update tests to cover edge cases

Fixes #456
```

### Pull Request Guidelines

#### PR Template
```markdown
## Description
Brief description of changes and why they were made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Code is properly commented
- [ ] Documentation updated if needed
- [ ] No new warnings introduced
- [ ] All tests pass locally

## Related Issues
Closes #123
Relates to #456
```

---

## Testing Standards

### Test Coverage Requirements
- **Minimum Coverage**: 80% for all new code
- **Critical Paths**: 95% coverage for authentication, BoL creation, blockchain operations
- **Unit Tests**: All business logic functions
- **Integration Tests**: API endpoints and database operations
- **End-to-End Tests**: Critical user workflows

### Testing Structure

#### Backend Testing (Jest)
```javascript
// test/services/bolService.test.js
describe('BolService', () => {
  let bolService;
  let mockBlockchainService;
  let mockIPFSService;

  beforeEach(() => {
    mockBlockchainService = {
      submitTransaction: jest.fn(),
      queryLedger: jest.fn(),
    };
    mockIPFSService = {
      upload: jest.fn(),
      retrieve: jest.fn(),
    };

    bolService = new BolService(mockBlockchainService, mockIPFSService);
  });

  describe('createBoL', () => {
    it('should create BoL with valid data', async () => {
      // Arrange
      const bolData = createValidBoLData();
      const expectedIPFSHash = 'QmTest123';
      const expectedTransactionId = 'tx-123';

      mockIPFSService.upload.mockResolvedValue(expectedIPFSHash);
      mockBlockchainService.submitTransaction.mockResolvedValue(expectedTransactionId);

      // Act
      const result = await bolService.createBoL(bolData, ['carrier']);

      // Assert
      expect(result).toEqual({
        bolId: expect.any(String),
        transactionId: expectedTransactionId,
        ipfsHash: expectedIPFSHash,
      });
      expect(mockIPFSService.upload).toHaveBeenCalledWith(expect.any(Buffer));
      expect(mockBlockchainService.submitTransaction).toHaveBeenCalledWith(
        'createBoL',
        expect.objectContaining({ bolId: expect.any(String) }),
        expectedIPFSHash
      );
    });

    it('should throw error with invalid BoL data', async () => {
      // Arrange
      const invalidBolData = { /* missing required fields */ };

      // Act & Assert
      await expect(bolService.createBoL(invalidBolData, ['carrier']))
        .rejects
        .toThrow(BolValidationError);
    });
  });
});
```

#### Frontend Testing (React Testing Library)
```javascript
// src/components/__tests__/BolForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BolProvider } from '../../context/BolContext';
import BolForm from '../BolForm';

const renderWithContext = (component, contextValue = {}) => {
  return render(
    <BolProvider value={contextValue}>
      {component}
    </BolProvider>
  );
};

describe('BolForm', () => {
  const mockOnSubmit = jest.fn();
  const mockCreateBoL = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields correctly', () => {
    renderWithContext(
      <BolForm onSubmit={mockOnSubmit} />,
      { createBoL: mockCreateBoL }
    );

    expect(screen.getByLabelText(/carrier name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shipper name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/consignee name/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    mockCreateBoL.mockResolvedValue({ bolId: 'BOL-123' });

    renderWithContext(
      <BolForm onSubmit={mockOnSubmit} />,
      { createBoL: mockCreateBoL }
    );

    // Fill form
    await user.type(screen.getByLabelText(/carrier name/i), 'Test Carrier');
    await user.type(screen.getByLabelText(/shipper name/i), 'Test Shipper');
    await user.type(screen.getByLabelText(/consignee name/i), 'Test Consignee');

    // Submit form
    await user.click(screen.getByRole('button', { name: /create bol/i }));

    await waitFor(() => {
      expect(mockCreateBoL).toHaveBeenCalledWith(
        expect.objectContaining({
          carrierInfo: expect.objectContaining({ name: 'Test Carrier' }),
          shipperInfo: expect.objectContaining({ name: 'Test Shipper' }),
          consigneeInfo: expect.objectContaining({ name: 'Test Consignee' }),
        })
      );
    });
  });
});
```

---

## Documentation Requirements

### Code Documentation
- **Function Documentation**: Use JSDoc for all exported functions
- **Component Documentation**: Document props, usage, and examples
- **API Documentation**: OpenAPI/Swagger specifications
- **README Files**: Each major directory should have a README

### JSDoc Standards
```javascript
/**
 * Creates a new Bill of Lading and stores it on the blockchain
 * @async
 * @function createBoL
 * @param {Object} bolData - The BoL data object
 * @param {Object} bolData.carrierInfo - Carrier information
 * @param {string} bolData.carrierInfo.name - Carrier company name
 * @param {Object} bolData.shipperInfo - Shipper information
 * @param {Object} bolData.consigneeInfo - Consignee information
 * @param {Array<Object>} bolData.cargo - Cargo line items
 * @param {Array<string>} userRoles - User's roles for authorization
 * @returns {Promise<Object>} Promise that resolves to created BoL object
 * @throws {BolValidationError} When BoL data is invalid
 * @throws {BlockchainError} When blockchain transaction fails
 * @example
 * const bol = await createBoL({
 *   carrierInfo: { name: 'ABC Trucking' },
 *   shipperInfo: { name: 'XYZ Manufacturing' },
 *   consigneeInfo: { name: 'Retail Corp' },
 *   cargo: [{ description: 'Steel coils', weight: 2500 }]
 * }, ['carrier']);
 */
async function createBoL(bolData, userRoles) {
  // Implementation
}
```

---

## Security Guidelines

### Authentication & Authorization
- Always validate JWT tokens on protected routes
- Implement role-based access control (RBAC)
- Use httpOnly cookies for refresh tokens
- Implement proper session management

### Data Validation
```javascript
// Good: Input validation and sanitization
const validateBoLData = (bolData) => {
  const errors = {};

  // Required field validation
  if (!bolData.carrierInfo?.name?.trim()) {
    errors['carrierInfo.name'] = 'Carrier name is required';
  }

  // Data type validation
  if (bolData.cargo && !Array.isArray(bolData.cargo)) {
    errors.cargo = 'Cargo must be an array';
  }

  // Business rule validation
  if (bolData.cargo?.length === 0) {
    errors.cargo = 'At least one cargo item is required';
  }

  // Sanitization
  if (bolData.carrierInfo?.name) {
    bolData.carrierInfo.name = sanitizeString(bolData.carrierInfo.name);
  }

  return errors;
};
```

### Environment Variables
- Never commit secrets to repository
- Use environment variables for all sensitive data
- Validate required environment variables on startup

```javascript
// config/environment.js
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'BLOCKCHAIN_NETWORK_CONFIG'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
});
```

---

## Performance Standards

### Response Time Targets
- **API Endpoints**: < 500ms for 95th percentile
- **Database Queries**: < 100ms for simple queries
- **PDF Generation**: < 3 seconds
- **Blockchain Transactions**: < 30 seconds confirmation

### Optimization Guidelines
```javascript
// Good: Efficient database queries with pagination
const getBoLList = async (filters, pagination) => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const query = buildFilterQuery(filters);

  const [results, total] = await Promise.all([
    db.query(query + ' LIMIT ? OFFSET ?', [...query.params, limit, offset]),
    db.query('SELECT COUNT(*) as total FROM (' + query.sql + ') as count_query', query.params)
  ]);

  return {
    data: results,
    pagination: {
      page,
      limit,
      total: total[0].total,
      pages: Math.ceil(total[0].total / limit)
    }
  };
};

// Good: Caching for expensive operations
const getCachedBoLPDF = async (bolId) => {
  const cacheKey = `bol_pdf:${bolId}`;

  let pdf = await redis.get(cacheKey);
  if (!pdf) {
    pdf = await generateBoLPDF(bolId);
    await redis.setex(cacheKey, 3600, pdf); // Cache for 1 hour
  }

  return pdf;
};
```

---

## Code Review Process

### Review Checklist

#### Functionality
- [ ] Code works as intended and meets requirements
- [ ] Edge cases are handled appropriately
- [ ] Error handling is comprehensive and user-friendly
- [ ] Security considerations are addressed

#### Code Quality
- [ ] Code follows established style guidelines
- [ ] Functions are small and focused
- [ ] Variable and function names are descriptive
- [ ] Code is DRY and follows SOLID principles

#### Testing
- [ ] Adequate test coverage (minimum 80%)
- [ ] Tests are meaningful and test the right things
- [ ] Tests are maintainable and not brittle
- [ ] Integration tests cover critical paths

#### Documentation
- [ ] Public APIs are documented
- [ ] Complex business logic is explained
- [ ] README files are updated if needed
- [ ] Breaking changes are documented

### Review Guidelines for Reviewers
1. **Be Constructive**: Provide specific, actionable feedback
2. **Be Respectful**: Focus on the code, not the person
3. **Be Thorough**: Check for security, performance, and maintainability issues
4. **Be Timely**: Respond to review requests within 24 hours

### Review Guidelines for Authors
1. **Self-Review First**: Review your own code before requesting review
2. **Small PRs**: Keep pull requests focused and reasonably sized
3. **Clear Description**: Provide context and reasoning for changes
4. **Respond Promptly**: Address feedback quickly and thoroughly

---

## Tools and Configuration

### ESLint Configuration (.eslintrc.js)
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'react-app',
    'react-app/jest'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'max-len': ['error', { code: 100 }],
    'complexity': ['error', 10]
  }
};
```

### Prettier Configuration (.prettierrc)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

---

## Enforcement

These standards are enforced through:
1. **Automated Linting**: ESLint and Prettier in CI/CD pipeline
2. **Pre-commit Hooks**: Git hooks prevent commits that don't meet standards
3. **Code Review**: Required approvals before merging
4. **Quality Gates**: CI/CD pipeline fails if standards aren't met

---

**Document Owner:** LoadBlock Development Team
**Next Review Date:** October 24, 2025
**Approval Required:** Technical Lead, Senior Developers