'use strict';

const EventEmitter = require('events');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

/**
 * Enterprise-Grade Asynchronous Notification Service
 * Optimized for real-time status update notifications across multiple users
 * Features: WebSocket broadcasting, email queuing, SMS batching, push notifications
 */
class NotificationService extends EventEmitter {
    constructor() {
        super();

        // Service configuration
        this.config = {
            emailBatchSize: 20,
            smsBatchSize: 10,
            pushBatchSize: 50,
            batchTimeoutMs: 2000,
            maxRetries: 3,
            retryDelayMs: 1000
        };

        // Notification channels
        this.channels = {
            websocket: new Set(),      // Connected WebSocket clients
            email: [],                 // Email queue
            sms: [],                   // SMS queue
            push: [],                  // Push notification queue
            inApp: new Map()           // In-app notifications by user
        };

        // Performance metrics
        this.metrics = {
            totalNotifications: 0,
            emailsSent: 0,
            smsSent: 0,
            pushSent: 0,
            websocketBroadcasts: 0,
            failedNotifications: 0,
            avgDeliveryTime: 0
        };

        // Rate limiting for different channels
        this.rateLimits = {
            email: { limit: 100, window: 3600 },     // 100 emails per hour per user
            sms: { limit: 10, window: 3600 },        // 10 SMS per hour per user
            push: { limit: 50, window: 3600 }        // 50 push notifications per hour per user
        };

        // Notification templates cache
        this.templateCache = new Map();

        this.initialize();
    }

    async initialize() {
        try {
            await this.loadNotificationTemplates();
            this.startBatchProcessors();
            this.setupEventListeners();

            logger.info('Notification service initialized successfully', {
                emailBatchSize: this.config.emailBatchSize,
                smsBatchSize: this.config.smsBatchSize,
                pushBatchSize: this.config.pushBatchSize
            });

        } catch (error) {
            logger.error('Failed to initialize notification service', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Load notification templates for different events
     */
    async loadNotificationTemplates() {
        // BoL Status Change Templates
        this.templateCache.set('status_change_email', {
            subject: 'BoL Status Update - {{bolNumber}}',
            body: `
                <h2>Bill of Lading Status Update</h2>
                <p>BoL Number: <strong>{{bolNumber}}</strong></p>
                <p>Status changed from <strong>{{previousStatus}}</strong> to <strong>{{newStatus}}</strong></p>
                <p>Updated by: {{updatedBy}}</p>
                <p>Timestamp: {{timestamp}}</p>
                <p>View details: <a href="{{viewUrl}}">Click here</a></p>
            `
        });

        this.templateCache.set('status_change_sms', {
            message: 'BoL {{bolNumber}} status: {{newStatus}}. Updated: {{timestamp}}. View: {{shortUrl}}'
        });

        this.templateCache.set('status_change_push', {
            title: 'BoL Status Update',
            body: 'BoL {{bolNumber}} is now {{newStatus}}',
            data: {
                type: 'status_change',
                bolId: '{{bolId}}',
                status: '{{newStatus}}'
            }
        });

        // Critical Alert Templates
        this.templateCache.set('critical_alert_email', {
            subject: 'URGENT: BoL Alert - {{bolNumber}}',
            body: `
                <h2 style="color: red;">URGENT ALERT</h2>
                <p>BoL Number: <strong>{{bolNumber}}</strong></p>
                <p>Alert: {{alertMessage}}</p>
                <p>Immediate action required.</p>
            `
        });

        logger.info('Notification templates loaded', {
            templateCount: this.templateCache.size
        });
    }

    /**
     * Start batch processors for different notification channels
     */
    startBatchProcessors() {
        // Email batch processor
        setInterval(async () => {
            await this.processEmailBatch();
        }, this.config.batchTimeoutMs);

        // SMS batch processor
        setInterval(async () => {
            await this.processSMSBatch();
        }, this.config.batchTimeoutMs);

        // Push notification batch processor
        setInterval(async () => {
            await this.processPushBatch();
        }, this.config.batchTimeoutMs);

        logger.info('Notification batch processors started');
    }

    /**
     * Setup event listeners for system events
     */
    setupEventListeners() {
        // Listen to Redis pub/sub for distributed notifications
        cacheService.client?.on('message', (channel, message) => {
            if (channel === 'notifications') {
                try {
                    const notification = JSON.parse(message);
                    this.handleDistributedNotification(notification);
                } catch (error) {
                    logger.error('Failed to parse distributed notification', {
                        error: error.message,
                        message
                    });
                }
            }
        });

        // Subscribe to notification channel
        cacheService.client?.subscribe('notifications');
    }

    /**
     * Main notification dispatcher for BoL status changes
     * Target: <100ms for notification queuing
     */
    async notifyBoLStatusChange(bolId, statusChangeData, recipients) {
        const startTime = process.hrtime.bigint();

        try {
            const { previousStatus, newStatus, updatedBy, timestamp } = statusChangeData;

            logger.info('Processing BoL status change notification', {
                bolId,
                previousStatus,
                newStatus,
                recipientCount: recipients.length
            });

            // Prepare notification data
            const notificationData = {
                bolId,
                bolNumber: statusChangeData.bolNumber || bolId,
                previousStatus,
                newStatus,
                updatedBy,
                timestamp: timestamp || new Date().toISOString(),
                priority: this.determinePriority(newStatus),
                viewUrl: `${process.env.FRONTEND_URL}/bol/${bolId}`,
                shortUrl: `${process.env.FRONTEND_URL}/b/${bolId.slice(-8)}`
            };

            // Process notifications for each recipient
            const notificationPromises = recipients.map(recipient =>
                this.processRecipientNotifications(recipient, notificationData)
            );

            await Promise.all(notificationPromises);

            // Broadcast to WebSocket clients
            await this.broadcastWebSocketNotification(bolId, notificationData);

            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;

            this.metrics.totalNotifications += recipients.length;

            logger.info('BoL status change notifications processed', {
                bolId,
                newStatus,
                recipientCount: recipients.length,
                duration: `${duration.toFixed(2)}ms`
            });

            return {
                success: true,
                notificationsSent: recipients.length,
                processingTime: `${duration.toFixed(2)}ms`
            };

        } catch (error) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000;

            logger.error('Failed to process status change notifications', {
                bolId,
                error: error.message,
                duration: `${duration.toFixed(2)}ms`
            });

            this.metrics.failedNotifications++;
            throw error;
        }
    }

    /**
     * Process notifications for a single recipient
     */
    async processRecipientNotifications(recipient, notificationData) {
        try {
            // Check rate limits
            const rateLimitChecks = await Promise.all([
                this.checkRateLimit(recipient.userId, 'email'),
                this.checkRateLimit(recipient.userId, 'sms'),
                this.checkRateLimit(recipient.userId, 'push')
            ]);

            const [emailAllowed, smsAllowed, pushAllowed] = rateLimitChecks;

            // Queue notifications based on user preferences and rate limits
            if (recipient.preferences.email && emailAllowed) {
                await this.queueEmailNotification(recipient, notificationData);
            }

            if (recipient.preferences.sms && smsAllowed && this.isHighPriority(notificationData.priority)) {
                await this.queueSMSNotification(recipient, notificationData);
            }

            if (recipient.preferences.push && pushAllowed) {
                await this.queuePushNotification(recipient, notificationData);
            }

            // Always create in-app notification
            await this.createInAppNotification(recipient.userId, notificationData);

        } catch (error) {
            logger.error('Failed to process recipient notifications', {
                recipientId: recipient.userId,
                error: error.message
            });
        }
    }

    /**
     * Queue email notification
     */
    async queueEmailNotification(recipient, data) {
        const template = this.templateCache.get('status_change_email');
        if (!template) return;

        const emailNotification = {
            id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            to: recipient.email,
            subject: this.renderTemplate(template.subject, data),
            body: this.renderTemplate(template.body, data),
            priority: data.priority,
            userId: recipient.userId,
            queuedAt: Date.now(),
            retryCount: 0
        };

        this.channels.email.push(emailNotification);

        // Trigger immediate processing if batch is full
        if (this.channels.email.length >= this.config.emailBatchSize) {
            setImmediate(() => this.processEmailBatch());
        }
    }

    /**
     * Queue SMS notification
     */
    async queueSMSNotification(recipient, data) {
        const template = this.templateCache.get('status_change_sms');
        if (!template || !recipient.phone) return;

        const smsNotification = {
            id: `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            to: recipient.phone,
            message: this.renderTemplate(template.message, data),
            priority: data.priority,
            userId: recipient.userId,
            queuedAt: Date.now(),
            retryCount: 0
        };

        this.channels.sms.push(smsNotification);

        // Trigger immediate processing if batch is full
        if (this.channels.sms.length >= this.config.smsBatchSize) {
            setImmediate(() => this.processSMSBatch());
        }
    }

    /**
     * Queue push notification
     */
    async queuePushNotification(recipient, data) {
        const template = this.templateCache.get('status_change_push');
        if (!template || !recipient.pushToken) return;

        const pushNotification = {
            id: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            token: recipient.pushToken,
            title: this.renderTemplate(template.title, data),
            body: this.renderTemplate(template.body, data),
            data: this.renderTemplateObject(template.data, data),
            priority: data.priority,
            userId: recipient.userId,
            queuedAt: Date.now(),
            retryCount: 0
        };

        this.channels.push.push(pushNotification);

        // Trigger immediate processing if batch is full
        if (this.channels.push.length >= this.config.pushBatchSize) {
            setImmediate(() => this.processPushBatch());
        }
    }

    /**
     * Create in-app notification
     */
    async createInAppNotification(userId, data) {
        const notification = {
            id: `inapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'status_change',
            title: `BoL ${data.bolNumber} Status Update`,
            message: `Status changed to ${data.newStatus}`,
            data: data,
            read: false,
            createdAt: Date.now()
        };

        // Store in user's notification list
        if (!this.channels.inApp.has(userId)) {
            this.channels.inApp.set(userId, []);
        }

        this.channels.inApp.get(userId).unshift(notification);

        // Keep only last 50 notifications per user
        if (this.channels.inApp.get(userId).length > 50) {
            this.channels.inApp.get(userId).splice(50);
        }

        // Cache for persistence
        await cacheService.set(
            `notifications:user:${userId}`,
            this.channels.inApp.get(userId),
            { ttl: 2592000 } // 30 days
        );
    }

    /**
     * WebSocket broadcasting for real-time updates
     */
    async broadcastWebSocketNotification(bolId, data) {
        try {
            const wsMessage = {
                type: 'bol_status_update',
                bolId,
                data,
                timestamp: Date.now()
            };

            // Broadcast to all connected WebSocket clients
            this.channels.websocket.forEach(client => {
                if (client.readyState === 1) { // WebSocket.OPEN
                    try {
                        client.send(JSON.stringify(wsMessage));
                    } catch (error) {
                        logger.warn('Failed to send WebSocket message', {
                            error: error.message
                        });
                        // Remove dead connections
                        this.channels.websocket.delete(client);
                    }
                }
            });

            this.metrics.websocketBroadcasts++;

            logger.debug('WebSocket notification broadcasted', {
                bolId,
                connectedClients: this.channels.websocket.size
            });

        } catch (error) {
            logger.error('WebSocket broadcast failed', {
                bolId,
                error: error.message
            });
        }
    }

    /**
     * Process email batch
     */
    async processEmailBatch() {
        if (this.channels.email.length === 0) return;

        const batch = this.channels.email.splice(0, this.config.emailBatchSize);
        const batchId = `email-batch-${Date.now()}`;

        logger.info('Processing email batch', {
            batchId,
            emailCount: batch.length
        });

        try {
            // Group emails by priority
            const highPriority = batch.filter(email => email.priority === 'high');
            const normalPriority = batch.filter(email => email.priority !== 'high');

            // Process high priority first
            if (highPriority.length > 0) {
                await this.sendEmailBatch(highPriority, batchId + '-high');
            }

            if (normalPriority.length > 0) {
                await this.sendEmailBatch(normalPriority, batchId + '-normal');
            }

        } catch (error) {
            logger.error('Email batch processing failed', {
                batchId,
                error: error.message
            });
        }
    }

    /**
     * Send email batch
     */
    async sendEmailBatch(emails, batchId) {
        try {
            // Mock email sending - replace with actual email service
            for (const email of emails) {
                await this.sendSingleEmail(email);
                this.metrics.emailsSent++;
            }

            logger.info('Email batch sent successfully', {
                batchId,
                emailCount: emails.length
            });

        } catch (error) {
            logger.error('Email batch sending failed', {
                batchId,
                error: error.message
            });

            // Re-queue failed emails with retry logic
            emails.forEach(email => {
                email.retryCount++;
                if (email.retryCount <= this.config.maxRetries) {
                    setTimeout(() => {
                        this.channels.email.push(email);
                    }, this.config.retryDelayMs * email.retryCount);
                }
            });
        }
    }

    /**
     * Send single email (mock implementation)
     */
    async sendSingleEmail(email) {
        // Mock email sending
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API call

        logger.debug('Email sent', {
            emailId: email.id,
            to: email.to,
            subject: email.subject
        });
    }

    /**
     * Process SMS batch
     */
    async processSMSBatch() {
        if (this.channels.sms.length === 0) return;

        const batch = this.channels.sms.splice(0, this.config.smsBatchSize);
        const batchId = `sms-batch-${Date.now()}`;

        logger.info('Processing SMS batch', {
            batchId,
            smsCount: batch.length
        });

        try {
            for (const sms of batch) {
                await this.sendSingleSMS(sms);
                this.metrics.smsSent++;
            }

        } catch (error) {
            logger.error('SMS batch processing failed', {
                batchId,
                error: error.message
            });
        }
    }

    /**
     * Send single SMS (mock implementation)
     */
    async sendSingleSMS(sms) {
        // Mock SMS sending
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call

        logger.debug('SMS sent', {
            smsId: sms.id,
            to: sms.to,
            message: sms.message.substring(0, 50) + '...'
        });
    }

    /**
     * Process push notification batch
     */
    async processPushBatch() {
        if (this.channels.push.length === 0) return;

        const batch = this.channels.push.splice(0, this.config.pushBatchSize);
        const batchId = `push-batch-${Date.now()}`;

        logger.info('Processing push notification batch', {
            batchId,
            pushCount: batch.length
        });

        try {
            for (const push of batch) {
                await this.sendSinglePushNotification(push);
                this.metrics.pushSent++;
            }

        } catch (error) {
            logger.error('Push notification batch processing failed', {
                batchId,
                error: error.message
            });
        }
    }

    /**
     * Send single push notification (mock implementation)
     */
    async sendSinglePushNotification(push) {
        // Mock push notification sending
        await new Promise(resolve => setTimeout(resolve, 30)); // Simulate API call

        logger.debug('Push notification sent', {
            pushId: push.id,
            token: push.token.substring(0, 20) + '...',
            title: push.title
        });
    }

    /**
     * Utility methods
     */
    determinePriority(status) {
        const highPriorityStatuses = ['delivered', 'cancelled', 'rejected'];
        return highPriorityStatuses.includes(status) ? 'high' : 'normal';
    }

    isHighPriority(priority) {
        return priority === 'high';
    }

    async checkRateLimit(userId, channel) {
        const config = this.rateLimits[channel];
        if (!config) return true;

        const key = `ratelimit:${channel}:${userId}`;
        const rateLimit = await cacheService.checkRateLimit(key, config.limit, config.window);

        return rateLimit.allowed;
    }

    renderTemplate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || match;
        });
    }

    renderTemplateObject(template, data) {
        const result = {};
        for (const [key, value] of Object.entries(template)) {
            result[key] = this.renderTemplate(value, data);
        }
        return result;
    }

    /**
     * Public API methods
     */
    addWebSocketClient(client) {
        this.channels.websocket.add(client);
        logger.debug('WebSocket client added', {
            totalClients: this.channels.websocket.size
        });
    }

    removeWebSocketClient(client) {
        this.channels.websocket.delete(client);
        logger.debug('WebSocket client removed', {
            totalClients: this.channels.websocket.size
        });
    }

    async getUserNotifications(userId, options = {}) {
        const limit = options.limit || 20;
        const offset = options.offset || 0;

        let userNotifications = this.channels.inApp.get(userId) || [];

        // Try to load from cache if empty
        if (userNotifications.length === 0) {
            const cached = await cacheService.get(`notifications:user:${userId}`, { parseJson: true });
            if (cached) {
                userNotifications = cached;
                this.channels.inApp.set(userId, userNotifications);
            }
        }

        return {
            notifications: userNotifications.slice(offset, offset + limit),
            total: userNotifications.length,
            unreadCount: userNotifications.filter(n => !n.read).length
        };
    }

    async markNotificationAsRead(userId, notificationId) {
        const userNotifications = this.channels.inApp.get(userId) || [];
        const notification = userNotifications.find(n => n.id === notificationId);

        if (notification) {
            notification.read = true;
            await cacheService.set(
                `notifications:user:${userId}`,
                userNotifications,
                { ttl: 2592000 } // 30 days
            );
            return true;
        }

        return false;
    }

    /**
     * Performance monitoring
     */
    getPerformanceMetrics() {
        return {
            ...this.metrics,
            queueLengths: {
                email: this.channels.email.length,
                sms: this.channels.sms.length,
                push: this.channels.push.length
            },
            connectedClients: this.channels.websocket.size,
            usersWithNotifications: this.channels.inApp.size
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const queueHealth =
                this.channels.email.length < 1000 &&
                this.channels.sms.length < 500 &&
                this.channels.push.length < 2000;

            return {
                status: queueHealth ? 'healthy' : 'degraded',
                metrics: this.getPerformanceMetrics()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
}

module.exports = new NotificationService();