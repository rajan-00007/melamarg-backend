import { feedbackRepository } from './feedback.repository';
import { Feedback, CreateFeedbackDto } from './feedback.types';

export class FeedbackService {
  async submitFeedback(dto: CreateFeedbackDto): Promise<Feedback> {
    if (dto.rating === undefined || dto.rating < 1 || dto.rating > 5) {
      throw new Error('Rating is required and must be between 1 and 5');
    }
    return await feedbackRepository.createFeedback(dto);
  }

  async getFeedbackList(eventId?: string): Promise<any[]> {
    return await feedbackRepository.getFeedback(eventId);
  }

  async deleteFeedback(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('Feedback ID is required');
    }
    return await feedbackRepository.deleteFeedback(id);
  }
}

export const feedbackService = new FeedbackService();
