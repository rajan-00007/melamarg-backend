import { Router } from 'express';
import { eventsController } from './events.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createEventSchema, updateEventSchema, getEventByIdSchema, publishEventSchema } from './events.schema';
import { upload } from '../../middleware/multer/upload';

const router = Router();

// Get all events
router.get('/', eventsController.getAllEvents.bind(eventsController));

// Create a new event (Step 1)
router.post('/', authenticate, validate(createEventSchema), eventsController.createEvent.bind(eventsController));

// Get event by ID
router.get('/:id', validate(getEventByIdSchema), eventsController.getEventById.bind(eventsController));

// Update event (including Phase 3 Bounding Box Creation)
router.patch('/:id', authenticate, validate(updateEventSchema), eventsController.updateEvent.bind(eventsController));

// Publish event (generate bundle)
router.post('/:id/publish', authenticate, validate(publishEventSchema), eventsController.publishEvent.bind(eventsController));

// Upload event logo/banner image
router.post('/:id/upload', authenticate, upload.single('image'), eventsController.uploadImage.bind(eventsController));

export default router;
