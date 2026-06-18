import { Request, Response } from 'express';
import { poiService } from './poi.service';
import { AuthRequest, getOptionalUser } from '../../middleware/auth.middleware';
import { eventsService } from '../events/events.services';
import logger from '../../utils/logger';

export class POIController {
  async createPOI(req: AuthRequest, res: Response): Promise<any> {
    try {
      // According to frontend capturing flow: lat, lng, category, name, etc.
      const { event_id, lat, lng, category_id, name, name_en, name_hi, name_or, description, icon_url, path_name } = req.body;
      const created_by = req.user?.id;

      if (!event_id) {
        return res.status(400).json({ error: 'event_id is required' });
      }

      if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'lat and lng are required' });
      }

      const existingEvent = await eventsService.getEventById(event_id);
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (req.user?.role !== 'super_admin' && existingEvent.created_by !== created_by) {
        return res.status(403).json({ error: 'You are not authorized to add POIs to this event' });
      }

      const poi = await poiService.createPOI({
        event_id,
        latitude: lat,
        longitude: lng,
        category_id,
        name_en: name_en || name, // Fallback to name if name_en is not provided explicitly
        name_hi,
        name_or,
        description,
        icon_url,
        created_by,
        path_name
      });

      return res.status(201).json({
        success: true,
        data: poi
      });
    } catch (error: any) {
      logger.error('Error creating POI:', error);
      return res.status(500).json({ error: 'Failed to create POI', details: error.message });
    }
  }

  async getPOIsByEvent(req: Request, res: Response): Promise<any> {
    try {
      const { eventId } = req.query;
      
      if (!eventId || typeof eventId !== 'string') {
          return res.status(400).json({ error: 'eventId query parameter is required' });
      }

      const user = getOptionalUser(req);
      if (user && user.role !== 'super_admin') {
        const existingEvent = await eventsService.getEventById(eventId);
        if (existingEvent && existingEvent.created_by !== user.id) {
          return res.status(403).json({ error: 'You are not authorized to access POIs for this event' });
        }
      }

      const pois = await poiService.getPOIsByEvent(eventId);
      return res.status(200).json({
        success: true,
        data: pois
      });
    } catch (error: any) {
      logger.error('Error fetching POIs:', error);
      return res.status(500).json({ error: 'Failed to fetch POIs' });
    }
  }

  async updatePOI(req: AuthRequest, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const { lat, lng, ...otherData } = req.body;
      const adminId = req.user?.id;

      const existingPOI = await poiService.getPOIById(id);
      if (!existingPOI) {
        return res.status(404).json({ error: 'POI not found' });
      }

      const existingEvent = await eventsService.getEventById(existingPOI.event_id);
      if (req.user?.role !== 'super_admin' && existingPOI.created_by !== adminId && existingEvent?.created_by !== adminId) {
         return res.status(403).json({ error: 'You are not authorized to modify this POI' });
      }

      const updatePayload: any = { ...otherData };
      if (lat !== undefined) updatePayload.latitude = lat;
      if (lng !== undefined) updatePayload.longitude = lng;

      const poi = await poiService.updatePOI(id, updatePayload);
      
      return res.status(200).json({
        success: true,
        data: poi
      });
    } catch (error: any) {
      logger.error('Error updating POI:', error);
      return res.status(500).json({ error: 'Failed to update POI' });
    }
  }

  async deletePOI(req: AuthRequest, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const adminId = req.user?.id;

      const existingPOI = await poiService.getPOIById(id);
      if (!existingPOI) {
        return res.status(404).json({ error: 'POI not found' });
      }

      const existingEvent = await eventsService.getEventById(existingPOI.event_id);
      if (req.user?.role !== 'super_admin' && existingPOI.created_by !== adminId && existingEvent?.created_by !== adminId) {
         return res.status(403).json({ error: 'You are not authorized to delete this POI' });
      }

      const deleted = await poiService.deletePOI(id);
      
      if (!deleted) {
         return res.status(400).json({ error: 'Failed to delete POI' });
      }

      return res.status(200).json({
        success: true,
        message: 'POI deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting POI:', error);
      return res.status(500).json({ error: 'Failed to delete POI' });
    }
  }

  async getPOICategories(req: Request, res: Response): Promise<any> {
    try {
      const categories = await poiService.getPOICategories();
      return res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      logger.error('Error fetching POI categories:', error);
      return res.status(500).json({ error: 'Failed to fetch POI categories' });
    }
  }
}

export const poiController = new POIController();
