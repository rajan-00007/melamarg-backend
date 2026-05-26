import * as admin from 'firebase-admin';
import logger from '../../utils/logger';

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines with actual newlines in case dotenv doesn't parse them fully
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    });
    logger.info('Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK', error);
}

export const fcmService = {
  async sendMulticastNotification(
    tokens: string[],
    payload: { title: string; body: string; data?: any }
  ): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    // Split tokens into native mobile ones and simulated web ones
    const nativeTokens = tokens.filter(t => !t.startsWith('web-'));
    const webTokens = tokens.filter(t => t.startsWith('web-'));

    logger.info(`FCM routing: ${nativeTokens.length} native devices, ${webTokens.length} simulated web devices`);

    if (nativeTokens.length === 0) {
      // If we only have web clients, skip FCM multicasting entirely and declare immediate success
      return {
        successCount: webTokens.length,
        failureCount: 0,
        failedTokens: []
      };
    }

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      tokens: nativeTokens,
    };

    try {
      // Send messages to multiple native devices
      const response = await admin.messaging().sendEachForMulticast(message);
      
      const failedTokens: string[] = [];
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(nativeTokens[idx]);
            // Log specific error for debugging
            logger.warn(`Failed to send to token ${nativeTokens[idx]}: ${resp.error?.message}`);
          }
        });
      }

      return {
        successCount: response.successCount + webTokens.length,
        failureCount: response.failureCount,
        failedTokens,
      };
    } catch (error: any) {
      logger.error('Error sending multicast notification', error);
      throw error;
    }
  }
};

