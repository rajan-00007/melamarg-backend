import { Router } from 'express';
import { poiController } from './poi.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { getPOIsByEventSchema, createPOISchema, updatePOISchema, deletePOISchema } from './poi.schema';

const router = Router();

// Get all POI categories
router.get('/categories', poiController.getPOICategories.bind(poiController));

// Get all POIs for an event
router.get('/', validate(getPOIsByEventSchema), poiController.getPOIsByEvent.bind(poiController));

// Create a new POI
router.post('/', authenticate, validate(createPOISchema), poiController.createPOI.bind(poiController));

// Update POI
router.patch('/:id', authenticate, validate(updatePOISchema), poiController.updatePOI.bind(poiController));

// Delete POI
router.delete('/:id', authenticate, validate(deletePOISchema), poiController.deletePOI.bind(poiController));

export default router;
