import { NotificationController } from '@modules/notifications/notification.controller';
import { notificationService } from '@modules/notifications/notification.service';
import { Request, Response } from 'express';
import { AuthRequest } from '@middleware/auth.middleware';

jest.mock('@modules/notifications/notification.service');
jest.mock('@utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

describe('NotificationController', () => {
  let controller: NotificationController;
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new NotificationController();
    req = { body: {}, params: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  describe('registerToken', () => {
    it('should return 400 if required fields missing', async () => {
      await controller.registerToken(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should register token and return 200', async () => {
      req.body = { eventId: 'e', fcmToken: 't' };
      (notificationService.registerDeviceToken as jest.Mock).mockResolvedValue({});
      await controller.registerToken(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.body = { eventId: 'e', fcmToken: 't' };
      (notificationService.registerDeviceToken as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.registerToken(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('sendNotification', () => {
    it('should return 400 if missing fields', async () => {
      await controller.sendNotification(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should send notification and return 200', async () => {
      req.body = { eventId: 'e', title: 't', message: 'm' };
      req.user = { id: 'u1', phone: '12', role: 'admin' };
      (notificationService.sendEventNotification as jest.Mock).mockResolvedValue({ pushResult: {} });
      await controller.sendNotification(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.body = { eventId: 'e', title: 't', message: 'm' };
      (notificationService.sendEventNotification as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.sendNotification(req as AuthRequest, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getNotifications', () => {
    it('should return 400 if missing eventId', async () => {
      await controller.getNotifications(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return notifications', async () => {
      req.params = { eventId: 'e' };
      (notificationService.getNotificationsByEvent as jest.Mock).mockResolvedValue([{ id: 'n1' }]);
      await controller.getNotifications(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.params = { eventId: 'e' };
      (notificationService.getNotificationsByEvent as jest.Mock).mockRejectedValue(new Error('err'));
      await controller.getNotifications(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
