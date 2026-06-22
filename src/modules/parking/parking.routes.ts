import { Router } from 'express';
import { parkingController } from './parking.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Event-specific routes (includes both public listing and admin creation)
router.get('/events/:eventId/parking', parkingController.getParkingLots.bind(parkingController));
router.post('/events/:eventId/parking', authenticate as any, parkingController.createParkingLot.bind(parkingController));

// Generic parking lot updates (admin only)
router.patch('/:id', authenticate as any, parkingController.updateParkingLot.bind(parkingController));
router.delete('/:id', authenticate as any, parkingController.deleteParkingLot.bind(parkingController));

// Public reservation routes
router.post('/reserve', parkingController.reserveSpot.bind(parkingController));
router.post('/cancel', parkingController.cancelReservation.bind(parkingController));
router.get('/reservation/:token', parkingController.getReservation.bind(parkingController));

export default router;
