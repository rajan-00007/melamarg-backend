import { notificationRepository, NotificationRecord, DeviceTokenRecord } from './notification.repository';
import { fcmService } from './fcm.service';
import logger from '../../utils/logger';

export class NotificationService {
  async registerDeviceToken(eventId: string, fcmToken: string, platform?: string): Promise<DeviceTokenRecord> {
    if (!eventId || !fcmToken) {
      throw new Error('Event ID and FCM token are required');
    }
    return await notificationRepository.registerDeviceToken(eventId, fcmToken, platform);
  }

  async sendEventNotification(payload: Partial<NotificationRecord>): Promise<any> {
    if (!payload.event_id || !payload.title || !payload.message) {
      throw new Error('Event ID, title, and message are required');
    }

    // 1. Store notification in database
    const notification = await notificationRepository.saveNotification(payload);

    // 2. Fetch all device tokens for this specific event
    const tokens = await notificationRepository.getDeviceTokensByEvent(payload.event_id);

    if (tokens.length === 0) {
      logger.info(`No devices registered for event ${payload.event_id}. Notification saved but not sent.`);
      return {
        notification,
        pushResult: { successCount: 0, failureCount: 0, failedTokens: [] }
      };
    }

    // 3. Prepare data payload for map redirection or extra info
    const dataPayload: any = {
      notificationId: notification.id,
      eventId: notification.event_id,
      isEmergency: String(notification.is_emergency),
    };

    if (notification.latitude !== undefined && notification.longitude !== undefined) {
      dataPayload.latitude = String(notification.latitude);
      dataPayload.longitude = String(notification.longitude);
    }

    // 4. Send Firebase Push Notification
    logger.info(`Sending notification to ${tokens.length} devices for event ${payload.event_id}`);
    const pushResult = await fcmService.sendMulticastNotification(tokens, {
      title: notification.title,
      body: notification.message,
      data: dataPayload
    });

    // 5. Automatically remove invalid/expired tokens to keep DB clean
    if (pushResult.failedTokens.length > 0) {
      logger.info(`Removing ${pushResult.failedTokens.length} invalid tokens for event ${payload.event_id}`);
      await notificationRepository.deleteDeviceTokens(pushResult.failedTokens);
    }

    return {
      notification,
      pushResult
    };
  }

  async getNotificationsByEvent(eventId: string): Promise<NotificationRecord[]> {
    return await notificationRepository.getNotificationsByEvent(eventId);
  }
}

export const notificationService = new NotificationService();
