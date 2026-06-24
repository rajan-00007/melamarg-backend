import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { highlightsService } from './highlights.service';
import { uploadImage } from '../../providers/minioProvider';
import logger from '../../utils/logger';

export class HighlightsController {
  async getHighlights(req: Request, res: Response): Promise<any> {
    try {
      const eventId = req.params.eventId as string;
      const { date } = req.query; // optional date filtering YYYY-MM-DD
      
      const highlights = await highlightsService.getHighlightsByEvent(eventId, date as string);
      
      return res.status(200).json({
        success: true,
        data: highlights
      });
    } catch (error: any) {
      logger.error('Error fetching highlights:', error);
      return res.status(500).json({ error: 'Failed to fetch highlights' });
    }
  }

  async getHighlightById(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const highlight = await highlightsService.getHighlightById(id);
      
      if (!highlight) {
        return res.status(404).json({ error: 'Highlight not found' });
      }

      return res.status(200).json({
        success: true,
        data: highlight
      });
    } catch (error: any) {
      logger.error('Error fetching highlight:', error);
      return res.status(500).json({ error: 'Failed to fetch highlight' });
    }
  }

  async createHighlight(req: AuthRequest, res: Response): Promise<any> {
    try {
      const eventId = req.params.eventId as string;
      const { title, description, location, time, imageUrl, highlightDate } = req.body;
      
      if (!title || !highlightDate) {
        return res.status(400).json({ error: 'Title and highlight date (YYYY-MM-DD) are required' });
      }

      const highlight = await highlightsService.createHighlight({
        eventId,
        title,
        description,
        location,
        time,
        imageUrl,
        highlightDate
      });

      return res.status(201).json({
        success: true,
        data: highlight
      });
    } catch (error: any) {
      logger.error('Error creating highlight:', error);
      return res.status(500).json({ error: 'Failed to create highlight' });
    }
  }

  async updateHighlight(req: AuthRequest, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const updated = await highlightsService.updateHighlight(id, req.body);
      
      if (!updated) {
        return res.status(404).json({ error: 'Highlight not found or update failed' });
      }

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error: any) {
      logger.error('Error updating highlight:', error);
      return res.status(500).json({ error: 'Failed to update highlight' });
    }
  }

  async deleteHighlight(req: AuthRequest, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const success = await highlightsService.deleteHighlight(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Highlight not found or delete failed' });
      }

      return res.status(200).json({
        success: true,
        message: 'Highlight deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting highlight:', error);
      return res.status(500).json({ error: 'Failed to delete highlight' });
    }
  }

  async uploadImage(req: AuthRequest, res: Response): Promise<any> {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Upload to MinIO
      const objectName = await uploadImage(file, 'highlights');

      // Construct public MinIO access URL
      const bucket = process.env.MINIO_BUCKET || 'melamarg';
      const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
      const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : '';
      const minioUrl = `${protocol}://${process.env.MINIO_ENDPOINT}${port}/${bucket}/${objectName}`;

      return res.status(200).json({
        success: true,
        data: {
          objectName,
          imageUrl: minioUrl
        }
      });
    } catch (error: any) {
      logger.error('Error uploading highlight image to MinIO:', error);
      return res.status(500).json({ error: 'Failed to upload highlight image' });
    }
  }
}

export const highlightsController = new HighlightsController();
