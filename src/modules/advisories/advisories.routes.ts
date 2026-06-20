import { Router } from 'express';
import * as advisoriesController from './advisories.controller';
import { authenticate } from '../../middleware/auth.middleware';

// Router for /api/events/:eventId/advisories
export const eventAdvisoriesRouter = Router({ mergeParams: true });
eventAdvisoriesRouter.post('/', authenticate, advisoriesController.createAdvisory);
eventAdvisoriesRouter.get('/', advisoriesController.getAdvisories);
eventAdvisoriesRouter.get('/active', advisoriesController.getActiveAdvisories);

// Router for /api/advisories
export const generalAdvisoriesRouter = Router();
generalAdvisoriesRouter.put('/:id/toggle', authenticate, advisoriesController.toggleAdvisory);
generalAdvisoriesRouter.delete('/:id', authenticate, advisoriesController.deleteAdvisory);

export default eventAdvisoriesRouter;
