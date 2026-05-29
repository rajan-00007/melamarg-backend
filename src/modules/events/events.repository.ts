import { query } from '../../config/database';
import { randomUUID } from 'crypto';

export interface EventRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  start_date?: Date;
  end_date?: Date;
  north?: number | null;
  south?: number | null;
  east?: number | null;
  west?: number | null;
  center_lat?: number | null;
  center_lng?: number | null;
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
  bundle_url?: string;
  bundle_size?: number;
  metadata?: Record<string, any> | string;
}

export class EventsRepository {
  async createEvent(eventData: Partial<EventRecord>): Promise<EventRecord> {
    const id = randomUUID();
    const status = 'draft';
    const metadata = eventData.metadata ? (typeof eventData.metadata === 'string' ? eventData.metadata : JSON.stringify(eventData.metadata)) : '{}';
    
    const result = await query(
      `INSERT INTO events (
        id, name, slug, description, start_date, end_date, 
        logo_url, banner_url, status, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
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
        metadata
      ]
    );

    return result.rows[0];
  }

  async updateEvent(id: string, updateData: Partial<EventRecord>): Promise<EventRecord | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const dataToUpdate = { ...updateData };
    if (dataToUpdate.metadata && typeof dataToUpdate.metadata === 'object') {
      dataToUpdate.metadata = JSON.stringify(dataToUpdate.metadata);
    }

    for (const [key, value] of Object.entries(dataToUpdate)) {
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
    const result = await query(`
      SELECT events.*, bundles.bundle_url, bundles.bundle_size 
      FROM events 
      LEFT JOIN bundles ON events.current_bundle_id = bundles.id 
      WHERE events.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async getAllEvents(): Promise<EventRecord[]> {
    const result = await query(`
      SELECT events.*, bundles.bundle_url, bundles.bundle_size 
      FROM events 
      LEFT JOIN bundles ON events.current_bundle_id = bundles.id 
      ORDER BY events.created_at DESC
    `);
    return result.rows;
  }
}

export const eventsRepository = new EventsRepository();
