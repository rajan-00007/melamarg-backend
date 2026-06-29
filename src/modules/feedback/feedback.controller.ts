import { Request, Response } from 'express';
import { feedbackService } from './feedback.service';
import logger from '../../utils/logger';

export class FeedbackController {
  async submitFeedback(req: Request, res: Response): Promise<any> {
    try {
      const { event_id, rating, thoughts } = req.body;
      const result = await feedbackService.submitFeedback({
        event_id,
        rating: Number(rating),
        thoughts
      });

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error submitting feedback:', error);
      return res.status(400).json({ error: error.message || 'Failed to submit feedback' });
    }
  }

  async getFeedback(req: Request, res: Response): Promise<any> {
    try {
      const eventId = req.query.eventId as string | undefined;
      const result = await feedbackService.getFeedbackList(eventId);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error fetching feedback:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch feedback' });
    }
  }

  async deleteFeedback(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const result = await feedbackService.deleteFeedback(id);

      if (!result) {
        return res.status(404).json({ error: 'Feedback not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Feedback deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting feedback:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete feedback' });
    }
  }
}

export const feedbackController = new FeedbackController();
