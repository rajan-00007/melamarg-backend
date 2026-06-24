import { Request, Response, NextFunction } from 'express';
import { advisoriesService } from './advisories.service';
import logger from '../../utils/logger';

export const createAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const eventId = req.params.eventId as string;
    const { title, message, startNodeId, endNodeId, edges, zoneIds, advisory_type, status_tag } = req.body;
    
    // Auth middleware attaches admin ID as req.adminId or similar
    const createdBy = (req as any).admin?.id || null;

    logger.info(`Creating traffic advisory for event ${eventId}: ${title}`);
    
    const result = await advisoriesService.createAdvisory({
      eventId,
      title,
      message,
      startNodeId,
      endNodeId,
      edges,
      zoneIds,
      advisory_type,
      status_tag,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: 'Traffic advisory published successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to create traffic advisory in controller', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating traffic advisory',
    });
  }
};

export const getAdvisories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const eventId = req.params.eventId as string;
    const result = await advisoriesService.getAdvisoriesByEvent(eventId);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to get advisories in controller', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching advisories',
    });
  }
};

export const getActiveAdvisories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const eventId = req.params.eventId as string;
    const result = await advisoriesService.getActiveAdvisoriesByEvent(eventId);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to get active advisories in controller', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching active advisories',
    });
  }
};

export const toggleAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (isActive === undefined) {
       res.status(400).json({
        success: false,
        message: 'isActive field is required',
      });
       return;
    }

    const result = await advisoriesService.toggleAdvisory(id, isActive);
    
    res.status(200).json({
      success: true,
      message: `Advisory successfully ${isActive ? 'activated' : 'deactivated'}`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to toggle advisory in controller', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error toggling advisory state',
    });
  }
};

export const deleteAdvisory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const success = await advisoriesService.deleteAdvisory(id);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Traffic advisory deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Traffic advisory not found or already deleted',
      });
    }
  } catch (error: any) {
    logger.error('Failed to delete advisory in controller', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting traffic advisory',
    });
  }
};
