import { notificationRepository } from '@modules/notifications/notification.repository';
import { query } from '@config/database';

jest.mock('@config/database');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('NotificationRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDeviceToken', () => {
    it('should return existing token if present', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'existing' }] });
      const res = await notificationRepository.registerDeviceToken('evt', 'tok');
      expect(res).toEqual({ id: 'existing' });
    });

    it('should insert and return new token', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'mock-uuid' }] });
      const res = await notificationRepository.registerDeviceToken('evt', 'tok', 'ios');
      expect(res).toEqual({ id: 'mock-uuid' });
    });
  });

  describe('getDeviceTokensByEvent', () => {
    it('should return array of tokens', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ fcm_token: 't1' }, { fcm_token: 't2' }] });
      const res = await notificationRepository.getDeviceTokensByEvent('evt');
      expect(res).toEqual(['t1', 't2']);
    });
  });

  describe('deleteDeviceTokens', () => {
    it('should do nothing if tokens array is empty', async () => {
      await notificationRepository.deleteDeviceTokens([]);
      expect(query).not.toHaveBeenCalled();
    });

    it('should delete tokens', async () => {
      (query as jest.Mock).mockResolvedValue({});
      await notificationRepository.deleteDeviceTokens(['t1', 't2']);
      expect(query).toHaveBeenCalledWith('DELETE FROM device_tokens WHERE fcm_token IN ($1,$2)', ['t1', 't2']);
    });
  });

  describe('saveNotification', () => {
    it('should insert and return notification', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'mock-uuid' }] });
      const res = await notificationRepository.saveNotification({ event_id: 'e', title: 't', message: 'm' });
      expect(res).toEqual({ id: 'mock-uuid' });
    });
  });

  describe('getNotificationsByEvent', () => {
    it('should return notifications', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'n1' }] });
      const res = await notificationRepository.getNotificationsByEvent('e');
      expect(res).toEqual([{ id: 'n1' }]);
    });
  });
});
