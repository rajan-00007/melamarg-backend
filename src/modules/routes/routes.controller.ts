import { Request, Response } from 'express';
import * as routeService from './routes.service';
import logger from '../../utils/logger';

export const createRouteGraph = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { nodes, edges } = req.body;
    
    // Use eventId from params or body, preferring params for RESTfulness
    const payload = {
      eventId: (eventId || req.body.eventId) as string,
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

export const deleteRouteGraph = async (req: Request, res: Response): Promise<void> => {
  try {
    // According to req: DELETE /routes/:id (where id is eventId in this architecture)
    const eventId = req.params.id as string;
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
