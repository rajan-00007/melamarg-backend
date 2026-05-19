import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { registerTokenSchema, sendNotificationSchema, getNotificationsSchema } from './notification.schema';

const router = Router();

// Public: Register device for event
router.post('/register', validate(registerTokenSchema), notificationController.registerToken.bind(notificationController));

// Public: Get notification history for in-app feed
router.get('/events/:eventId', validate(getNotificationsSchema), notificationController.getNotifications.bind(notificationController));

// Admin: Send push notification to all devices for an event
router.post('/send', authenticate, validate(sendNotificationSchema), notificationController.sendNotification.bind(notificationController));

export default router;
