import { query } from '../../config/database';
import { randomUUID } from 'crypto';

export interface ZoneRecord {
  id: string;
  event_id: string;
  name: string;
  boundary: any; // Coordinate array [{lat, lng}, ...] stored as JSON
  allow_pedestrians: boolean;
  allow_2wheelers: boolean;
  allow_cars: boolean;
  advisory?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ZoneWithStats extends ZoneRecord {
  poi_count: number;
  node_count: number;
  parking_count: number;
}

export class ZonesRepository {
  async createZone(zoneData: Partial<ZoneRecord>): Promise<ZoneRecord> {
    const id = randomUUID();
    const boundaryJson = typeof zoneData.boundary === 'string' 
      ? zoneData.boundary 
      : JSON.stringify(zoneData.boundary || []);
      
    const allow_pedestrians = zoneData.allow_pedestrians !== undefined ? zoneData.allow_pedestrians : true;
    const allow_2wheelers = zoneData.allow_2wheelers !== undefined ? zoneData.allow_2wheelers : true;
    const allow_cars = zoneData.allow_cars !== undefined ? zoneData.allow_cars : true;

    const result = await query(
      `INSERT INTO zones (
        id, event_id, name, boundary, 
        allow_pedestrians, allow_2wheelers, allow_cars, advisory
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        id,
        zoneData.event_id,
        zoneData.name,
        boundaryJson,
        allow_pedestrians,
        allow_2wheelers,
        allow_cars,
        zoneData.advisory || null
      ]
    );

    return result.rows[0];
  }

  async getZoneById(id: string): Promise<ZoneRecord | null> {
    const result = await query(`SELECT * FROM zones WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async getZonesByEvent(eventId: string): Promise<ZoneRecord[]> {
    const result = await query(
      `SELECT * FROM zones WHERE event_id = $1 ORDER BY created_at ASC`,
      [eventId]
    );
    return result.rows;
  }

  async getZonesWithStats(eventId: string): Promise<ZoneWithStats[]> {
    const result = await query(
      `SELECT z.*,
              (SELECT COALESCE(COUNT(*), 0) FROM pois p WHERE p.zone_id = z.id) as poi_count,
              (SELECT COALESCE(COUNT(*), 0) FROM route_nodes rn WHERE rn.zone_id = z.id) as node_count,
              (SELECT COALESCE(COUNT(*), 0) FROM parking_lots pl WHERE pl.zone_id = z.id) as parking_count
       FROM zones z
       WHERE z.event_id = $1
       ORDER BY z.created_at ASC`,
      [eventId]
    );
    
    return result.rows.map((row) => ({
      ...row,
      poi_count: parseInt(row.poi_count || '0', 10),
      node_count: parseInt(row.node_count || '0', 10),
      parking_count: parseInt(row.parking_count || '0', 10)
    }));
  }

  async updateZone(id: string, updateData: Partial<ZoneRecord>): Promise<ZoneRecord | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const dataToUpdate = { ...updateData };
    if (dataToUpdate.boundary && typeof dataToUpdate.boundary === 'object') {
      dataToUpdate.boundary = JSON.stringify(dataToUpdate.boundary);
    }

    for (const [key, value] of Object.entries(dataToUpdate)) {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return this.getZoneById(id);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE zones SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  async deleteZone(id: string): Promise<boolean> {
    const result = await query(`DELETE FROM zones WHERE id = $1 RETURNING id`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Operations to bulk assign zone IDs to assets
  async updatePoisZoneAssociations(eventId: string, associations: { id: string; zone_id: string | null }[]): Promise<void> {
    for (const assoc of associations) {
      await query(`UPDATE pois SET zone_id = $1 WHERE id = $2 AND event_id = $3`, [assoc.zone_id, assoc.id, eventId]);
    }
  }

  async updateNodesZoneAssociations(eventId: string, associations: { id: string; zone_id: string | null }[]): Promise<void> {
    for (const assoc of associations) {
      await query(`UPDATE route_nodes SET zone_id = $1 WHERE id = $2 AND event_id = $3`, [assoc.zone_id, assoc.id, eventId]);
    }
  }

  async updateParkingLotsZoneAssociations(eventId: string, associations: { id: string; zone_id: string | null }[]): Promise<void> {
    for (const assoc of associations) {
      await query(`UPDATE parking_lots SET zone_id = $1 WHERE id = $2 AND event_id = $3`, [assoc.zone_id, assoc.id, eventId]);
    }
  }
}

export const zonesRepository = new ZonesRepository();
