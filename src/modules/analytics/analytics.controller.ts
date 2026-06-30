import { Request, Response } from 'express';
import { analyticsService } from './analytics.service';
import logger from '../../utils/logger';

export class AnalyticsController {
  async trackVisit(req: Request, res: Response): Promise<void> {
    try {
      const { event_id, eventId, device_id, deviceId, platform } = req.body;
      const finalEventId = eventId || event_id;
      const finalDeviceId = deviceId || device_id;

      if (!finalEventId || !finalDeviceId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: eventId and deviceId are required.'
        });
        return;
      }

      await analyticsService.trackVisit(finalEventId, finalDeviceId, platform);
      
      res.status(200).json({
        success: true,
        message: 'Visitor activity check-in recorded.'
      });
    } catch (error: any) {
      logger.error('Error tracking visitor check-in:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error while tracking visitor.'
      });
    }
  }

  async getEventAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const eventId = req.params.eventId as string;

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: eventId is required.'
        });
        return;
      }

      const data = await analyticsService.getEventAnalytics(eventId);
      
      res.status(200).json({
        success: true,
        data
      });
    } catch (error: any) {
      logger.error('Error fetching event analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error while fetching event analytics.'
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
