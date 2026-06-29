import { query } from '../../config/database';
import { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { Feedback, CreateFeedbackDto } from './feedback.types';

export class FeedbackRepository {
  async createFeedback(dto: CreateFeedbackDto): Promise<Feedback> {
    const id = randomUUID();
    const result = await query(
      `INSERT INTO feedback (id, event_id, rating, thoughts, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [
        id,
        dto.event_id || null,
        dto.rating,
        dto.thoughts || null
      ]
    );
    return result.rows[0];
  }

  async getFeedback(eventId?: string): Promise<any[]> {
    let sql = `
      SELECT f.*, e.name as event_name 
      FROM feedback f
      LEFT JOIN events e ON f.event_id = e.id
    `;
    const params: any[] = [];

    if (eventId) {
      sql += ` WHERE f.event_id = $1`;
      params.push(eventId);
    }

    sql += ` ORDER BY f.created_at DESC`;

    const result = await query(sql, params);
    return result.rows;
  }

  async deleteFeedback(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM feedback WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const feedbackRepository = new FeedbackRepository();
