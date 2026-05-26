import { poiRepository, POIRecord } from './poi.repository';

export class POIService {
  async createPOI(poiData: Partial<POIRecord>): Promise<POIRecord> {
    if (!poiData.event_id) {
      throw new Error('Event ID is required');
    }
    if (poiData.latitude === undefined || poiData.longitude === undefined) {
      throw new Error('Latitude and Longitude are required');
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
