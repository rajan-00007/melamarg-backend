import { NotificationService } from '@modules/notifications/notification.service';
import { notificationRepository } from '@modules/notifications/notification.repository';
import { fcmService } from '@modules/notifications/fcm.service';

jest.mock('@modules/notifications/notification.repository');
jest.mock('@modules/notifications/fcm.service');
jest.mock('@utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
  });

  describe('registerDeviceToken', () => {
    it('should throw error if eventId or fcmToken missing', async () => {
      await expect(service.registerDeviceToken('', 't')).rejects.toThrow('Event ID and FCM token are required');
    });

    it('should register token', async () => {
      (notificationRepository.registerDeviceToken as jest.Mock).mockResolvedValue({ id: 'tok' });
      const res = await service.registerDeviceToken('e', 't', 'ios');
      expect(res).toEqual({ id: 'tok' });
    });
  });

  describe('sendEventNotification', () => {
    it('should throw error if required payload missing', async () => {
      await expect(service.sendEventNotification({})).rejects.toThrow('Event ID, title, and message are required');
    });

    it('should save notification and return early if no tokens', async () => {
      (notificationRepository.saveNotification as jest.Mock).mockResolvedValue({ id: 'n1', event_id: 'e' });
      (notificationRepository.getDeviceTokensByEvent as jest.Mock).mockResolvedValue([]);

      const res = await service.sendEventNotification({ event_id: 'e', title: 't', message: 'm' });
      expect(res.pushResult.successCount).toBe(0);
      expect(fcmService.sendMulticastNotification).not.toHaveBeenCalled();
    });

    it('should send multicast and clean up failed tokens', async () => {
      const mockNotification = { id: 'n1', event_id: 'e', is_emergency: true, latitude: 1, longitude: 2, title: 't', message: 'm' };
      (notificationRepository.saveNotification as jest.Mock).mockResolvedValue(mockNotification);
      (notificationRepository.getDeviceTokensByEvent as jest.Mock).mockResolvedValue(['t1', 't2']);
      (fcmService.sendMulticastNotification as jest.Mock).mockResolvedValue({
        successCount: 1, failureCount: 1, failedTokens: ['t2']
      });

      const res = await service.sendEventNotification(mockNotification);

      expect(fcmService.sendMulticastNotification).toHaveBeenCalledWith(['t1', 't2'], {
        title: 't',
        body: 'm',
        data: { notificationId: 'n1', eventId: 'e', isEmergency: 'true', latitude: '1', longitude: '2' }
      });
      expect(notificationRepository.deleteDeviceTokens).toHaveBeenCalledWith(['t2']);
      expect(res.pushResult.successCount).toBe(1);
    });

    it('should send multicast without coordinates and without cleaning up tokens if all succeed', async () => {
      const mockNotification = { id: 'n1', event_id: 'e', is_emergency: false, title: 't', message: 'm' };
      (notificationRepository.saveNotification as jest.Mock).mockResolvedValue(mockNotification);
      (notificationRepository.getDeviceTokensByEvent as jest.Mock).mockResolvedValue(['t1']);
      (fcmService.sendMulticastNotification as jest.Mock).mockResolvedValue({
        successCount: 1, failureCount: 0, failedTokens: []
      });

      await service.sendEventNotification(mockNotification);

      expect(fcmService.sendMulticastNotification).toHaveBeenCalledWith(['t1'], {
        title: 't',
        body: 'm',
        data: { notificationId: 'n1', eventId: 'e', isEmergency: 'false' }
      });
      expect(notificationRepository.deleteDeviceTokens).not.toHaveBeenCalled();
    });
  });

  describe('getNotificationsByEvent', () => {
    it('should return notifications', async () => {
      (notificationRepository.getNotificationsByEvent as jest.Mock).mockResolvedValue([{ id: 'n1' }]);
      const res = await service.getNotificationsByEvent('e');
      expect(res).toEqual([{ id: 'n1' }]);
    });
  });
});
