import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Public endpoint: Allow visitor apps to report their session activity
router.post('/track-visit', analyticsController.trackVisit);

// Protected endpoint: Only authenticated administrators can read event statistics
router.get('/:eventId', authenticate, analyticsController.getEventAnalytics);

export default router;
