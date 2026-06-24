import { zonesRepository, ZoneRecord, ZoneWithStats } from './zones.repository';
import { isPointInPolygon } from '../../utils/geo';
import { query } from '../../config/database';
import logger from '../../utils/logger';

export class ZonesService {
  async getZonesByEvent(eventId: string): Promise<ZoneRecord[]> {
    return zonesRepository.getZonesByEvent(eventId);
  }

  async getZonesWithStats(eventId: string): Promise<ZoneWithStats[]> {
    return zonesRepository.getZonesWithStats(eventId);
  }

  async getZoneById(id: string): Promise<ZoneRecord | null> {
    return zonesRepository.getZoneById(id);
  }

  async createZone(zoneData: Partial<ZoneRecord>): Promise<ZoneRecord> {
    if (!zoneData.event_id) throw new Error('Event ID is required');
    if (!zoneData.name) throw new Error('Zone name is required');
    if (!zoneData.boundary || !Array.isArray(zoneData.boundary) || zoneData.boundary.length < 3) {
      throw new Error('Boundary must be a polygon array with at least 3 points');
    }

    const zone = await zonesRepository.createZone(zoneData);
    
    // Automatically trigger recalculation of assets for this event
    this.recalculateAllAssetsZone(zone.event_id).catch((err) => {
      logger.error(`Failed to recalculate assets after creating zone ${zone.id}:`, err);
    });

    return zone;
  }

  async updateZone(id: string, updateData: Partial<ZoneRecord>): Promise<ZoneRecord | null> {
    const existing = await zonesRepository.getZoneById(id);
    if (!existing) throw new Error('Zone not found');

    const updated = await zonesRepository.updateZone(id, updateData);
    if (updated && updateData.boundary) {
      // Boundary changed, trigger asset recalculation
      this.recalculateAllAssetsZone(existing.event_id).catch((err) => {
        logger.error(`Failed to recalculate assets after updating zone ${id}:`, err);
      });
    }

    return updated;
  }

  async deleteZone(id: string): Promise<boolean> {
    const existing = await zonesRepository.getZoneById(id);
    if (!existing) throw new Error('Zone not found');

    const success = await zonesRepository.deleteZone(id);
    if (success) {
      // Recalculate assets to remove zone association
      this.recalculateAllAssetsZone(existing.event_id).catch((err) => {
        logger.error(`Failed to recalculate assets after deleting zone ${id}:`, err);
      });
    }
    return success;
  }

  /**
   * Find which zone a coordinate falls into.
   */
  async findZoneForCoordinate(eventId: string, latitude: number, longitude: number): Promise<ZoneRecord | null> {
    const zones = await zonesRepository.getZonesByEvent(eventId);
    if (zones.length === 0) return null;

    const point = { latitude, longitude };
    for (const zone of zones) {
      const boundary = typeof zone.boundary === 'string' 
        ? JSON.parse(zone.boundary) 
        : zone.boundary;
        
      if (isPointInPolygon(point, boundary)) {
        return zone;
      }
    }
    
    return null;
  }

  /**
   * Helper to resolve the zone ID for a coordinate.
   */
  async resolveZoneIdForCoordinate(eventId: string, latitude: number, longitude: number): Promise<string | null> {
    const matchingZone = await this.findZoneForCoordinate(eventId, latitude, longitude);
    return matchingZone ? matchingZone.id : null;
  }

  /**
   * Scans all POIs, nodes, and parking lots of an event, determines which zone they belong to,
   * and saves the updated associations.
   */
  async recalculateAllAssetsZone(eventId: string): Promise<void> {
    logger.info(`Starting asset zone recalculation for event ${eventId}`);
    const zones = await zonesRepository.getZonesByEvent(eventId);
    
    // Parse all boundaries beforehand to avoid repetitive parsing
    const parsedZones = zones.map((zone) => ({
      id: zone.id,
      boundary: typeof zone.boundary === 'string' ? JSON.parse(zone.boundary) : zone.boundary
    }));

    // 1. Recalculate POIs
    const poisRes = await query(`SELECT id, latitude, longitude FROM pois WHERE event_id = $1`, [eventId]);
    const poiAssociations = poisRes.rows.map((poi) => {
      const point = { latitude: Number(poi.latitude), longitude: Number(poi.longitude) };
      let matchedZoneId: string | null = null;
      
      for (const zone of parsedZones) {
        if (isPointInPolygon(point, zone.boundary)) {
          matchedZoneId = zone.id;
          break;
        }
      }
      return { id: poi.id, zone_id: matchedZoneId };
    });
    await zonesRepository.updatePoisZoneAssociations(eventId, poiAssociations);
    logger.info(`Recalculated zone IDs for ${poiAssociations.length} POIs`);

    // 2. Recalculate Route Nodes
    const nodesRes = await query(`SELECT id, latitude, longitude FROM route_nodes WHERE event_id = $1`, [eventId]);
    const nodeAssociations = nodesRes.rows.map((node) => {
      const point = { latitude: Number(node.latitude), longitude: Number(node.longitude) };
      let matchedZoneId: string | null = null;
      
      for (const zone of parsedZones) {
        if (isPointInPolygon(point, zone.boundary)) {
          matchedZoneId = zone.id;
          break;
        }
      }
      return { id: node.id, zone_id: matchedZoneId };
    });
    await zonesRepository.updateNodesZoneAssociations(eventId, nodeAssociations);
    logger.info(`Recalculated zone IDs for ${nodeAssociations.length} Route Nodes`);

    // 3. Recalculate Parking Lots
    const parkingRes = await query(`SELECT id, latitude, longitude FROM parking_lots WHERE event_id = $1`, [eventId]);
    const parkingAssociations = parkingRes.rows.map((lot) => {
      const point = { latitude: Number(lot.latitude), longitude: Number(lot.longitude) };
      let matchedZoneId: string | null = null;
      
      for (const zone of parsedZones) {
        if (isPointInPolygon(point, zone.boundary)) {
          matchedZoneId = zone.id;
          break;
        }
      }
      return { id: lot.id, zone_id: matchedZoneId };
    });
    await zonesRepository.updateParkingLotsZoneAssociations(eventId, parkingAssociations);
    logger.info(`Recalculated zone IDs for ${parkingAssociations.length} Parking Lots`);
  }
}

export const zonesService = new ZonesService();
