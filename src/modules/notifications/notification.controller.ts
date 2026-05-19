import { Request, Response } from 'express';
import { notificationService } from './notification.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import logger from '../../utils/logger';

export class NotificationController {
  // Public Endpoint: App registers device token after downloading event
  async registerToken(req: Request, res: Response): Promise<any> {
    try {
      const { eventId, fcmToken, platform } = req.body;

      if (!eventId || !fcmToken) {
        return res.status(400).json({ error: 'eventId and fcmToken are required' });
      }

      await notificationService.registerDeviceToken(eventId, fcmToken, platform);

      return res.status(200).json({
        success: true,
        message: 'Device registered for event notifications successfully'
      });
    } catch (error: any) {
      logger.error('Error registering device token:', error);
      return res.status(500).json({ error: 'Failed to register device token' });
    }
  }

  // Admin Endpoint: Send push notification to all devices for a specific event
  async sendNotification(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { eventId, title, message, isEmergency, latitude, longitude } = req.body;
      const created_by = req.user?.id;

      if (!eventId || !title || !message) {
        return res.status(400).json({ error: 'eventId, title, and message are required' });
      }

      const result = await notificationService.sendEventNotification({
        event_id: eventId,
        title,
        message,
        is_emergency: isEmergency,
        latitude,
        longitude,
        created_by
      });

      return res.status(200).json({
        success: true,
        message: 'Notification processed',
        data: result
      });
    } catch (error: any) {
      logger.error('Error sending notification:', error);
      return res.status(500).json({ error: 'Failed to send notification' });
    }
  }

  // Public Endpoint: Fetch notification history for an event (in-app feed)
  async getNotifications(req: Request, res: Response): Promise<any> {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.status(400).json({ error: 'eventId is required' });
      }

      const notifications = await notificationService.getNotificationsByEvent(eventId as string);

      
      return res.status(200).json({
        success: true,
        data: notifications
      });
    } catch (error: any) {
      logger.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }
}

export const notificationController = new NotificationController();
