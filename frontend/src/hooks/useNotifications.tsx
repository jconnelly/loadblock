// Notification Context and Hook for Global Notification Management
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Notification, NotificationStats, notificationService } from '../services/notificationService';
import { useAuth } from './useAuth';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: (options?: { page?: number; limit?: number; unreadOnly?: boolean }) => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshStats: () => Promise<void>;

  // Real-time updates
  startRealTimeUpdates: () => void;
  stopRealTimeUpdates: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize notifications when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
      refreshStats();
      startRealTimeUpdates();
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setStats(null);
      stopRealTimeUpdates();
    }

    return () => {
      stopRealTimeUpdates();
    };
  }, [isAuthenticated, user]);

  const fetchNotifications = async (options: { page?: number; limit?: number; unreadOnly?: boolean } = {}) => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await notificationService.getNotifications(options);

      if (options.page && options.page > 1) {
        // Append to existing notifications for pagination
        setNotifications(prev => [...prev, ...response.notifications]);
      } else {
        // Replace notifications for initial load or refresh
        setNotifications(response.notifications);
      }

      setUnreadCount(response.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');

      // Use mock data in development if API fails
      if (process.env.NODE_ENV === 'development') {
        try {
          const mockNotifications = await notificationService.getMockNotifications();
          setNotifications(mockNotifications);
          setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
        } catch (mockErr) {
          console.error('Mock data also failed:', mockErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStats = async () => {
    if (!isAuthenticated) return;

    try {
      const statsData = await notificationService.getNotificationStats();
      setStats(statsData);
      setUnreadCount(statsData.unread);
    } catch (err) {
      console.error('Failed to fetch notification stats:', err);

      // Mock stats for development
      if (process.env.NODE_ENV === 'development') {
        const mockStats: NotificationStats = {
          total: notifications.length,
          unread: notifications.filter(n => !n.isRead).length,
          byType: {
            bol_created: 1,
            bol_updated: 0,
            bol_approved: 0,
            bol_rejected: 1,
            status_updated: 1,
            comment_added: 0,
            assignment_changed: 0,
            document_generated: 0,
            system_message: 0
          },
          byPriority: {
            low: 0,
            medium: 1,
            high: 2,
            urgent: 0
          }
        };
        setStats(mockStats);
      }
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await notificationService.markAsRead(notificationIds);

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));

      // Refresh stats
      await refreshStats();
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
      setError('Failed to mark notifications as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );

      setUnreadCount(0);
      await refreshStats();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setError('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);

      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // Update unread count if the deleted notification was unread
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      await refreshStats();
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setError('Failed to delete notification');
    }
  };

  const startRealTimeUpdates = () => {
    if (!isAuthenticated) return;

    notificationService.connectWebSocket();

    // Listen for new notifications
    notificationService.addEventListener('notification_received', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      refreshStats();

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/loadblock-icon.png',
          tag: notification.id
        });
      }
    });
  };

  const stopRealTimeUpdates = () => {
    notificationService.disconnectWebSocket();
  };

  // Request browser notification permission
  useEffect(() => {
    if (isAuthenticated && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    stats,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshStats,
    startRealTimeUpdates,
    stopRealTimeUpdates,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};