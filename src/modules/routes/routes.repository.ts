import pool from '../../config/database';
import { PoolClient } from 'pg';
import { RouteNode, RouteEdge, RouteGraph } from './routes.types';

export const createNode = async (
  client: PoolClient,
  eventId: string,
  name: string | null,
  latitude: number,
  longitude: number,
  nodeType: string = 'path',
  poiId: string | null = null,
  isEntrance: boolean = false
): Promise<RouteNode> => {
  const result = await client.query(
    `INSERT INTO route_nodes (event_id, name, latitude, longitude, node_type, poi_id, is_entrance)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [eventId, name, latitude, longitude, nodeType, poiId, isEntrance]
  );
  return result.rows[0];
};

export const createEdge = async (
  client: PoolClient,
  eventId: string,
  startNodeId: string,
  endNodeId: string,
  distance: number
): Promise<RouteEdge> => {
  const result = await client.query(
    `INSERT INTO route_edges (event_id, start_node_id, end_node_id, distance)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [eventId, startNodeId, endNodeId, distance]
  );
  return result.rows[0];
};

export const getEventRoutes = async (eventId: string): Promise<RouteGraph> => {
  const nodesResult = await pool.query(
    `SELECT * FROM route_nodes WHERE event_id = $1 ORDER BY created_at ASC`,
    [eventId]
  );
  const edgesResult = await pool.query(
    `SELECT * FROM route_edges WHERE event_id = $1 ORDER BY created_at ASC`,
    [eventId]
  );

  const nodes = nodesResult.rows;
  const edges = edgesResult.rows;

  const totalDistance = edges.reduce((acc, edge) => acc + Number(edge.distance), 0);

  return {
    nodes,
    edges,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalDistanceMeters: totalDistance
    }
  };
};

export const deleteRouteGraph = async (client: PoolClient, eventId: string): Promise<void> => {
  // Cascades to edges because of ON DELETE CASCADE
  await client.query(`DELETE FROM route_nodes WHERE event_id = $1`, [eventId]);
};

export const updateEventRouteStatus = async (client: PoolClient, eventId: string, status: boolean): Promise<void> => {
  await client.query(`UPDATE events SET has_route_graph = $1 WHERE id = $2`, [status, eventId]);
};

export const checkEventExists = async (client: PoolClient, eventId: string): Promise<boolean> => {
  const result = await client.query(`SELECT id FROM events WHERE id = $1`, [eventId]);
  return result.rows.length > 0;
};
