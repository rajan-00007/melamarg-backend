import { Request, Response } from 'express';
import { AuthRequest, getOptionalUser } from '../../middleware/auth.middleware';
import { eventsService } from '../events/events.services';
import * as routeService from './routes.service';
import logger from '../../utils/logger';

export const createRouteGraph = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { nodes, edges } = req.body;
    
    // Use eventId from params or body, preferring params for RESTfulness
    const targetEventId = (eventId || req.body.eventId) as string;

    if (!targetEventId) {
      res.status(400).json({
        status: 'error',
        message: 'eventId is required'
      });
      return;
    }

    const existingEvent = await eventsService.getEventById(targetEventId);
    if (!existingEvent) {
      res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
      return;
    }

    if (req.user?.role !== 'super_admin' && existingEvent.created_by !== req.user?.id) {
      res.status(403).json({
        status: 'error',
        message: 'You are not authorized to modify routes for this event'
      });
      return;
    }

    const payload = {
      eventId: targetEventId,
      nodes,
      edges
    };

    const result = await routeService.createRouteGraph(payload);

    res.status(201).json({
      status: 'success',
      data: result,
      message: 'Route graph created successfully'
    });
  } catch (error: any) {
    logger.error(`Error creating route graph: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal Server Error'
    });
  }
};

export const getRouteGraph = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    const user = getOptionalUser(req);
    if (user && user.role !== 'super_admin') {
      const existingEvent = await eventsService.getEventById(eventId as string);
      if (existingEvent && existingEvent.created_by !== user.id) {
        res.status(403).json({
          status: 'error',
          message: 'You are not authorized to access routes for this event'
        });
        return;
      }
    }

    const result = await routeService.getRouteGraph(eventId as string);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    logger.error(`Error fetching route graph: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal Server Error'
    });
  }
};

export const deleteRouteGraph = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // According to req: DELETE /routes/:id (where id is eventId in this architecture)
    const eventId = req.params.id as string;

    const existingEvent = await eventsService.getEventById(eventId);
    if (!existingEvent) {
      res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
      return;
    }

    if (req.user?.role !== 'super_admin' && existingEvent.created_by !== req.user?.id) {
      res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete routes for this event'
      });
      return;
    }

    await routeService.deleteRouteGraph(eventId);
    
    res.status(200).json({
      status: 'success',
      message: 'Route graph deleted successfully'
    });
  } catch (error: any) {
    logger.error(`Error deleting route graph: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal Server Error'
    });
  }
};
