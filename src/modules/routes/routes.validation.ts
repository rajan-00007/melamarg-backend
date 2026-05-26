import { Request, Response, NextFunction } from 'express';

export const validateCreateRoute = (req: Request, res: Response, next: NextFunction): void => {
  const { nodes, edges } = req.body;
  const eventId = req.params.eventId || req.body.eventId;

  if (!eventId || typeof eventId !== 'string') {
    res.status(400).json({ status: 'error', message: 'Valid eventId is required' });
    return;
  }

  if (!nodes || !Array.isArray(nodes) || nodes.length < 2) {
    res.status(400).json({ status: 'error', message: 'At least 2 nodes are required to create a route graph' });
    return;
  }

  const nodeIds = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (typeof node.latitude !== 'number' || typeof node.longitude !== 'number') {
      res.status(400).json({ status: 'error', message: `Invalid node coordinates at index ${i}` });
      return;
    }
    if (node.id) {
      nodeIds.add(node.id);
    }
  }

  if (edges) {
    if (!Array.isArray(edges)) {
      res.status(400).json({ status: 'error', message: 'Edges must be an array of objects' });
      return;
    }

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (!edge.startNodeId || typeof edge.startNodeId !== 'string' || !edge.endNodeId || typeof edge.endNodeId !== 'string') {
        res.status(400).json({ status: 'error', message: `Invalid edge startNodeId or endNodeId at index ${i}` });
        return;
      }
      if (!nodeIds.has(edge.startNodeId)) {
        res.status(400).json({ status: 'error', message: `Edge at index ${i} has a startNodeId "${edge.startNodeId}" that does not exist in nodes` });
        return;
      }
      if (!nodeIds.has(edge.endNodeId)) {
        res.status(400).json({ status: 'error', message: `Edge at index ${i} has an endNodeId "${edge.endNodeId}" that does not exist in nodes` });
        return;
      }
    }
  }

  next();
};

