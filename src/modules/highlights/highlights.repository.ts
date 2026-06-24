import { query } from '../../config/database';
import { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { EventHighlight, CreateHighlightDto, UpdateHighlightDto } from './highlights.types';

export class HighlightsRepository {
  async getHighlightsByEvent(eventId: string, date?: string): Promise<EventHighlight[]> {
    if (date) {
      const result = await query(
        `SELECT * FROM event_highlights 
         WHERE event_id = $1 AND highlight_date = $2 
         ORDER BY highlight_date ASC, time ASC, created_at ASC`,
        [eventId, date]
      );
      return result.rows;
    } else {
      const result = await query(
        `SELECT * FROM event_highlights 
         WHERE event_id = $1 
         ORDER BY highlight_date ASC, time ASC, created_at ASC`,
        [eventId]
      );
      return result.rows;
    }
  }

  async getHighlightById(id: string): Promise<EventHighlight | null> {
    const result = await query(
      `SELECT * FROM event_highlights WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async saveHighlight(
    client: PoolClient,
    dto: CreateHighlightDto
  ): Promise<EventHighlight> {
    const id = randomUUID();
    const result = await client.query(
      `INSERT INTO event_highlights (
        id, event_id, title, description, location, time, image_url, highlight_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        dto.eventId,
        dto.title,
        dto.description || null,
        dto.location || null,
        dto.time || null,
        dto.imageUrl || null,
        dto.highlightDate,
      ]
    );
    return result.rows[0];
  }

  async updateHighlight(
    client: PoolClient,
    id: string,
    dto: UpdateHighlightDto
  ): Promise<EventHighlight | null> {
    // Dynamically build SET query fields to only update passed values
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(dto.title);
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }
    if (dto.location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(dto.location);
    }
    if (dto.time !== undefined) {
      updates.push(`time = $${paramIndex++}`);
      values.push(dto.time);
    }
    if (dto.imageUrl !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(dto.imageUrl);
    }
    if (dto.highlightDate !== undefined) {
      updates.push(`highlight_date = $${paramIndex++}`);
      values.push(dto.highlightDate);
    }

    if (updates.length === 0) {
      const current = await this.getHighlightById(id);
      return current;
    }

    updates.push(`updated_at = NOW()`);

    values.push(id);
    const queryStr = `UPDATE event_highlights SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await client.query(queryStr, values);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async deleteHighlight(client: PoolClient, id: string): Promise<boolean> {
    const result = await client.query(
      `DELETE FROM event_highlights WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const highlightsRepository = new HighlightsRepository();
