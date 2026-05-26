export interface RouteNode {
  id: string;
  event_id: string;
  name: string | null;
  latitude: number;
  longitude: number;
  node_type: string;
  poi_id?: string | null;
  is_entrance?: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RouteEdge {
  id: string;
  event_id: string;
  start_node_id: string;
  end_node_id: string;
  distance: number;
  is_bidirectional: boolean;
  created_at: Date;
}

export interface RouteGraph {
  nodes: RouteNode[];
  edges: RouteEdge[];
  summary: {
    totalNodes: number;
    totalEdges: number;
    totalDistanceMeters: number;
  };
}
