import { Request, Response } from 'express';
import { zonesService } from './zones.service';
import logger from '../../utils/logger';

export class ZonesController {
  async getZones(req: Request, res: Response): Promise<any> {
    try {
      const eventId = req.params.eventId as string;
      const { stats } = req.query;

      let zones;
      if (stats === 'true') {
        zones = await zonesService.getZonesWithStats(eventId);
      } else {
        zones = await zonesService.getZonesByEvent(eventId);
      }

      return res.status(200).json({
        success: true,
        data: zones
      });
    } catch (error: any) {
      logger.error('Error fetching zones:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch zones',
        error: error.message
      });
    }
  }

  async getZoneById(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const zone = await zonesService.getZoneById(id);
      
      if (!zone) {
        return res.status(404).json({
          success: false,
          message: 'Zone not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: zone
      });
    } catch (error: any) {
      logger.error('Error fetching zone by ID:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch zone',
        error: error.message
      });
    }
  }

  async createZone(req: Request, res: Response): Promise<any> {
    try {
      const eventId = req.params.eventId as string;
      const zoneData = { ...req.body, event_id: eventId };

      const zone = await zonesService.createZone(zoneData);
      return res.status(201).json({
        success: true,
        message: 'Zone created successfully',
        data: zone
      });
    } catch (error: any) {
      logger.error('Error creating zone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create zone',
        error: error.message
      });
    }
  }

  async updateZone(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const updateData = req.body;

      const zone = await zonesService.updateZone(id, updateData);
      return res.status(200).json({
        success: true,
        message: 'Zone updated successfully',
        data: zone
      });
    } catch (error: any) {
      logger.error('Error updating zone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update zone',
        error: error.message
      });
    }
  }

  async deleteZone(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const success = await zonesService.deleteZone(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Zone not found or already deleted'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Zone deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting zone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete zone',
        error: error.message
      });
    }
  }

  async findZoneForCoordinate(req: Request, res: Response): Promise<any> {
    try {
      const eventId = req.params.eventId as string;
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);

      const zone = await zonesService.findZoneForCoordinate(eventId, lat, lng);
      
      return res.status(200).json({
        success: true,
        data: zone // Will be null if coordinate doesn't belong to any zone
      });
    } catch (error: any) {
      logger.error('Error finding zone for coordinate:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to query zone for coordinate',
        error: error.message
      });
    }
  }
}

export const zonesController = new ZonesController();
