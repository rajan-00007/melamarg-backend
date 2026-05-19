import { query } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface EventRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  start_date?: Date;
  end_date?: Date;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  center_lat?: number;
  center_lng?: number;
  min_zoom?: number;
  max_zoom?: number;
  logo_url?: string;
  banner_url?: string;
  status: string;
  published_at?: Date;
  bundle_version: number;
  current_bundle_id?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export class EventsRepository {
  async createEvent(eventData: Partial<EventRecord>): Promise<EventRecord> {
    const id = uuidv4();
    const status = 'draft';
    
    const result = await query(
      `INSERT INTO events (
        id, name, slug, description, start_date, end_date, 
        logo_url, banner_url, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        id,
        eventData.name,
        eventData.slug,
        eventData.description,
        eventData.start_date,
        eventData.end_date,
        eventData.logo_url,
        eventData.banner_url,
        status,
        eventData.created_by,
      ]
    );

    return result.rows[0];
  }

  async updateEvent(id: string, updateData: Partial<EventRecord>): Promise<EventRecord | null> {
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
      return this.getEventById(id);
    }

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE events SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  async getEventById(id: string): Promise<EventRecord | null> {
    const result = await query(`SELECT * FROM events WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async getAllEvents(): Promise<EventRecord[]> {
    const result = await query(`SELECT * FROM events ORDER BY created_at DESC`);
    return result.rows;
  }
}

export const eventsRepository = new EventsRepository();
