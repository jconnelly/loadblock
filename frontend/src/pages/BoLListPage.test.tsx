import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import BoLListPage from './BoLListPage';
import theme from '../theme';
import { AuthProvider } from '../hooks/useAuth';
import { bolService } from '../services/bolService';

// Mock the BoL service
vi.mock('../services/bolService', () => ({
  bolService: {
    getBols: vi.fn(),
    getBolStats: vi.fn(),
  },
}));

// Mock the useAuth hook
const mockUser = {
  id: '1',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: ['admin'],
  isActive: true,
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the AppLayout component
vi.mock('../components/layout/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

const mockBoLs = [
  {
    id: 'bol-1',
    bolNumber: 'BOL-2024-000001',
    status: 'pending',
    shipper: {
      id: '1',
      companyName: 'Shipper Co',
      address: { city: 'Anytown', state: 'CA' },
    },
    consignee: {
      id: '2',
      companyName: 'Consignee Co',
      address: { city: 'Another City', state: 'TX' },
    },
    pickupDate: '2024-01-15',
    totalValue: 5000,
    totalWeight: 1000,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'bol-2',
    bolNumber: 'BOL-2024-000002',
    status: 'approved',
    shipper: {
      id: '3',
      companyName: 'Another Shipper',
      address: { city: 'Shipping City', state: 'NY' },
    },
    consignee: {
      id: '4',
      companyName: 'Another Consignee',
      address: { city: 'Delivery City', state: 'FL' },
    },
    pickupDate: '2024-01-20',
    totalValue: 7500,
    totalWeight: 1500,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockStats = {
  total: 2,
  byStatus: {
    pending: 1,
    approved: 1,
    assigned: 0,
    accepted: 0,
    picked_up: 0,
    en_route: 0,
    delivered: 0,
    unpaid: 0,
    paid: 0,
  },
  totalValue: 12500,
  totalWeight: 2500,
};

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <BoLListPage />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

describe('BoLListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (bolService.getBols as any).mockResolvedValue({
      bols: mockBoLs,
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 2,
      },
    });

    (bolService.getBolStats as any).mockResolvedValue(mockStats);
  });

  it('should render the page title', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bills of Lading')).toBeInTheDocument();
    });
  });

  it('should display statistics cards', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Total BoLs')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Total Value')).toBeInTheDocument();
      expect(screen.getByText('$12,500')).toBeInTheDocument();
      expect(screen.getByText('Total Weight')).toBeInTheDocument();
      expect(screen.getByText('2,500 lbs')).toBeInTheDocument();
    });
  });

  it('should display BoL list in table format', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('BOL-2024-000001')).toBeInTheDocument();
      expect(screen.getByText('BOL-2024-000002')).toBeInTheDocument();
      expect(screen.getByText('Shipper Co')).toBeInTheDocument();
      expect(screen.getByText('Consignee Co')).toBeInTheDocument();
    });
  });

  it('should show create BoL button for authorized users', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Create BoL')).toBeInTheDocument();
    });
  });

  it('should not show create BoL button for unauthorized users', async () => {
    const unauthorizedUser = { ...mockUser, roles: ['carrier'] };

    vi.mocked(vi.importActual('../hooks/useAuth')).useAuth = () => ({
      user: unauthorizedUser,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      loading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('Create BoL')).not.toBeInTheDocument();
    });
  });

  it('should handle search input', async () => {
    renderComponent();

    await waitFor(() => {
      const searchInput = screen.getByLabelText('Search BoLs');
      fireEvent.change(searchInput, { target: { value: 'BOL-2024-000001' } });

      expect(searchInput).toHaveValue('BOL-2024-000001');
    });
  });

  it('should handle status filter', async () => {
    renderComponent();

    await waitFor(() => {
      const statusFilter = screen.getByLabelText('Status Filter');
      fireEvent.mouseDown(statusFilter);
    });

    await waitFor(() => {
      const pendingOption = screen.getByText('Pending');
      fireEvent.click(pendingOption);
    });

    expect(bolService.getBols).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ['pending'],
      })
    );
  });

  it('should display loading state', () => {
    (bolService.getBols as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error state', async () => {
    (bolService.getBols as any).mockRejectedValue(new Error('Failed to fetch BoLs'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch BoLs')).toBeInTheDocument();
    });
  });

  it('should display empty state when no BoLs found', async () => {
    (bolService.getBols as any).mockResolvedValue({
      bols: [],
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 0,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No Bills of Lading found')).toBeInTheDocument();
    });
  });

  it('should handle pagination', async () => {
    (bolService.getBols as any).mockResolvedValue({
      bols: mockBoLs,
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 3,
        totalItems: 25,
      },
    });

    renderComponent();

    await waitFor(() => {
      const pagination = screen.getByRole('navigation');
      expect(pagination).toBeInTheDocument();
    });
  });

  it('should format currency correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('$5,000')).toBeInTheDocument();
      expect(screen.getByText('$7,500')).toBeInTheDocument();
    });
  });

  it('should format weight correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('1,000 lbs')).toBeInTheDocument();
      expect(screen.getByText('1,500 lbs')).toBeInTheDocument();
    });
  });

  it('should format dates correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
      expect(screen.getByText('1/20/2024')).toBeInTheDocument();
    });
  });

  it('should display status chips with correct colors', async () => {
    renderComponent();

    await waitFor(() => {
      const pendingChip = screen.getByText('Pending');
      const approvedChip = screen.getByText('Approved');

      expect(pendingChip).toBeInTheDocument();
      expect(approvedChip).toBeInTheDocument();
    });
  });

  it('should show action buttons for each BoL row', async () => {
    renderComponent();

    await waitFor(() => {
      const viewButtons = screen.getAllByLabelText('View Details');
      expect(viewButtons).toHaveLength(2);
    });
  });

  it('should call getBols and getBolStats on component mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(bolService.getBols).toHaveBeenCalled();
      expect(bolService.getBolStats).toHaveBeenCalled();
    });
  });

  it('should refresh data when filters change', async () => {
    renderComponent();

    await waitFor(() => {
      const searchInput = screen.getByLabelText('Search BoLs');
      fireEvent.change(searchInput, { target: { value: 'test' } });
    });

    await waitFor(() => {
      expect(bolService.getBols).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test',
          page: 1,
        })
      );
    });
  });
});