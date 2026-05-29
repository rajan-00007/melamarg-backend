import { Request, Response } from 'express';
import { AuthRequest, getOptionalUser } from '../../middleware/auth.middleware';
import { eventsService } from './events.services';
import { validateEventForPublish } from './events.validation';
import { bundleService } from '../bundles/bundle.service';
import { getHaversineDistance } from '../../utils/geo';
import logger from '../../utils/logger';

export class EventsController {
  async createEvent(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { name, start_date, end_date, description, logo_url, banner_url } = req.body;
      const created_by = req.user?.id;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const event = await eventsService.createEvent({
        name,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        description,
        logo_url,
        banner_url,
        created_by
      });

      return res.status(201).json({
        success: true,
        data: event
      });
    } catch (error: any) {
      logger.error('Error creating event:', error);
      return res.status(500).json({ error: 'Failed to create event' });
    }
  }

  async updateEvent(req: AuthRequest, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const { north, south, east, west, ...otherData } = req.body;
      const adminId = req.user?.id;

      const existingEvent = await eventsService.getEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (req.user?.role !== 'super_admin' && existingEvent.created_by !== adminId) {
        return res.status(403).json({ error: 'You are not authorized to modify this event' });
      }

      let event;
      if (north !== undefined && south !== undefined && east !== undefined && west !== undefined) {
         // This is a Bounding Box Update
         event = await eventsService.updateEventBBox(id, { north, south, east, west });
         
         // In case there are other fields updated
         if (Object.keys(otherData).length > 0) {
             event = await eventsService.updateEvent(id, otherData);
         }
      } else {
         event = await eventsService.updateEvent(id, req.body);
      }
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      return res.status(200).json({
        success: true,
        data: event
      });
    } catch (error: any) {
      logger.error('Error updating event:', error);
      return res.status(500).json({ error: 'Failed to update event' });
    }
  }
 
  async getAllEvents(req: Request, res: Response): Promise<any> {
    try {
      const user = getOptionalUser(req);
      let events = await eventsService.getAllEvents();
      
      if (user && user.role !== 'super_admin') {
        events = events.filter(event => event.created_by === user.id);
      } else if (!user) {
        // Standard public user coordinates query
        const { latitude, longitude } = req.query;
        if (latitude !== undefined && longitude !== undefined) {
          const userLat = Number(latitude);
          const userLng = Number(longitude);
          
          events = events.filter(event => {
            // Retrieve metadata object
            const meta = typeof event.metadata === 'string' ? JSON.parse(event.metadata) : (event.metadata || {});
            const radius = meta.visibility ? Number(meta.visibility) : 0;
            
            // If visibility radius is 0 or null, always show
            if (radius <= 0) {
              return true;
            }

            // Extract center coordinates, or compute them on-the-fly from the bbox if they are null in the database
            let lat = event.center_lat !== null && event.center_lat !== undefined ? Number(event.center_lat) : null;
            let lng = event.center_lng !== null && event.center_lng !== undefined ? Number(event.center_lng) : null;

            if (lat === null && event.north !== null && event.south !== null) {
              lat = (Number(event.north) + Number(event.south)) / 2;
            }
            if (lng === null && event.east !== null && event.west !== null) {
              lng = (Number(event.east) + Number(event.west)) / 2;
            }

            // If we still can't calculate center coordinates (missing both center and bbox), always show
            if (lat === null || lng === null) {
              return true;
            }
            
            const dist = getHaversineDistance(userLat, userLng, lat, lng);
            return dist <= radius;
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: events
      });
    } catch (error: any) {
      logger.error('Error fetching events:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  async getEventById(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const event = await eventsService.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const user = getOptionalUser(req);
      if (user && user.role !== 'super_admin' && event.created_by !== user.id) {
        return res.status(403).json({ error: 'You are not authorized to access this event' });
      }

      return res.status(200).json({
        success: true,
        data: event
      });
    } catch (error: any) {
      logger.error('Error fetching event:', error);
      return res.status(500).json({ error: 'Failed to fetch event' });
    }
  }

  async publishEvent(req: AuthRequest, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const existingEvent = await eventsService.getEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (req.user?.role !== 'super_admin' && existingEvent.created_by !== adminId) {
        return res.status(403).json({ error: 'You are not authorized to publish this event' });
      }

      // 1-4. Validate
      const validationError = await validateEventForPublish(id);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      // 5-8. Generate bundle
      logger.info(`Starting synchronous bundle generation for event ${id}`);
      const bundleResult = await bundleService.generateBundle(id, adminId);
      logger.info(`Bundle generation complete for event ${id}`);

      // 9. Return success
      return res.status(200).json({
        success: true,
        message: 'Event published successfully',
        data: bundleResult
      });
    } catch (error: any) {
      logger.error('Error publishing event:', error);
      return res.status(500).json({ error: error.message || 'Failed to publish event' });
    }
  }
}

export const eventsController = new EventsController();
