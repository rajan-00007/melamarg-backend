import { poiRepository, POIRecord } from './poi.repository';
import { zonesService } from '../zones/zones.service';

export class POIService {
  async createPOI(poiData: Partial<POIRecord>): Promise<POIRecord> {
    if (!poiData.event_id) {
      throw new Error('Event ID is required');
    }
    if (poiData.latitude === undefined || poiData.longitude === undefined) {
      throw new Error('Latitude and Longitude are required');
    }

    try {
      const zoneId = await zonesService.resolveZoneIdForCoordinate(
        poiData.event_id,
        Number(poiData.latitude),
        Number(poiData.longitude)
      );
      poiData.zone_id = zoneId;
    } catch (err) {
      // Don't fail the creation if zone resolution fails
    }

    return await poiRepository.createPOI(poiData);
  }

  async getPOIsByEvent(eventId: string): Promise<POIRecord[]> {
    return await poiRepository.getPOIsByEvent(eventId);
  }

  async getPOIById(id: string): Promise<POIRecord | null> {
    return await poiRepository.getPOIById(id);
  }

  async updatePOI(id: string, updateData: Partial<POIRecord>): Promise<POIRecord | null> {
    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      const currentPOI = await this.getPOIById(id);
      if (currentPOI) {
        const eventId = currentPOI.event_id;
        const lat = updateData.latitude !== undefined ? Number(updateData.latitude) : Number(currentPOI.latitude);
        const lng = updateData.longitude !== undefined ? Number(updateData.longitude) : Number(currentPOI.longitude);
        try {
          const zoneId = await zonesService.resolveZoneIdForCoordinate(eventId, lat, lng);
          updateData.zone_id = zoneId;
        } catch (err) {
          // Don't fail the update
        }
      }
    }
    return await poiRepository.updatePOI(id, updateData);
  }

  async deletePOI(id: string): Promise<boolean> {
    return await poiRepository.deletePOI(id);
  }

  async getPOICategories(): Promise<any[]> {
    return await poiRepository.getPOICategories();
  }
}

export const poiService = new POIService();
