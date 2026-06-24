import pool from '../../config/database';
import { advisoriesRepository } from './advisories.repository';
import { CreateAdvisoryDto, TrafficAdvisoryResponse } from './advisories.types';
import { notificationRepository } from '../notifications/notification.repository';
import { fcmService } from '../notifications/fcm.service';
import logger from '../../utils/logger';

export class AdvisoriesService {
  async createAdvisory(payload: CreateAdvisoryDto): Promise<TrafficAdvisoryResponse> {
    if (!payload.eventId || !payload.title || !payload.message) {
      throw new Error('Event ID, title, and message are required');
    }

    const client = await pool.connect();
    let savedAdvisory: any = null;

    try {
      await client.query('BEGIN');

      // 1. Create advisory header
      logger.info(`advisories.service: Saving advisory header for event ${payload.eventId}`);
      const advisory = await advisoriesRepository.saveAdvisory(client, payload);
      logger.info(`advisories.service: Saved advisory header: ${JSON.stringify(advisory)}`);
      
      // 2. Save advisory edges
      const savedEdges = [];
      if (payload.edges && payload.edges.length > 0) {
        logger.info(`advisories.service: Saving ${payload.edges.length} edges`);
        for (const edge of payload.edges) {
          const savedEdge = await advisoriesRepository.saveAdvisoryEdge(
            client,
            advisory.id,
            edge.edgeId,
            edge.status
          );
          savedEdges.push({
            edge_id: savedEdge.edge_id,
            status: savedEdge.status,
          });
        }
      }

      // 2b. Save advisory zones mapping
      if (payload.zoneIds && payload.zoneIds.length > 0) {
        logger.info(`advisories.service: Saving ${payload.zoneIds.length} zones`);
        for (const zoneId of payload.zoneIds) {
          await advisoriesRepository.saveAdvisoryZone(
            client,
            advisory.id,
            zoneId
          );
        }
      }

      // 3. Create a linked warning notification so it shows up in the alerts feed
      logger.info(`advisories.service: Saving linked notification with advisory_id: ${advisory.id} (type: ${typeof advisory.id})`);
      await notificationRepository.saveNotification({
        event_id: payload.eventId,
        title: `TRAFFIC WARNING: ${payload.title}`,
        message: payload.message,
        is_emergency: false,
        advisory_id: advisory.id,
        created_by: payload.createdBy,
      }, client);
      logger.info('advisories.service: Saved linked notification successfully');

      await client.query('COMMIT');
      savedAdvisory = { ...advisory, edges: savedEdges, zoneIds: payload.zoneIds || [] };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create traffic advisory transaction. Details:', {
        error,
        payload,
        savedAdvisory
      });
      throw error;
    } finally {
      client.release();
    }

    // 4. Send Firebase Push Notification asynchronously (outside transaction)
    if (savedAdvisory) {
      try {
        const tokens = await notificationRepository.getDeviceTokensByEvent(payload.eventId);
        if (tokens.length > 0) {
          logger.info(`Sending FCM warning for traffic advisory ${savedAdvisory.id} to ${tokens.length} devices`);
          
          const pushResult = await fcmService.sendMulticastNotification(tokens, {
            title: `TRAFFIC WARNING: ${savedAdvisory.title}`,
            body: savedAdvisory.message,
            data: {
              advisoryId: savedAdvisory.id,
              eventId: payload.eventId,
              isEmergency: 'false',
              type: 'route_advisory',
            },
          });

          if (pushResult.failedTokens.length > 0) {
            logger.info(`Removing ${pushResult.failedTokens.length} expired tokens after advisory broadcast`);
            await notificationRepository.deleteDeviceTokens(pushResult.failedTokens);
          }
        }
      } catch (fcmError) {
        logger.error('Failed to send FCM push for traffic advisory', fcmError);
      }
    }

    return savedAdvisory;
  }

  async getAdvisoriesByEvent(eventId: string): Promise<TrafficAdvisoryResponse[]> {
    return await advisoriesRepository.getAdvisoriesByEvent(eventId);
  }

  async getActiveAdvisoriesByEvent(eventId: string): Promise<TrafficAdvisoryResponse[]> {
    return await advisoriesRepository.getActiveAdvisoriesByEvent(eventId);
  }

  async toggleAdvisory(id: string, isActive: boolean): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await advisoriesRepository.toggleAdvisory(client, id, isActive);
      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAdvisory(id: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const success = await advisoriesRepository.deleteAdvisory(client, id);
      await client.query('COMMIT');
      return success;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const advisoriesService = new AdvisoriesService();
