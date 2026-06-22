import { parkingRepository, ParkingLotRecord, ParkingReservationRecord } from './parking.repository';
import { query } from '../../config/database';

export class ParkingService {
  async getParkingLots(eventId: string): Promise<ParkingLotRecord[]> {
    return parkingRepository.getParkingLotsByEvent(eventId);
  }

  async createParkingLot(lotData: Partial<ParkingLotRecord>): Promise<ParkingLotRecord> {
    if (!lotData.event_id) throw new Error('Event ID is required');
    if (!lotData.name) throw new Error('Parking lot name is required');
    if (lotData.latitude === undefined || lotData.longitude === undefined) {
      throw new Error('Coordinates (latitude and longitude) are required');
    }
    return parkingRepository.createParkingLot(lotData);
  }

  async updateParkingLot(id: string, updateData: Partial<ParkingLotRecord>): Promise<ParkingLotRecord | null> {
    const lot = await parkingRepository.getParkingLotById(id);
    if (!lot) throw new Error('Parking lot not found');
    return parkingRepository.updateParkingLot(id, updateData);
  }

  async deleteParkingLot(id: string): Promise<boolean> {
    const lot = await parkingRepository.getParkingLotById(id);
    if (!lot) throw new Error('Parking lot not found');
    return parkingRepository.deleteParkingLot(id);
  }

  async reserveSpot(parkingLotId: string, deviceId: string): Promise<ParkingReservationRecord> {
    if (!parkingLotId) throw new Error('Parking lot ID is required');
    
    // Get the event details to resolve the prefix
    const lot = await parkingRepository.getParkingLotById(parkingLotId);
    if (!lot) throw new Error('Parking lot not found');
    
    const eventResult = await query(`SELECT name FROM events WHERE id = $1`, [lot.event_id]);
    const event = eventResult.rows[0];
    
    let prefix = 'PURI'; // Default prefix
    if (event && event.name) {
      // Create prefix from first 4 letters of event name (e.g. "Bali Yatra" -> "BALI")
      const cleanedName = event.name.replace(/[^a-zA-Z]/g, '');
      if (cleanedName.length >= 3) {
        prefix = cleanedName.substring(0, 4).toUpperCase();
      }
    }

    return parkingRepository.createReservation(parkingLotId, deviceId, prefix);
  }

  async cancelReservation(token: string): Promise<ParkingReservationRecord> {
    if (!token) throw new Error('Reservation token is required');
    return parkingRepository.cancelReservation(token);
  }

  async getReservation(token: string): Promise<any | null> {
    if (!token) throw new Error('Reservation token is required');
    return parkingRepository.getReservationByToken(token);
  }
}

export const parkingService = new ParkingService();
