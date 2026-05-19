import { query } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface POIRecord {
  id: string;
  event_id: string;
  category_id?: string;
  name_en?: string;
  name_hi?: string;
  name_or?: string;
  description?: string;
  latitude: number;
  longitude: number;
  icon_url?: string;
  is_active: boolean;
  status: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export class POIRepository {
  async createPOI(poiData: Partial<POIRecord>): Promise<POIRecord> {
    const id = uuidv4();
    const is_active = poiData.is_active !== undefined ? poiData.is_active : true;
    const status = poiData.status || 'active';
    
    const result = await query(
      `INSERT INTO pois (
        id, event_id, category_id, name_en, name_hi, name_or, 
        description, latitude, longitude, icon_url, 
        is_active, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *`,
      [
        id,
        poiData.event_id,
        poiData.category_id,
        poiData.name_en,
        poiData.name_hi,
        poiData.name_or,
        poiData.description,
        poiData.latitude,
        poiData.longitude,
        poiData.icon_url,
        is_active,
        status,
        poiData.created_by,
      ]
    );

    return result.rows[0];
  }

  async getPOIsByEvent(eventId: string): Promise<POIRecord[]> {
    const result = await query(`SELECT * FROM pois WHERE event_id = $1 ORDER BY created_at DESC`, [eventId]);
    return result.rows;
  }

  async getPOIById(id: string): Promise<POIRecord | null> {
    const result = await query(`SELECT * FROM pois WHERE id = $1`, [id]);
    return result.rows[0] || null; 
  }

  async updatePOI(id: string, updateData: Partial<POIRecord>): Promise<POIRecord | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return this.getPOIById(id);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE pois SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  async deletePOI(id: string): Promise<boolean> {
    const result = await query(`DELETE FROM pois WHERE id = $1 RETURNING id`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const poiRepository = new POIRepository();
