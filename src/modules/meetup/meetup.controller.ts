import { Request, Response } from 'express';
import { meetupService } from './meetup.service';
import logger from '../../utils/logger';

export class MeetupController {
  async createGroup(req: Request, res: Response): Promise<any> {
    try {
      const { eventId, name, pin, memberName, memberId } = req.body;
      if (!eventId || !name || !pin || !memberName) {
        return res.status(400).json({ error: 'Event ID, group name, PIN, and member name are required' });
      }

      const result = await meetupService.createGroup({
        eventId,
        name,
        pin,
        memberName,
        memberId
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error creating family group:', error);
      return res.status(500).json({ error: error.message || 'Failed to create group' });
    }
  }

  async joinGroup(req: Request, res: Response): Promise<any> {
    try {
      const { code, pin, memberName, memberId } = req.body;
      if (!code || !pin || !memberName) {
        return res.status(400).json({ error: 'Group code, PIN, and your name are required' });
      }

      const result = await meetupService.joinGroup({
        code,
        pin,
        memberName,
        memberId
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error joining family group:', error);
      return res.status(400).json({ error: error.message || 'Failed to join group' });
    }
  }

  async getGroupDetails(req: Request, res: Response): Promise<any> {
    try {
      const groupId = req.params.groupId as string;
      const memberId = req.query.memberId as string;

      if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required to verify membership' });
      }

      const result = await meetupService.getGroupDetails(groupId, memberId);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error fetching group details:', error);
      return res.status(403).json({ error: error.message || 'Failed to fetch group details' });
    }
  }

  async updateLocation(req: Request, res: Response): Promise<any> {
    try {
      const groupId = req.params.groupId as string;
      const memberId = req.params.memberId as string;
      const { latitude, longitude } = req.body;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const result = await meetupService.updateLocation(
        groupId,
        memberId,
        Number(latitude),
        Number(longitude)
      );

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error updating member location:', error);
      return res.status(500).json({ error: error.message || 'Failed to update location' });
    }
  }

  async setAssemblyPoint(req: Request, res: Response): Promise<any> {
    try {
      const groupId = req.params.groupId as string;
      const { memberId, assemblyPointId, customLat, customLng, customName } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required' });
      }

      const result = await meetupService.setAssemblyPoint(groupId, {
        memberId,
        assemblyPointId,
        customLat,
        customLng,
        customName
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error setting assembly point:', error);
      return res.status(500).json({ error: error.message || 'Failed to set assembly point' });
    }
  }

  async leaveGroup(req: Request, res: Response): Promise<any> {
    try {
      const groupId = req.params.groupId as string;
      const memberId = req.params.memberId as string;

      const result = await meetupService.leaveGroup(groupId, memberId);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error leaving group:', error);
      return res.status(500).json({ error: error.message || 'Failed to leave group' });
    }
  }
}

export const meetupController = new MeetupController();
