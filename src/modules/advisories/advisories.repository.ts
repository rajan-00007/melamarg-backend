import { query } from '../../config/database';
import { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { TrafficAdvisory, AdvisoryEdge, CreateAdvisoryDto, TrafficAdvisoryResponse } from './advisories.types';

export class AdvisoriesRepository {
  async saveAdvisory(
    client: PoolClient,
    advisory: CreateAdvisoryDto
  ): Promise<TrafficAdvisory> {
    const id = randomUUID();
    const result = await client.query(
      `INSERT INTO traffic_advisories (
        id, event_id, title, message, start_node_id, end_node_id, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING *`,
      [
        id,
        advisory.eventId,
        advisory.title,
        advisory.message,
        advisory.startNodeId || null,
        advisory.endNodeId || null,
        advisory.createdBy || null,
      ]
    );
    return result.rows[0];
  }

  async saveAdvisoryEdge(
    client: PoolClient,
    advisoryId: string,
    edgeId: string,
    status: 'blocked' | 'recommended'
  ): Promise<AdvisoryEdge> {
    const id = randomUUID();
    const result = await client.query(
      `INSERT INTO advisory_edges (id, advisory_id, edge_id, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, advisoryId, edgeId, status]
    );
    return result.rows[0];
  }

  async getAdvisoriesByEvent(eventId: string): Promise<TrafficAdvisoryResponse[]> {
    const advisoriesResult = await query(
      `SELECT * FROM traffic_advisories WHERE event_id = $1 ORDER BY created_at DESC`,
      [eventId]
    );
    
    if (advisoriesResult.rows.length === 0) {
      return [];
    }

    const edgesResult = await query(
      `SELECT ae.advisory_id, ae.edge_id, ae.status 
       FROM advisory_edges ae 
       JOIN traffic_advisories ta ON ae.advisory_id = ta.id 
       WHERE ta.event_id = $1`,
      [eventId]
    );

    return this.mapAdvisoriesWithEdges(advisoriesResult.rows, edgesResult.rows);
  }

  async getActiveAdvisoriesByEvent(eventId: string): Promise<TrafficAdvisoryResponse[]> {
    const advisoriesResult = await query(
      `SELECT * FROM traffic_advisories 
       WHERE event_id = $1 AND is_active = true 
       ORDER BY created_at DESC`,
      [eventId]
    );
    
    if (advisoriesResult.rows.length === 0) {
      return [];
    }

    const edgesResult = await query(
      `SELECT ae.advisory_id, ae.edge_id, ae.status 
       FROM advisory_edges ae 
       JOIN traffic_advisories ta ON ae.advisory_id = ta.id 
       WHERE ta.event_id = $1 AND ta.is_active = true`,
      [eventId]
    );

    return this.mapAdvisoriesWithEdges(advisoriesResult.rows, edgesResult.rows);
  }

  async getAdvisoryById(id: string): Promise<TrafficAdvisoryResponse | null> {
    const advisoryResult = await query(
      `SELECT * FROM traffic_advisories WHERE id = $1`,
      [id]
    );

    if (advisoryResult.rows.length === 0) {
      return null;
    }

    const edgesResult = await query(
      `SELECT edge_id, status FROM advisory_edges WHERE advisory_id = $1`,
      [id]
    );

    return {
      ...advisoryResult.rows[0],
      edges: edgesResult.rows,
    };
  }

  async toggleAdvisory(
    client: PoolClient,
    id: string,
    isActive: boolean
  ): Promise<TrafficAdvisory> {
    const result = await client.query(
      `UPDATE traffic_advisories 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [isActive, id]
    );
    return result.rows[0];
  }

  async deleteAdvisory(client: PoolClient, id: string): Promise<boolean> {
    const result = await client.query(
      `DELETE FROM traffic_advisories WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapAdvisoriesWithEdges(advisories: any[], edges: any[]): TrafficAdvisoryResponse[] {
    const edgesGroupedByAdvisory = new Map<string, { edge_id: string; status: 'blocked' | 'recommended' }[]>();
    
    edges.forEach((edge) => {
      const group = edgesGroupedByAdvisory.get(edge.advisory_id) || [];
      group.push({
        edge_id: edge.edge_id,
        status: edge.status,
      });
      edgesGroupedByAdvisory.set(edge.advisory_id, group);
    });

    return advisories.map((adv) => ({
      ...adv,
      edges: edgesGroupedByAdvisory.get(adv.id) || [],
    }));
  }
}

export const advisoriesRepository = new AdvisoriesRepository();
