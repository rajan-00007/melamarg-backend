import { Request, Response } from 'express';
import { parkingService } from './parking.service';

export class ParkingController {
  async getParkingLots(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        res.status(400).json({ success: false, error: 'Event ID is required' });
        return;
      }
      const data = await parkingService.getParkingLots(eventId as string);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createParkingLot(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const lotData = req.body;
      const lot = await parkingService.createParkingLot({ ...lotData, event_id: eventId as string });
      res.status(201).json({ success: true, data: lot });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateParkingLot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lot = await parkingService.updateParkingLot(id as string, req.body);
      res.status(200).json({ success: true, data: lot });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteParkingLot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await parkingService.deleteParkingLot(id as string);
      res.status(200).json({ success: true, message: 'Parking lot deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async reserveSpot(req: Request, res: Response): Promise<void> {
    try {
      const { parkingLotId, deviceId } = req.body;
      const reservation = await parkingService.reserveSpot(parkingLotId, deviceId);
      res.status(201).json({ success: true, data: reservation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async cancelReservation(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      const reservation = await parkingService.cancelReservation(token);
      res.status(200).json({ success: true, data: reservation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getReservation(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const reservation = await parkingService.getReservation(token as string);
      if (!reservation) {
        res.status(404).json({ success: false, error: 'Reservation not found' });
        return;
      }
      res.status(200).json({ success: true, data: reservation });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const parkingController = new ParkingController();
