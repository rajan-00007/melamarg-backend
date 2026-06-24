import { Router } from 'express';
import { highlightsController } from './highlights.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/multer/upload';

// Router for /api/events/:eventId/highlights
export const eventHighlightsRouter = Router({ mergeParams: true });
eventHighlightsRouter.get('/', highlightsController.getHighlights.bind(highlightsController));
eventHighlightsRouter.post('/', authenticate, highlightsController.createHighlight.bind(highlightsController));
eventHighlightsRouter.post('/upload', authenticate, upload.single('image'), highlightsController.uploadImage.bind(highlightsController));

// Router for /api/highlights
export const generalHighlightsRouter = Router();
generalHighlightsRouter.get('/:id', highlightsController.getHighlightById.bind(highlightsController));
generalHighlightsRouter.put('/:id', authenticate, highlightsController.updateHighlight.bind(highlightsController));
generalHighlightsRouter.delete('/:id', authenticate, highlightsController.deleteHighlight.bind(highlightsController));

export default eventHighlightsRouter;
