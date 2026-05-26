import { Router } from 'express';
import * as routeController from './routes.controller';
import { validateCreateRoute } from './routes.validation';
import { authenticate } from '../../middleware/auth.middleware';

// Router for /api/events/:eventId/routes
export const eventRoutesRouter = Router({ mergeParams: true });
eventRoutesRouter.post('/', authenticate, validateCreateRoute, routeController.createRouteGraph);
eventRoutesRouter.get('/', routeController.getRouteGraph);

// Router for /api/routes
export const generalRoutesRouter = Router();
generalRoutesRouter.delete('/:id', authenticate, routeController.deleteRouteGraph);

export default eventRoutesRouter;
