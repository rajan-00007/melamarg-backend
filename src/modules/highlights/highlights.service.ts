import pool from '../../config/database';
import { highlightsRepository } from './highlights.repository';
import { CreateHighlightDto, UpdateHighlightDto, EventHighlight } from './highlights.types';

export class HighlightsService {
  async getHighlightsByEvent(eventId: string, date?: string): Promise<EventHighlight[]> {
    return await highlightsRepository.getHighlightsByEvent(eventId, date);
  }

  async getHighlightById(id: string): Promise<EventHighlight | null> {
    return await highlightsRepository.getHighlightById(id);
  }

  async createHighlight(dto: CreateHighlightDto): Promise<EventHighlight> {
    if (!dto.eventId || !dto.title || !dto.highlightDate) {
      throw new Error('Event ID, title, and highlight date are required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const highlight = await highlightsRepository.saveHighlight(client, dto);
      await client.query('COMMIT');
      return highlight;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateHighlight(id: string, dto: UpdateHighlightDto): Promise<EventHighlight | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await highlightsRepository.updateHighlight(client, id, dto);
      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteHighlight(id: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const success = await highlightsRepository.deleteHighlight(client, id);
      await client.query('COMMIT');
      return success;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const highlightsService = new HighlightsService();
