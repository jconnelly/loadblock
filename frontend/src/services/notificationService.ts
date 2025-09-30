// Notification Service for Real-time User Notifications
import { authService } from './authService';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedBoLId?: string;
  relatedBoLNumber?: string;
  actionUrl?: string;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  metadata?: Record<string, any>;
}

export type NotificationType =
  | 'bol_created'
  | 'bol_updated'
  | 'bol_approved'
  | 'bol_rejected'
  | 'status_updated'
  | 'comment_added'
  | 'assignment_changed'
  | 'document_generated'
  | 'system_message';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationPreferences {
  enableInApp: boolean;
  enableEmail: boolean;
  enableSMS: boolean;
  notificationTypes: {
    [K in NotificationType]: {
      inApp: boolean;
      email: boolean;
      sms: boolean;
    };
  };
}

export interface CreateNotificationRequest {
  targetUserIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  relatedBoLId?: string;
  relatedBoLNumber?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

class NotificationService {
  private baseUrl = 'http://localhost:3001/api/v1';
  private listeners: Map<string, (notification: Notification) => void> = new Map();
  private webSocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Real-time WebSocket connection
  connectWebSocket() {
    const token = authService.getToken();
    if (!token) return;

    try {
      // WebSocket URL would be ws://localhost:3001/ws in production
      // For now, we'll simulate with polling
      this.startPolling();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.startPolling(); // Fallback to polling
    }
  }

  disconnectWebSocket() {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
    this.stopPolling();
  }

  // Polling fallback for development
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastNotificationCheck = new Date().toISOString();

  private startPolling() {
    this.pollingInterval = setInterval(async () => {
      try {
        const newNotifications = await this.getNotifications({
          since: this.lastNotificationCheck,
          unreadOnly: true
        });

        newNotifications.notifications.forEach(notification => {
          this.notifyListeners('notification_received', notification);
        });

        this.lastNotificationCheck = new Date().toISOString();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Event listeners for real-time notifications
  addEventListener(event: string, callback: (notification: Notification) => void) {
    this.listeners.set(event, callback);
  }

  removeEventListener(event: string) {
    this.listeners.delete(event);
  }

  private notifyListeners(event: string, notification: Notification) {
    const callback = this.listeners.get(event);
    if (callback) {
      callback(notification);
    }
  }

  // API methods
  async getNotifications(options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
    since?: string;
  } = {}): Promise<{
    notifications: Notification[];
    totalCount: number;
    unreadCount: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.unreadOnly) params.append('unreadOnly', 'true');
    if (options.type) params.append('type', options.type);
    if (options.since) params.append('since', options.since);

    const response = await fetch(`${this.baseUrl}/notifications?${params}`, {
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return response.json();
  }

  async getNotificationStats(): Promise<NotificationStats> {
    const response = await fetch(`${this.baseUrl}/notifications/stats`, {
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notification stats');
    }

    return response.json();
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/mark-read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark notifications as read');
    }
  }

  async markAllAsRead(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/mark-all-read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }
  }

  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    const response = await fetch(`${this.baseUrl}/notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to create notification');
    }

    return response.json();
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await fetch(`${this.baseUrl}/notifications/preferences`, {
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notification preferences');
    }

    return response.json();
  }

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authService.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error('Failed to update notification preferences');
    }
  }

  // Helper methods for common notification scenarios
  async notifyBoLCreated(bolId: string, bolNumber: string, carrierUserId: string, shipperName: string): Promise<void> {
    await this.createNotification({
      targetUserIds: [carrierUserId],
      type: 'bol_created',
      title: 'New BoL Assignment',
      message: `New BoL #${bolNumber} assigned from ${shipperName}`,
      relatedBoLId: bolId,
      relatedBoLNumber: bolNumber,
      priority: 'high'
    });
  }

  async notifyBoLRejected(bolId: string, bolNumber: string, shipperUserId: string, carrierName: string, reason: string): Promise<void> {
    await this.createNotification({
      targetUserIds: [shipperUserId],
      type: 'bol_rejected',
      title: 'BoL Rejected',
      message: `BoL #${bolNumber} rejected by ${carrierName}: ${reason}`,
      relatedBoLId: bolId,
      relatedBoLNumber: bolNumber,
      priority: 'high',
      metadata: { rejectionReason: reason }
    });
  }

  async notifyBoLApproved(bolId: string, bolNumber: string, shipperUserId: string, carrierName: string): Promise<void> {
    await this.createNotification({
      targetUserIds: [shipperUserId],
      type: 'bol_approved',
      title: 'BoL Approved',
      message: `BoL #${bolNumber} approved by ${carrierName}`,
      relatedBoLId: bolId,
      relatedBoLNumber: bolNumber,
      priority: 'medium'
    });
  }

  async notifyStatusUpdate(bolId: string, bolNumber: string, userIds: string[], oldStatus: string, newStatus: string, updatedBy: string): Promise<void> {
    await this.createNotification({
      targetUserIds: userIds,
      type: 'status_updated',
      title: 'BoL Status Updated',
      message: `BoL #${bolNumber} status changed from ${oldStatus} to ${newStatus} by ${updatedBy}`,
      relatedBoLId: bolId,
      relatedBoLNumber: bolNumber,
      priority: 'medium',
      metadata: { oldStatus, newStatus, updatedBy }
    });
  }

  // Mock data for development
  async getMockNotifications(): Promise<Notification[]> {
    return [
      {
        id: '1',
        userId: '2',
        type: 'bol_created',
        title: 'New BoL Assignment',
        message: 'New BoL #BOL-2025-000123 assigned from Acme Shipping',
        relatedBoLId: 'bol_123',
        relatedBoLNumber: 'BOL-2025-000123',
        priority: 'high',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
        createdBy: {
          id: '3',
          name: 'Sarah Shipper',
          email: 'shipper@loadblock.io',
          role: 'shipper'
        }
      },
      {
        id: '2',
        userId: '3',
        type: 'bol_rejected',
        title: 'BoL Rejected',
        message: 'BoL #BOL-2025-000124 rejected by FastTrack Cargo: Missing unit weight for cargo item 2',
        relatedBoLId: 'bol_124',
        relatedBoLNumber: 'BOL-2025-000124',
        priority: 'high',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
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
        userId: '3',
        type: 'status_updated',
        title: 'BoL Status Updated',
        message: 'BoL #BOL-2025-000125 status changed from pending to approved',
        relatedBoLId: 'bol_125',
        relatedBoLNumber: 'BOL-2025-000125',
        priority: 'medium',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        createdBy: {
          id: '2',
          name: 'John Carrier',
          email: 'carrier@loadblock.io',
          role: 'carrier'
        }
      }
    ];
  }
}

export const notificationService = new NotificationService();