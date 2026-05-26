import { query } from '../../config/database';
import { randomUUID } from 'crypto';

export interface DeviceTokenRecord {
  id: string;
  event_id: string;
  fcm_token: string;
  platform?: string;
  created_at: Date;
}

export interface NotificationRecord {
  id: string;
  event_id: string;
  title: string;
  message: string;
  latitude?: number;
  longitude?: number;
  is_emergency: boolean;
  created_by?: string;
  created_at: Date;
}

export class NotificationRepository {
  async registerDeviceToken(event_id: string, fcm_token: string, platform?: string): Promise<DeviceTokenRecord> {
    // Prevent duplicate tokens for the same event
    const existing = await query(
      `SELECT * FROM device_tokens WHERE event_id = $1 AND fcm_token = $2`,
      [event_id, fcm_token]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const id = randomUUID();
    const result = await query(
      `INSERT INTO device_tokens (id, event_id, fcm_token, platform) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, event_id, fcm_token, platform]
    );

    return result.rows[0];
  }

  async getDeviceTokensByEvent(event_id: string): Promise<string[]> {
    const result = await query(
      `SELECT fcm_token FROM device_tokens WHERE event_id = $1`,
      [event_id]
    );
    return result.rows.map(row => row.fcm_token);
  }

  async deleteDeviceTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    
    // Create parameterized query for multiple tokens
    const placeholders = tokens.map((_, i) => `$${i + 1}`).join(',');
    await query(`DELETE FROM device_tokens WHERE fcm_token IN (${placeholders})`, tokens);
  }

  async saveNotification(notification: Partial<NotificationRecord>): Promise<NotificationRecord> {
    const id = randomUUID();
    const result = await query(
      `INSERT INTO notifications (
        id, event_id, title, message, latitude, longitude, is_emergency, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        notification.event_id,
        notification.title,
        notification.message,
        notification.latitude,
        notification.longitude,
        notification.is_emergency || false,
        notification.created_by
      ]
    );

    return result.rows[0];
  }

  async getNotificationsByEvent(event_id: string): Promise<NotificationRecord[]> {
    const result = await query(
      `SELECT * FROM notifications WHERE event_id = $1 ORDER BY created_at DESC`,
      [event_id]
    );
    return result.rows;
  }
}

export const notificationRepository = new NotificationRepository();
