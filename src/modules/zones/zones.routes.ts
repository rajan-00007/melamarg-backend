import { Router } from 'express';
import { zonesController } from './zones.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createZoneSchema,
  updateZoneSchema,
  getZonesSchema,
  getZoneByIdSchema,
  findZoneSchema
} from './zones.validation';

const router = Router({ mergeParams: true });

// Find which zone a coordinate belongs to
router.get('/find', validate(findZoneSchema), zonesController.findZoneForCoordinate.bind(zonesController));

// Get all zones for an event
router.get('/', validate(getZonesSchema), zonesController.getZones.bind(zonesController));

// Get single zone by ID
router.get('/:id', validate(getZoneByIdSchema), zonesController.getZoneById.bind(zonesController));

// Create a new zone
router.post('/', authenticate, validate(createZoneSchema), zonesController.createZone.bind(zonesController));

// Update a zone
router.put('/:id', authenticate, validate(updateZoneSchema), zonesController.updateZone.bind(zonesController));

// Delete a zone
router.delete('/:id', authenticate, validate(getZoneByIdSchema), zonesController.deleteZone.bind(zonesController));

export default router;
