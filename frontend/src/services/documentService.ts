import { authService } from './authService';

export interface DocumentVersion {
  id: string;
  bolId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changeType: 'created' | 'updated' | 'status_changed' | 'pdf_regenerated' | 'signed';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  fileSize?: number;
  fileHash?: string;
  notes?: string;
  ipfsHash?: string;
  blockchainTxId?: string;
}

export interface DocumentExportOptions {
  format: 'pdf' | 'csv' | 'excel' | 'json';
  includeVersionHistory: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  fields?: string[];
}

export interface BulkOperation {
  id: string;
  type: 'export' | 'archive' | 'delete' | 'update_status';
  targetDocuments: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DocumentSearchFilters {
  query?: string;
  bolNumbers?: string[];
  statuses?: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  shippers?: string[];
  carriers?: string[];
  consignees?: string[];
  valueRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  archived?: boolean;
}

export interface DocumentSearchResult {
  documents: any[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  facets: {
    statuses: { [key: string]: number };
    carriers: { [key: string]: number };
    shippers: { [key: string]: number };
  };
}

class DocumentService {
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = authService.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Document Version History
  async getDocumentVersions(bolId: string): Promise<DocumentVersion[]> {
    try {
      const response = await this.makeRequest(`/api/v1/documents/${bolId}/versions`);
      return response.data.versions;
    } catch (error) {
      console.error('Failed to fetch document versions:', error);
      // Return mock data for development
      return this.getMockVersions(bolId);
    }
  }

  async getVersionDetails(bolId: string, version: number): Promise<DocumentVersion> {
    try {
      const response = await this.makeRequest(`/api/v1/documents/${bolId}/versions/${version}`);
      return response.data.version;
    } catch (error) {
      console.error('Failed to fetch version details:', error);
      throw error;
    }
  }

  async compareVersions(bolId: string, fromVersion: number, toVersion: number): Promise<any> {
    try {
      const response = await this.makeRequest(
        `/api/v1/documents/${bolId}/versions/compare?from=${fromVersion}&to=${toVersion}`
      );
      return response.data.comparison;
    } catch (error) {
      console.error('Failed to compare versions:', error);
      throw error;
    }
  }

  // Document Search and Filtering
  async searchDocuments(
    filters: DocumentSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<DocumentSearchResult> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            typeof value === 'object' ? JSON.stringify(value) : value
          ])
        )
      });

      const response = await this.makeRequest(`/api/v1/documents/search?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Failed to search documents:', error);
      return this.getMockSearchResults(filters, page, limit);
    }
  }

  async getDocumentTags(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/api/v1/documents/tags');
      return response.data.tags;
    } catch (error) {
      console.error('Failed to fetch document tags:', error);
      return ['urgent', 'hazmat', 'fragile', 'high-value', 'expedited'];
    }
  }

  // Export Operations
  async exportDocuments(
    documentIds: string[],
    options: DocumentExportOptions
  ): Promise<BulkOperation> {
    try {
      const response = await this.makeRequest('/api/v1/documents/export', {
        method: 'POST',
        body: JSON.stringify({ documentIds, options }),
      });
      return response.data.operation;
    } catch (error) {
      console.error('Failed to start document export:', error);
      throw error;
    }
  }

  async downloadExport(operationId: string): Promise<Blob> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${this.baseURL}/api/v1/documents/export/${operationId}/download`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to download export:', error);
      throw error;
    }
  }

  // Bulk Operations
  async startBulkOperation(
    type: BulkOperation['type'],
    documentIds: string[],
    options?: any
  ): Promise<BulkOperation> {
    try {
      const response = await this.makeRequest('/api/v1/documents/bulk', {
        method: 'POST',
        body: JSON.stringify({ type, documentIds, options }),
      });
      return response.data.operation;
    } catch (error) {
      console.error('Failed to start bulk operation:', error);
      throw error;
    }
  }

  async getBulkOperationStatus(operationId: string): Promise<BulkOperation> {
    try {
      const response = await this.makeRequest(`/api/v1/documents/bulk/${operationId}`);
      return response.data.operation;
    } catch (error) {
      console.error('Failed to get bulk operation status:', error);
      throw error;
    }
  }

  async cancelBulkOperation(operationId: string): Promise<void> {
    try {
      await this.makeRequest(`/api/v1/documents/bulk/${operationId}/cancel`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to cancel bulk operation:', error);
      throw error;
    }
  }

  // Archive Operations
  async archiveDocuments(documentIds: string[], reason?: string): Promise<BulkOperation> {
    return this.startBulkOperation('archive', documentIds, { reason });
  }

  async getArchivedDocuments(
    page: number = 1,
    limit: number = 20
  ): Promise<DocumentSearchResult> {
    return this.searchDocuments({ archived: true }, page, limit);
  }

  async restoreDocuments(documentIds: string[]): Promise<BulkOperation> {
    try {
      const response = await this.makeRequest('/api/v1/documents/restore', {
        method: 'POST',
        body: JSON.stringify({ documentIds }),
      });
      return response.data.operation;
    } catch (error) {
      console.error('Failed to restore documents:', error);
      throw error;
    }
  }

  // Performance Optimizations
  async getDocumentStatistics(): Promise<any> {
    try {
      const response = await this.makeRequest('/api/v1/documents/statistics');
      return response.data.statistics;
    } catch (error) {
      console.error('Failed to fetch document statistics:', error);
      return {
        totalDocuments: 1245,
        archivedDocuments: 156,
        totalSize: '2.4 GB',
        avgProcessingTime: '1.2s',
        indexingProgress: 100
      };
    }
  }

  // Mock Data Methods for Development
  private getMockVersions(bolId: string): DocumentVersion[] {
    return [
      {
        id: `version-${bolId}-3`,
        bolId,
        version: 3,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdBy: 'carrier@example.com',
        changeType: 'status_changed',
        changes: [
          {
            field: 'status',
            oldValue: 'picked_up',
            newValue: 'en_route'
          }
        ],
        fileSize: 245760,
        fileHash: 'sha256:abc123...',
        notes: 'Status updated to en route',
        blockchainTxId: '0x123456789abcdef'
      },
      {
        id: `version-${bolId}-2`,
        bolId,
        version: 2,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        createdBy: 'carrier@example.com',
        changeType: 'status_changed',
        changes: [
          {
            field: 'status',
            oldValue: 'assigned',
            newValue: 'picked_up'
          }
        ],
        fileSize: 245760,
        fileHash: 'sha256:def456...',
        notes: 'Cargo picked up from shipper location'
      },
      {
        id: `version-${bolId}-1`,
        bolId,
        version: 1,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'shipper@example.com',
        changeType: 'created',
        changes: [
          {
            field: 'document',
            oldValue: null,
            newValue: 'Initial BoL creation'
          }
        ],
        fileSize: 234567,
        fileHash: 'sha256:789abc...',
        notes: 'Initial BoL creation and PDF generation'
      }
    ];
  }

  private getMockSearchResults(
    filters: DocumentSearchFilters,
    page: number,
    limit: number
  ): DocumentSearchResult {
    // Mock search implementation
    const mockDocuments = Array.from({ length: limit }, (_, i) => ({
      id: `bol-search-${page}-${i}`,
      bolNumber: `BOL-2024-${String(1000 + page * limit + i).padStart(6, '0')}`,
      status: ['pending', 'approved', 'en_route', 'delivered'][i % 4],
      shipper: { companyName: `Shipper Company ${i + 1}` },
      carrier: { companyName: `Carrier Corp ${i + 1}` },
      consignee: { companyName: `Consignee LLC ${i + 1}` },
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      totalValue: Math.floor(Math.random() * 100000) + 10000,
      archived: filters.archived || false
    }));

    return {
      documents: mockDocuments,
      totalCount: 1245,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(1245 / limit)
      },
      facets: {
        statuses: { pending: 45, approved: 23, en_route: 67, delivered: 890 },
        carriers: { 'Fast Transport': 234, 'Reliable Logistics': 156, 'Express Delivery': 123 },
        shippers: { 'Manufacturing Inc': 345, 'Tech Corp': 234, 'Auto Parts': 187 }
      }
    };
  }
}

export const documentService = new DocumentService();