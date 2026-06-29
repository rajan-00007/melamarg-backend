import { Router } from 'express';
import { feedbackController } from './feedback.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Submit feedback - public access
router.post('/', feedbackController.submitFeedback.bind(feedbackController));

// Get all feedback - admin access required
router.get('/', authenticate, feedbackController.getFeedback.bind(feedbackController));

// Delete a feedback - admin access required
router.delete('/:id', authenticate, feedbackController.deleteFeedback.bind(feedbackController));

export default router;
