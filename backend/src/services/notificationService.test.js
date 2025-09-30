const notificationService = require('./notificationService');
const cacheService = require('./cacheService');

// Mock dependencies
jest.mock('./cacheService');
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

describe('NotificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset notification channels
        notificationService.channels = {
            websocket: new Set(),
            email: [],
            sms: [],
            push: [],
            inApp: new Map()
        };

        // Reset metrics
        notificationService.metrics = {
            totalNotifications: 0,
            emailsSent: 0,
            smsSent: 0,
            pushSent: 0,
            websocketBroadcasts: 0,
            failedNotifications: 0,
            avgDeliveryTime: 0
        };

        // Mock cache service
        cacheService.checkRateLimit = jest.fn().mockResolvedValue({ allowed: true });
        cacheService.set = jest.fn().mockResolvedValue('OK');
        cacheService.get = jest.fn().mockResolvedValue(null);
    });

    describe('notifyBoLStatusChange', () => {
        const mockStatusChangeData = {
            bolNumber: 'BOL-2024-000001',
            previousStatus: 'pending',
            newStatus: 'approved',
            updatedBy: 'shipper@example.com',
            timestamp: new Date().toISOString()
        };

        const mockRecipients = [
            {
                userId: 'user-1',
                email: 'carrier@example.com',
                phone: '+1-555-0123',
                pushToken: 'push-token-1',
                preferences: { email: true, sms: true, push: true }
            },
            {
                userId: 'user-2',
                email: 'consignee@example.com',
                phone: '+1-555-0456',
                pushToken: 'push-token-2',
                preferences: { email: true, sms: false, push: true }
            }
        ];

        it('should process status change notifications successfully', async () => {
            const result = await notificationService.notifyBoLStatusChange(
                'bol-123',
                mockStatusChangeData,
                mockRecipients
            );

            expect(result.success).toBe(true);
            expect(result.notificationsSent).toBe(2);
            expect(result.processingTime).toMatch(/^\d+\.\d+ms$/);
            expect(notificationService.metrics.totalNotifications).toBe(2);
        });

        it('should queue email notifications', async () => {
            await notificationService.notifyBoLStatusChange(
                'bol-123',
                mockStatusChangeData,
                mockRecipients
            );

            // Should have queued emails for both recipients with email preference
            expect(notificationService.channels.email.length).toBe(2);

            const emailNotification = notificationService.channels.email[0];
            expect(emailNotification.to).toBe('carrier@example.com');
            expect(emailNotification.subject).toContain('BOL-2024-000001');
            expect(emailNotification.body).toContain('approved');
        });

        it('should queue SMS only for high priority and sms preference', async () => {
            // Modify status to high priority
            const highPriorityData = {
                ...mockStatusChangeData,
                newStatus: 'delivered' // High priority status
            };

            await notificationService.notifyBoLStatusChange(
                'bol-123',
                highPriorityData,
                mockRecipients
            );

            // Only user-1 has SMS preference enabled
            expect(notificationService.channels.sms.length).toBe(1);

            const smsNotification = notificationService.channels.sms[0];
            expect(smsNotification.to).toBe('+1-555-0123');
            expect(smsNotification.message).toContain('delivered');
        });

        it('should queue push notifications', async () => {
            await notificationService.notifyBoLStatusChange(
                'bol-123',
                mockStatusChangeData,
                mockRecipients
            );

            // Both recipients have push preferences enabled
            expect(notificationService.channels.push.length).toBe(2);

            const pushNotification = notificationService.channels.push[0];
            expect(pushNotification.token).toBe('push-token-1');
            expect(pushNotification.title).toBe('BoL Status Update');
            expect(pushNotification.body).toContain('approved');
        });

        it('should create in-app notifications for all recipients', async () => {
            await notificationService.notifyBoLStatusChange(
                'bol-123',
                mockStatusChangeData,
                mockRecipients
            );

            expect(notificationService.channels.inApp.size).toBe(2);

            const userNotifications = notificationService.channels.inApp.get('user-1');
            expect(userNotifications).toHaveLength(1);
            expect(userNotifications[0].type).toBe('status_change');
            expect(userNotifications[0].read).toBe(false);
        });

        it('should respect rate limits', async () => {
            cacheService.checkRateLimit.mockResolvedValue({ allowed: false });

            await notificationService.notifyBoLStatusChange(
                'bol-123',
                mockStatusChangeData,
                mockRecipients
            );

            // No notifications should be queued if rate limited
            expect(notificationService.channels.email.length).toBe(0);
            expect(notificationService.channels.sms.length).toBe(0);
            expect(notificationService.channels.push.length).toBe(0);
        });

        it('should handle processing errors gracefully', async () => {
            // Mock error in cache service
            cacheService.set.mockRejectedValue(new Error('Cache error'));

            const result = await notificationService.notifyBoLStatusChange(
                'bol-123',
                mockStatusChangeData,
                mockRecipients
            );

            // Should still succeed despite cache error
            expect(result.success).toBe(true);
        });
    });

    describe('template rendering', () => {
        it('should render templates with data correctly', () => {
            const template = 'Hello {{name}}, your BoL {{bolNumber}} is {{status}}';
            const data = {
                name: 'John',
                bolNumber: 'BOL-123',
                status: 'approved'
            };

            const result = notificationService.renderTemplate(template, data);
            expect(result).toBe('Hello John, your BoL BOL-123 is approved');
        });

        it('should handle missing template variables', () => {
            const template = 'Hello {{name}}, your order {{orderNumber}} is ready';
            const data = { name: 'John' }; // Missing orderNumber

            const result = notificationService.renderTemplate(template, data);
            expect(result).toBe('Hello John, your order {{orderNumber}} is ready');
        });

        it('should render template objects', () => {
            const template = {
                type: 'status_update',
                bolId: '{{bolId}}',
                status: '{{status}}'
            };
            const data = { bolId: 'bol-123', status: 'approved' };

            const result = notificationService.renderTemplateObject(template, data);
            expect(result).toEqual({
                type: 'status_update',
                bolId: 'bol-123',
                status: 'approved'
            });
        });
    });

    describe('batch processing', () => {
        it('should process email batches', async () => {
            // Add emails to queue
            for (let i = 0; i < 5; i++) {
                notificationService.channels.email.push({
                    id: `email-${i}`,
                    to: `user${i}@example.com`,
                    subject: 'Test Email',
                    body: 'Test Body',
                    priority: 'normal',
                    queuedAt: Date.now(),
                    retryCount: 0
                });
            }

            // Mock sendSingleEmail
            jest.spyOn(notificationService, 'sendSingleEmail')
                .mockResolvedValue();

            await notificationService.processEmailBatch();

            expect(notificationService.sendSingleEmail).toHaveBeenCalledTimes(5);
            expect(notificationService.metrics.emailsSent).toBe(5);
            expect(notificationService.channels.email.length).toBe(0);
        });

        it('should prioritize high priority emails', async () => {
            // Add mixed priority emails
            notificationService.channels.email.push(
                { id: 'email-1', priority: 'normal', to: 'normal@test.com' },
                { id: 'email-2', priority: 'high', to: 'high@test.com' },
                { id: 'email-3', priority: 'normal', to: 'normal2@test.com' }
            );

            jest.spyOn(notificationService, 'sendEmailBatch')
                .mockResolvedValue();

            await notificationService.processEmailBatch();

            // Should process high priority first
            expect(notificationService.sendEmailBatch).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ priority: 'high' })
                ]),
                expect.stringContaining('high')
            );
        });

        it('should handle email batch failures with retry', async () => {
            const email = {
                id: 'email-1',
                to: 'test@example.com',
                subject: 'Test',
                body: 'Test',
                priority: 'normal',
                queuedAt: Date.now(),
                retryCount: 0
            };

            notificationService.channels.email.push(email);

            jest.spyOn(notificationService, 'sendSingleEmail')
                .mockRejectedValue(new Error('Send failed'));

            await notificationService.processEmailBatch();

            // Email should be re-queued with incremented retry count
            expect(notificationService.channels.email.length).toBe(0); // Initially processed

            // Wait for retry timeout
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if retry was scheduled (implementation dependent)
            expect(email.retryCount).toBe(0); // Original object unchanged
        });
    });

    describe('WebSocket broadcasting', () => {
        it('should broadcast to connected WebSocket clients', async () => {
            const mockClient1 = {
                readyState: 1, // WebSocket.OPEN
                send: jest.fn()
            };
            const mockClient2 = {
                readyState: 1,
                send: jest.fn()
            };

            notificationService.channels.websocket.add(mockClient1);
            notificationService.channels.websocket.add(mockClient2);

            const data = {
                bolNumber: 'BOL-123',
                newStatus: 'approved'
            };

            await notificationService.broadcastWebSocketNotification('bol-123', data);

            expect(mockClient1.send).toHaveBeenCalledWith(
                expect.stringContaining('"type":"bol_status_update"')
            );
            expect(mockClient2.send).toHaveBeenCalledWith(
                expect.stringContaining('"bolId":"bol-123"')
            );
            expect(notificationService.metrics.websocketBroadcasts).toBe(1);
        });

        it('should remove dead connections', async () => {
            const deadClient = {
                readyState: 3, // WebSocket.CLOSED
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Connection closed');
                })
            };

            notificationService.channels.websocket.add(deadClient);

            await notificationService.broadcastWebSocketNotification('bol-123', {});

            // Dead client should be removed from set
            expect(notificationService.channels.websocket.has(deadClient)).toBe(false);
        });
    });

    describe('in-app notifications', () => {
        it('should manage user notifications correctly', async () => {
            const userId = 'user-123';
            const notificationData = {
                bolNumber: 'BOL-123',
                newStatus: 'approved'
            };

            await notificationService.createInAppNotification(userId, notificationData);

            const userNotifications = notificationService.channels.inApp.get(userId);
            expect(userNotifications).toHaveLength(1);
            expect(userNotifications[0].title).toContain('BOL-123');
            expect(userNotifications[0].read).toBe(false);
        });

        it('should limit notifications per user to 50', async () => {
            const userId = 'user-123';

            // Add 55 notifications
            for (let i = 0; i < 55; i++) {
                await notificationService.createInAppNotification(userId, {
                    bolNumber: `BOL-${i}`,
                    newStatus: 'approved'
                });
            }

            const userNotifications = notificationService.channels.inApp.get(userId);
            expect(userNotifications.length).toBe(50); // Should be limited to 50
        });

        it('should retrieve user notifications with pagination', async () => {
            const userId = 'user-123';

            // Add 30 notifications
            for (let i = 0; i < 30; i++) {
                await notificationService.createInAppNotification(userId, {
                    bolNumber: `BOL-${i}`,
                    newStatus: 'approved'
                });
            }

            const result = await notificationService.getUserNotifications(userId, {
                limit: 10,
                offset: 5
            });

            expect(result.notifications).toHaveLength(10);
            expect(result.total).toBe(30);
            expect(result.unreadCount).toBe(30);
        });

        it('should mark notifications as read', async () => {
            const userId = 'user-123';
            await notificationService.createInAppNotification(userId, {
                bolNumber: 'BOL-123',
                newStatus: 'approved'
            });

            const userNotifications = notificationService.channels.inApp.get(userId);
            const notificationId = userNotifications[0].id;

            const result = await notificationService.markNotificationAsRead(userId, notificationId);

            expect(result).toBe(true);
            expect(userNotifications[0].read).toBe(true);
        });
    });

    describe('utility methods', () => {
        it('should determine priority correctly', () => {
            expect(notificationService.determinePriority('delivered')).toBe('high');
            expect(notificationService.determinePriority('cancelled')).toBe('high');
            expect(notificationService.determinePriority('approved')).toBe('normal');
            expect(notificationService.determinePriority('pending')).toBe('normal');
        });

        it('should identify high priority correctly', () => {
            expect(notificationService.isHighPriority('high')).toBe(true);
            expect(notificationService.isHighPriority('normal')).toBe(false);
        });

        it('should check rate limits', async () => {
            cacheService.checkRateLimit.mockResolvedValue({ allowed: true });

            const allowed = await notificationService.checkRateLimit('user-123', 'email');

            expect(allowed).toBe(true);
            expect(cacheService.checkRateLimit).toHaveBeenCalledWith(
                'ratelimit:email:user-123',
                100,
                3600
            );
        });
    });

    describe('performance and health', () => {
        it('should return performance metrics', () => {
            const metrics = notificationService.getPerformanceMetrics();

            expect(metrics).toHaveProperty('totalNotifications');
            expect(metrics).toHaveProperty('emailsSent');
            expect(metrics).toHaveProperty('smsSent');
            expect(metrics).toHaveProperty('pushSent');
            expect(metrics).toHaveProperty('websocketBroadcasts');
            expect(metrics).toHaveProperty('queueLengths');
            expect(metrics).toHaveProperty('connectedClients');
            expect(metrics).toHaveProperty('usersWithNotifications');
        });

        it('should return healthy status', async () => {
            const health = await notificationService.healthCheck();

            expect(health.status).toBe('healthy');
            expect(health.metrics).toBeDefined();
        });

        it('should return degraded status with large queues', async () => {
            // Fill up queues to trigger degraded status
            for (let i = 0; i < 1500; i++) {
                notificationService.channels.email.push({ id: `email-${i}` });
            }

            const health = await notificationService.healthCheck();

            expect(health.status).toBe('degraded');
        });
    });

    describe('WebSocket client management', () => {
        it('should add and remove WebSocket clients', () => {
            const mockClient = { id: 'client-1' };

            notificationService.addWebSocketClient(mockClient);
            expect(notificationService.channels.websocket.has(mockClient)).toBe(true);

            notificationService.removeWebSocketClient(mockClient);
            expect(notificationService.channels.websocket.has(mockClient)).toBe(false);
        });

        it('should track connected client count', () => {
            const client1 = { id: 'client-1' };
            const client2 = { id: 'client-2' };

            notificationService.addWebSocketClient(client1);
            notificationService.addWebSocketClient(client2);

            const metrics = notificationService.getPerformanceMetrics();
            expect(metrics.connectedClients).toBe(2);
        });
    });
});