import pool from '../../config/database';
import * as routeRepo from './routes.repository';
import { calculateDistance } from './routes.utils';
import { CreateRouteGraphDto } from './routes.dto';
import { RouteGraph } from './routes.types';
import { parkingRepository } from '../parking/parking.repository';
import { zonesService } from '../zones/zones.service';
import { isPointInPolygon } from '../../utils/geo';
import logger from '../../utils/logger';

export const createRouteGraph = async (payload: CreateRouteGraphDto): Promise<any> => {
  const { eventId, nodes, edges } = payload;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Validate event exists
    const eventExists = await routeRepo.checkEventExists(client, eventId);
    if (!eventExists) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Clear existing route graph for this event if it exists (recreate logic)
    await routeRepo.deleteRouteGraph(client, eventId);

    const createdNodes = [];
    const idMap = new Map<string, string>(); // maps incoming temp ID -> created DB UUID

    // Fetch zones for the event beforehand so we can resolve client-side/in-memory efficiently
    const zones = await zonesService.getZonesByEvent(eventId);

    // 2. Save all nodes sequentially
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      // Check which zone this node belongs to
      let matchedZoneId = null;
      if (zones.length > 0) {
        const point = { latitude: Number(node.latitude), longitude: Number(node.longitude) };
        for (const zone of zones) {
          const boundary = typeof zone.boundary === 'string' ? JSON.parse(zone.boundary) : zone.boundary;
          if (isPointInPolygon(point, boundary)) {
            matchedZoneId = zone.id;
            break;
          }
        }
      }

      const createdNode = await routeRepo.createNode(
        client,
        eventId,
        node.name || null,
        node.latitude,
        node.longitude,
        node.node_type || 'path',
        node.poi_id || null,
        node.is_entrance || false,
        node.is_parking || false,
        matchedZoneId
      );
      createdNodes.push(createdNode);
      
      const incomingId = node.id || `node-index-${i}`;
      idMap.set(incomingId, createdNode.id);
    }

    const createdEdges = [];

    // 3. Save edges: either custom edges or fallback to sequential edges
    if (edges && edges.length > 0) {
      for (const edge of edges) {
        const dbStartNodeId = idMap.get(edge.startNodeId);
        const dbEndNodeId = idMap.get(edge.endNodeId);

        if (!dbStartNodeId || !dbEndNodeId) {
          throw new Error(`Invalid edge connection: start "${edge.startNodeId}" or end "${edge.endNodeId}" not found in saved nodes`);
        }

        const startNodeRecord = createdNodes.find(n => n.id === dbStartNodeId);
        const endNodeRecord = createdNodes.find(n => n.id === dbEndNodeId);

        if (!startNodeRecord || !endNodeRecord) {
          throw new Error(`Invalid edge connection record: node data not found in saved records`);
        }

        const distance = calculateDistance(
          Number(startNodeRecord.latitude),
          Number(startNodeRecord.longitude),
          Number(endNodeRecord.latitude),
          Number(endNodeRecord.longitude)
        );

        const createdEdge = await routeRepo.createEdge(
          client,
          eventId,
          dbStartNodeId,
          dbEndNodeId,
          distance,
          edge.path_name || null
        );
        createdEdges.push(createdEdge);
      }
    } else {
      // Fallback: Auto-create sequential edges
      for (let i = 0; i < createdNodes.length - 1; i++) {
        const startNode = createdNodes[i];
        const endNode = createdNodes[i + 1];

        const distance = calculateDistance(
          Number(startNode.latitude),
          Number(startNode.longitude),
          Number(endNode.latitude),
          Number(endNode.longitude)
        );

        const createdEdge = await routeRepo.createEdge(
          client,
          eventId,
          startNode.id,
          endNode.id,
          distance
        );
        createdEdges.push(createdEdge);
      }
    }

    // 4. Update events.has_route_graph = true
    await routeRepo.updateEventRouteStatus(client, eventId, true);

    await client.query('COMMIT');

    // 5. Synchronize parking lots based on route nodes marked as parking
    try {
      const existingLots = await parkingRepository.getParkingLotsByEvent(eventId);
      const parkingNodes = createdNodes.filter(n => n.is_parking === true);

      // Create or update lots for current parking nodes
      for (const node of parkingNodes) {
        const matchedLot = existingLots.find(lot =>
          Math.abs(Number(lot.latitude) - Number(node.latitude)) < 0.00001 &&
          Math.abs(Number(lot.longitude) - Number(node.longitude)) < 0.00001
        );

        if (!matchedLot) {
          const defaultName = node.name || 'Route Parking';
          await parkingRepository.createParkingLot({
            event_id: eventId,
            name: defaultName,
            latitude: Number(node.latitude),
            longitude: Number(node.longitude),
            total_spots: 50,
            available_spots: 50,
            price_per_hour: 0.00,
            landmark: 'Auto-created from Route Node',
            is_active: true
          });
        } else if (matchedLot.landmark === 'Auto-created from Route Node') {
          // If the lot was auto-created and the name has changed, update it
          if (matchedLot.name !== node.name && node.name) {
            await parkingRepository.updateParkingLot(matchedLot.id, {
              name: node.name
            });
          }
        }
      }

      // Clean up auto-created lots that are no longer matching any active parking nodes
      for (const lot of existingLots) {
        if (lot.landmark === 'Auto-created from Route Node') {
          const matchesAnyNode = parkingNodes.some(node =>
            Math.abs(Number(lot.latitude) - Number(node.latitude)) < 0.00001 &&
            Math.abs(Number(lot.longitude) - Number(node.longitude)) < 0.00001
          );

          if (!matchesAnyNode) {
            await parkingRepository.deleteParkingLot(lot.id);
          }
        }
      }
    } catch (syncError) {
      // Log sync errors but don't fail the entire route graph creation response
      logger.error('Failed to sync parking lots from route nodes:', syncError);
    }


    return {
      totalNodes: createdNodes.length,
      totalEdges: createdEdges.length,
      nodes: createdNodes,
      edges: createdEdges
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getRouteGraph = async (eventId: string): Promise<RouteGraph> => {
  return routeRepo.getEventRoutes(eventId);
};

export const deleteRouteGraph = async (eventId: string): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await routeRepo.deleteRouteGraph(client, eventId);
    await routeRepo.updateEventRouteStatus(client, eventId, false);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
