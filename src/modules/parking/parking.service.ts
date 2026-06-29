import { parkingRepository, ParkingLotRecord, ParkingReservationRecord } from './parking.repository';
import { query } from '../../config/database';
import { zonesService } from '../zones/zones.service';

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

    try {
      const zoneId = await zonesService.resolveZoneIdForCoordinate(
        lotData.event_id,
        Number(lotData.latitude),
        Number(lotData.longitude)
      );
      lotData.zone_id = zoneId;
    } catch (err) {
      // Don't crash creation
    }

    return parkingRepository.createParkingLot(lotData);
  }

  async updateParkingLot(id: string, updateData: Partial<ParkingLotRecord>): Promise<ParkingLotRecord | null> {
    const lot = await parkingRepository.getParkingLotById(id);
    if (!lot) throw new Error('Parking lot not found');

    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      const lat = updateData.latitude !== undefined ? Number(updateData.latitude) : Number(lot.latitude);
      const lng = updateData.longitude !== undefined ? Number(updateData.longitude) : Number(lot.longitude);
      try {
        const zoneId = await zonesService.resolveZoneIdForCoordinate(lot.event_id, lat, lng);
        updateData.zone_id = zoneId;
      } catch (err) {
        // Don't crash update
      }
    }

    return parkingRepository.updateParkingLot(id, updateData);
  }

  async deleteParkingLot(id: string): Promise<boolean> {
    const lot = await parkingRepository.getParkingLotById(id);
    if (!lot) throw new Error('Parking lot not found');
    return parkingRepository.deleteParkingLot(id);
  }

  async reserveSpot(parkingLotId: string, deviceId: string, slotsCount = 1): Promise<ParkingReservationRecord> {
    if (!parkingLotId) throw new Error('Parking lot ID is required');
    if (slotsCount < 1 || slotsCount > 4) {
      throw new Error('You can only reserve between 1 and 4 spots per booking');
    }
    
    // Get the event details to resolve the prefix
    const lot = await parkingRepository.getParkingLotById(parkingLotId);
    if (!lot) throw new Error('Parking lot not found');
    
    const eventResult = await query(`SELECT name, slug FROM events WHERE id = $1`, [lot.event_id]);
    const event = eventResult.rows[0];
    
    let prefix = 'PARK'; // Safe generic fallback for "Parking" if event is not found
    if (event && event.name) {
      // 1. Try cleaning the event name to alphabetical characters
      const alphaOnly = event.name.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (alphaOnly.length >= 3) {
        prefix = alphaOnly.substring(0, 4);
      } else {
        // 2. Fallback: Clean the event slug
        const slugClean = (event.slug || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (slugClean.length >= 3) {
          prefix = slugClean.substring(0, 4);
        } else {
          // 3. Fallback: Alphanumeric name padded with 'X'
          const alphaNum = event.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          prefix = alphaNum.padEnd(4, 'X').substring(0, 4);
        }
      }
    }

    return parkingRepository.createReservation(parkingLotId, deviceId, prefix, slotsCount);
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
