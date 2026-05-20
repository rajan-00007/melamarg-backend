import { z } from 'zod';

export const registerTokenSchema = z.object({
  body: z.object({
    eventId: z.string().uuid('Invalid event ID'),
    fcmToken: z.string().min(1, 'FCM token is required'),
    platform: z.string().optional()
  })
});

export const sendNotificationSchema = z.object({
  body: z.object({
    eventId: z.string().uuid('Invalid event ID'),
    title: z.string().min(1, 'Title is required'),
    message: z.string().min(1, 'Message is required'),
    isEmergency: z.boolean().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  })
});

export const getNotificationsSchema = z.object({
  params: z.object({
    eventId: z.string().uuid('Invalid event ID')
  })
});
