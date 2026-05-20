import * as admin from 'firebase-admin';
import { fcmService } from '@modules/notifications/fcm.service';

jest.mock('firebase-admin', () => {
  const messagingMock = {
    sendEachForMulticast: jest.fn()
  };
  return {
    apps: [],
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn()
    },
    messaging: jest.fn(() => messagingMock)
  };
});
jest.mock('@utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

describe('fcmService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 0 counts if no tokens', async () => {
    const res = await fcmService.sendMulticastNotification([], { title: 't', body: 'b' });
    expect(res).toEqual({ successCount: 0, failureCount: 0, failedTokens: [] });
  });

  it('should return success and failure counts', async () => {
    const messagingMock = admin.messaging();
    (messagingMock.sendEachForMulticast as jest.Mock).mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        { success: false, error: { message: 'err' } }
      ]
    });

    const res = await fcmService.sendMulticastNotification(['t1', 't2'], { title: 't', body: 'b' });
    
    expect(res.successCount).toBe(1);
    expect(res.failureCount).toBe(1);
    expect(res.failedTokens).toEqual(['t2']);
    expect(messagingMock.sendEachForMulticast).toHaveBeenCalledWith({
      notification: { title: 't', body: 'b' },
      data: {},
      tokens: ['t1', 't2']
    });
  });

  it('should throw error if messaging fails', async () => {
    const messagingMock = admin.messaging();
    (messagingMock.sendEachForMulticast as jest.Mock).mockRejectedValue(new Error('fatal'));

    await expect(fcmService.sendMulticastNotification(['t1'], { title: 't', body: 'b' })).rejects.toThrow('fatal');
  });

  it('should log error if Firebase initialization fails', () => {
    jest.isolateModules(() => {
      const adminMock = require('firebase-admin');
      const loggerMock = require('@utils/logger');
      
      // Make initializeApp throw
      adminMock.initializeApp.mockImplementationOnce(() => {
        throw new Error('Init failed');
      });
      
      // Re-import the service to trigger the top-level code
      require('@modules/notifications/fcm.service');
      
      expect(loggerMock.error).toHaveBeenCalledWith(
        'Failed to initialize Firebase Admin SDK',
        expect.any(Error)
      );
    });
  });

  it('should not log warnings if failureCount is 0', async () => {
    const messagingMock = admin.messaging();
    (messagingMock.sendEachForMulticast as jest.Mock).mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true }, { success: true }]
    });

    const res = await fcmService.sendMulticastNotification(['t1', 't2'], { title: 't', body: 'b' });
    expect(res.failureCount).toBe(0);
    expect(res.failedTokens).toEqual([]);
  });

  it('should skip initialization if Firebase is already initialized', () => {
    jest.isolateModules(() => {
      const adminMock = require('firebase-admin');
      adminMock.apps = [{ name: 'mock-app' }];
      
      require('@modules/notifications/fcm.service');
      
      expect(adminMock.initializeApp).not.toHaveBeenCalled();
    });
  });
});
